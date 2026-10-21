import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { lerXml, lerEvento, ehEvento, camposDaNota, avaliar } from "../../lib/conferenciaNota.js";
import { CONTAS_LANCAMENTO, nomeConta, numeroBr, partidasEsperadas, conferirLancamento, partidasEstorno, saldosDoRazao } from "../../lib/lancamentoNota.js";
import { QUANTIDADES_PADRAO, PERFIS, gerarPacote, resumoDoPacote, gerarXml, gerarXmlEvento, eventoDe, nomeArquivo, formatarCnpj } from "../../lib/orgaoFiscal.js";

// Laboratório 2027.1 (2026-10-20): protótipo SÓ do professor/admin. Não grava nada no banco e não aparece para alunos.
// Preferências ficam apenas neste navegador (localStorage). Fase 1: gerador de notas (aba Professor) + caixa de entrada simulada (aba Aluno).
const CHAVE = "lab2027.prefs";
const brl = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBr = (s) => String(s || "").slice(0, 10).split("-").reverse().join("/");
const ROT = { cancelada: "Cancelada", duplicada: "Duplicada", cfop: "CFOP incompatível", destinatario: "Destinatário errado", ncm: "NCM trocado", tributo: "Tributo errado", total: "Total divergente" };
const DEC = { aprovar: "Aprovar", aprovar_com_ressalva: "Aprovar com ressalva", rejeitar: "Rejeitar" };
const CFOP_ENTRADA = [["1102", "Compra para comercialização"], ["1101", "Compra para industrialização"], ["1403", "Compra com substituição tributária"], ["2102", "Compra interestadual para comercialização"]];
const PROB = { padrao: undefined, menos: 8, mais: 2 };

function lerPrefs() { try { return JSON.parse(localStorage.getItem(CHAVE) || "{}") || {}; } catch { return {}; } }
function gravarPrefs(p) { try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* sem armazenamento: segue sem lembrar */ } }
function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo || "text/plain" }));
  const a = document.createElement("a"); a.href = url; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const box = { border: "1px solid var(--line)", background: "var(--surface)", padding: "12px 16px", marginBottom: 12 };
const th = { padding: "5px 8px", border: "1px solid var(--line)", textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em" };
const td = { padding: "5px 8px", border: "1px solid var(--line)", fontSize: 13, verticalAlign: "top" };
const tdn = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const lab = { display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-soft)", marginBottom: 3 };

function Abas({ itens, atual, onMudar, tamanho }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {itens.map((i) => (
        <button key={i.k} type="button" disabled={i.fut} onClick={() => onMudar(i.k)} className={"btn " + (atual === i.k ? "green" : "secondary")}
          style={{ padding: tamanho === "g" ? "8px 24px" : "5px 12px", fontWeight: 600, opacity: i.fut ? 0.55 : 1, borderStyle: i.fut ? "dashed" : undefined }}>{i.t}</button>
      ))}
    </div>
  );
}

export default function Laboratorio2027({ turma }) {
  const inicial = useMemo(lerPrefs, []);
  const alunos = useAlunosReaisDaTurma(turma?.id);
  const [modo, setModo] = useState("p");
  const [qtd, setQtd] = useState(inicial.qtd || 24);
  const [outra, setOutra] = useState(!QUANTIDADES_PADRAO.includes(inicial.qtd || 24));
  const [perfil, setPerfil] = useState(inicial.perfil || "");
  const [prob, setProb] = useState(inicial.prob || "padrao");
  const [matricula, setMatricula] = useState(inicial.matricula || "20271000001");
  const [pacote, setPacote] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [sel, setSel] = useState(null);
  const [verGab, setVerGab] = useState(false);
  const [lotes, setLotes] = useState(inicial.lotes || 99);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [ptab, setPtab] = useState("g");
  const [caixa, setCaixa] = useState([]); // notas importadas pelo aluno de exemplo
  const [marcas, setMarcas] = useState({}); // conferências por arquivo
  const [lancs, setLancs] = useState({}); // lançamentos por arquivo: { linhas, ok }
  const [atab, setAtab] = useState("c");
  const [abertaL, setAbertaL] = useState(null);
  const [msgL, setMsgL] = useState([]);
  const [okL, setOkL] = useState(false);
  const [cancels, setCancels] = useState({}); // chaves das notas que o professor cancelou
  const [aberta, setAberta] = useState(null);
  const [msgImp, setMsgImp] = useState("");
  const [carregado, setCarregado] = useState(false);
  const entrada = useRef(null);
  const chaveAluno = "lab2027.aluno." + matricula;
  const chaveCancel = "lab2027.cancel." + matricula;
  useEffect(() => { try { setCancels(JSON.parse(localStorage.getItem(chaveCancel) || "{}") || {}); } catch { setCancels({}); } }, [chaveCancel]);
  useEffect(() => { try { localStorage.setItem(chaveCancel, JSON.stringify(cancels)); } catch { /* sem armazenamento */ } }, [cancels, chaveCancel]);
  useEffect(() => {
    setCarregado(false);
    try { const x = JSON.parse(localStorage.getItem(chaveAluno) || "{}"); setCaixa(x.caixa || []); setMarcas(x.marcas || {}); setLancs(x.lancs || {}); } catch { setCaixa([]); setMarcas({}); setLancs({}); }
    setAberta(null); setMsgImp(""); setCarregado(true);
  }, [chaveAluno]);
  useEffect(() => {
    if (!carregado) return;
    try { localStorage.setItem(chaveAluno, JSON.stringify({ caixa, marcas, lancs })); } catch { /* sem armazenamento */ }
  }, [caixa, marcas, lancs, carregado, chaveAluno]);

  function gerar() {
    setErro("");
    try {
      const q = Math.min(500, Math.max(2, Math.round(Number(qtd) || 24)));
      const o = { quantidade: q };
      if (perfil) o.perfil = perfil;
      if (PROB[prob]) o.nProblemas = Math.max(1, Math.round(q / PROB[prob]));
      const p = gerarPacote(String(matricula).trim() || "20271000001", "2027.1", o);
      setPacote({ ...p, resumo: resumoDoPacote(p.documentos), matricula: String(matricula).trim() || "20271000001" });
      setSel(null); setVerGab(false);
      gravarPrefs({ qtd: q, perfil, prob, matricula, lotes });
    } catch (e) { setErro("Não foi possível gerar: " + (e?.message || e)); }
  }

  async function zipDoAluno() {
    if (!pacote) return;
    setOcupado(true);
    try {
      const z = new JSZip();
      pacote.documentos.filter((d) => d.lote <= lotes).forEach((d) => {
        z.file(d.problema?.original ? "NFe_" + d.numero + " (1).xml" : nomeArquivo(d), gerarXml(d));
      });
      baixar("Notas_" + pacote.matricula + "_" + pacote.documentos.length + ".zip", await z.generateAsync({ type: "blob" }));
    } finally { setOcupado(false); }
  }
  async function zipEventos() {
    const cs = docs.filter((d) => d.lote <= lotes && cancels[d.chave]);
    if (!cs.length) return;
    const z = new JSZip();
    cs.forEach((d) => z.file("Evento_" + d.numero + "_cancelamento.xml", gerarXmlEvento(d, eventoDe(d))));
    baixar("Eventos_" + pacote.matricula + ".zip", await z.generateAsync({ type: "blob" }));
  }
  function csv() {
    const l = [["lote", "numero", "data", "direcao", "cfop", "emitente", "destinatario", "total", "problema", "decisao_esperada"]];
    pacote.documentos.forEach((d) => l.push([d.lote, d.numero, dataBr(d.data), d.direcao, d.cfop, d.emitente.nome, d.destinatario.nome, brl(d.valorTotal), d.problema ? ROT[d.problema.tipo] : "", DEC[d.gabarito?.decisao] || ""]));
    baixar("lista_notas_" + pacote.matricula + ".csv", "﻿" + l.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\n"), "text/csv");
  }

  const docs = pacote?.documentos || [];
  const visiveis = docs.filter((d) => !filtro || (filtro === "prob" ? d.problema : d.direcao === filtro));
  const nLotes = pacote?.resumo.lotes || 0;
  const r = pacote?.resumo;
  const notaSel = sel != null ? docs.find((d) => d.id === sel) : null;


  // ---- aluno de exemplo: importar e conferir ----
  const ehCopiaNome = (a) => /\(\d+\)\.xml$/i.test(a);
  function copiaDe(x, lista) {
    const outros = lista.filter((y) => y !== x && y.nota.chave === x.nota.chave);
    if (!outros.length) return null;
    if (ehCopiaNome(x.arquivo)) return (outros.find((y) => !ehCopiaNome(y.arquivo)) || outros[0]).arquivo;
    if (outros.every((y) => ehCopiaNome(y.arquivo))) return null;
    return x.arquivo > outros[0].arquivo && !ehCopiaNome(outros[0].arquivo) ? outros[0].arquivo : null;
  }
  const empresaCnpj = (pacote && pacote.matricula === matricula && pacote.empresa.cnpj) || (() => {
    const c = {}; caixa.filter((x) => x.nota.direcao === "entrada").forEach((x) => { c[x.nota.destinatario.cnpj] = (c[x.nota.destinatario.cnpj] || 0) + 1; });
    return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || "";
  })();
  async function importar(files) {
    setOcupado(true); setMsgImp("");
    try {
      const itens = [];
      for (const f of files) {
        if (/\.zip$/i.test(f.name)) { const z = await JSZip.loadAsync(f); for (const e of Object.values(z.files)) if (!e.dir && /\.xml$/i.test(e.name)) itens.push({ nome: e.name.split("/").pop(), texto: await e.async("string") }); }
        else if (/\.xml$/i.test(f.name)) itens.push({ nome: f.name, texto: await f.text() });
      }
      const novas = [], eventos = [], erros = []; let repetidos = 0;
      itens.forEach(({ nome, texto }) => {
        try { if (ehEvento(texto)) eventos.push(lerEvento(texto)); else if (caixa.some((x) => x.arquivo === nome) || novas.some((x) => x.arquivo === nome)) repetidos++; else novas.push({ arquivo: nome, nota: lerXml(texto) }); }
        catch (e) { erros.push(nome + " (" + (e?.message || "inválido") + ")"); }
      });
      const todas = [...caixa, ...novas].map((x) => { const ev = eventos.find((e) => e.chave === x.nota.chave); return ev ? { ...x, evento: ev } : x; })
        .sort((a, b) => a.nota.numero.localeCompare(b.nota.numero, "pt", { numeric: true }) || a.arquivo.localeCompare(b.arquivo));
      setCaixa(todas);
      const rep = todas.filter((x) => copiaDe(x, todas)).length;
      setMsgImp(itens.length + " arquivo(s) lidos · " + novas.length + " nota(s) nova(s)" + (eventos.length ? " · " + eventos.length + " evento(s)" : "") + (rep ? " · " + rep + " com chave repetida sinalizada" : "") + (repetidos ? " · " + repetidos + " já estavam na caixa" : "") + (erros.length ? " · não lidos: " + erros.join("; ") : ""));
    } catch (e) { setMsgImp("Não foi possível ler o arquivo: " + (e?.message || e)); }
    setOcupado(false);
  }
  function limparCaixa() { setCaixa([]); setMarcas({}); setLancs({}); setAberta(null); setAbertaL(null); setMsgImp(""); }
  const entradaAberta = caixa.find((x) => x.arquivo === aberta) || null;
  const camposAbertos = entradaAberta ? camposDaNota(entradaAberta.nota, { cnpjEmpresa: empresaCnpj, evento: entradaAberta.evento, copiaDe: copiaDe(entradaAberta, caixa) }) : [];
  const mAberta = (entradaAberta && marcas[entradaAberta.arquivo]) || { f: {}, dec: "", cfopEntrada: "", done: false };
  function atualizarAberta(p) { setMarcas((m) => ({ ...m, [aberta]: { ...(m[aberta] || { f: {}, dec: "", cfopEntrada: "" }), ...p, ...(p.done ? {} : { done: false }) } })); }
  function marcar(k, v) { atualizarAberta({ f: { ...mAberta.f, [k]: v } }); }
  const podeSalvar = !!entradaAberta && camposAbertos.every((c) => mAberta.f[c.key]) && !!mAberta.dec && (entradaAberta.nota.direcao !== "entrada" || mAberta.dec === "rejeitar" || !!mAberta.cfopEntrada);
  function docDoGabarito(x) {
    if (!pacote) return null;
    const iguais = docs.filter((d) => d.chave === x.nota.chave);
    return (copiaDe(x, caixa) ? iguais.find((d) => d.problema?.original) : iguais.find((d) => !d.problema?.original)) || null;
  }
  const gabEfetivo = (d, m) => (m?.comEvento ? { ...d.gabarito, decisao: "rejeitar", divergencias: ["cancelamento"], contabilizar: false } : d.gabarito);
  function statusLanc(x, d, m) {
    if (!m?.done) return "—";
    const lan = !!lancs[x.arquivo]?.ok, est = !!lancs[x.arquivo + "#est"]?.ok;
    if (m.comEvento || (d && !d.gabarito.contabilizar)) return lan ? "✖ lançou nota que não devia" : "✔ não lançou";
    if (lan) { if (!(d && cancels[d.chave])) return "✔ enviado e conferido"; return !x.evento ? "lançado · evento não importado" : est ? "✔ lançado e estornado" : "✖ estorno pendente"; }
    if (x.evento) return "✔ não lançou (cancelada)";
    return m.dec === "rejeitar" ? "✖ devia lançar" : "pendente";
  }
  const linhasAcomp = caixa.map((x) => {
    const d = docDoGabarito(x), m = marcas[x.arquivo];
    const g = d ? gabEfetivo(d, m) : null;
    const r = d && m?.done ? avaliar(g, m.f, m.dec, m.cfopEntrada, x.nota.direcao) : null;
    const campos = r ? (r.ok ? "certos" : [r.errados.length ? "não apontou: " + r.errados.join(", ") : "", r.falsos.length ? "marcou sem erro: " + r.falsos.join(", ") : "", !r.cfopOk ? "CFOP de entrada" : ""].filter(Boolean).join(" · ") || "decisão diferente") : "—";
    return { arquivo: x.arquivo, chave: x.nota.chave, tipo: d ? (d.problema ? ROT[d.problema.tipo] : "sem problema") : "sem gabarito", gabDec: g ? DEC[g.decisao] : "—", alunoDec: m?.done ? DEC[m.dec] : "—", campos, res: r ? (r.ok ? "ok" : "rev") : "pend", lanc: statusLanc(x, d, m) };
  });
  const resumoAcomp = { conferidas: linhasAcomp.filter((l) => l.res !== "pend").length, acertos: linhasAcomp.filter((l) => l.res === "ok").length };
  const paraLancar = caixa.filter((x) => marcas[x.arquivo]?.done && marcas[x.arquivo].dec !== "rejeitar" && !(x.evento && !lancs[x.arquivo]?.ok));
  const paraEstorno = caixa.filter((x) => marcas[x.arquivo]?.done && x.evento && lancs[x.arquivo]?.ok);
  const linhasLanc = [...paraLancar.map((x) => ({ key: x.arquivo, x, est: false })), ...paraEstorno.map((x) => ({ key: x.arquivo + "#est", x, est: true }))];
  const pendEstorno = paraEstorno.filter((x) => !lancs[x.arquivo + "#est"]?.ok);
  const ehEst = !!abertaL && abertaL.endsWith("#est");
  const notaLanc = caixa.find((x) => x.arquivo === (abertaL || "").replace("#est", "")) || null;
  const lancAberto = notaLanc ? lancs[abertaL] || { linhas: [{ conta: "", tipo: "D", valor: "" }, { conta: "", tipo: "C", valor: "" }], ok: false } : null;
  const razao = saldosDoRazao(Object.keys(lancs).filter((a) => lancs[a].ok).map((a) => lancs[a]));
  function abrirLanc(a) { setAbertaL(a); setMsgL([]); setOkL(false); }
  function gravarLanc(p) { setLancs((m) => ({ ...m, [abertaL]: { ...lancAberto, ...p } })); }
  function mudarLinha(i, p) {
    const l = lancAberto.linhas;
    gravarLanc({ ok: false, linhas: p === null ? [...l, { conta: "", tipo: "D", valor: "" }] : l.map((x, k) => (k === i ? { ...x, ...p } : x)) }); setOkL(false);
  }
  function tirarLinha(i) { gravarLanc({ ok: false, linhas: lancAberto.linhas.filter((_, k) => k !== i) }); setOkL(false); }
  function enviarLanc() {
    const m = conferirLancamento(notaLanc.nota, lancAberto.linhas, { estorno: ehEst });
    setMsgL(m); setOkL(!m.length); gravarLanc({ ok: !m.length });
  }
  function simularAluno() {
    if (!pacote) return;
    const nova = [], mm = {};
    pacote.documentos.filter((d) => d.lote <= lotes).forEach((d) => {
      const arquivo = d.problema?.original ? "NFe_" + d.numero + " (1).xml" : nomeArquivo(d);
      const ev = cancels[d.chave] ? lerEvento(gerarXmlEvento(d, eventoDe(d))) : undefined;
      nova.push({ arquivo, nota: lerXml(gerarXml(d)), ...(ev ? { evento: ev } : {}) });
    });
    nova.sort((a, b) => a.nota.numero.localeCompare(b.nota.numero, "pt", { numeric: true }) || a.arquivo.localeCompare(b.arquivo));
    const ll = {};
    nova.forEach((x) => {
      const d = docs.find((y) => y.chave === x.nota.chave && !!y.problema?.original === !!copiaDe(x, nova));
      const campos = camposDaNota(x.nota, { cnpjEmpresa: pacote.empresa.cnpj, copiaDe: copiaDe(x, nova) });
      const f = {}; campos.forEach((c) => { f[c.key] = d.gabarito.divergencias.includes(c.key) ? "div" : "ok"; });
      mm[x.arquivo] = { f, dec: d.gabarito.decisao, cfopEntrada: d.direcao === "entrada" && d.gabarito.decisao !== "rejeitar" ? (d.gabarito.cfopEntrada || "1102") : "", done: true, comEvento: false };
      if (d.gabarito.decisao !== "rejeitar") {
        const fmt = (p) => p.map(([conta, tipo, v]) => ({ conta, tipo, valor: v.toFixed(2).replace(".", ",") }));
        ll[x.arquivo] = { ok: true, linhas: fmt(partidasEsperadas(x.nota)) };
        if (x.evento) ll[x.arquivo + "#est"] = { ok: true, linhas: fmt(partidasEstorno(x.nota)) };
      }
    });
    setCaixa(nova); setMarcas(mm); setLancs(ll); setMsgImp("Simulação: " + nova.length + " notas importadas, conferidas e lançadas" + (Object.keys(ll).some((k) => k.endsWith("#est")) ? ", com estorno das canceladas." : "."));
  }

  return (
    <div>
      <div style={{ background: "var(--amber-pale)", color: "var(--amber)", border: "1px solid var(--amber)", padding: "7px 12px", fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>
        🧪 Protótipo 2027.1 · não afeta alunos · o que você testa fica só neste navegador
      </div>
      <h2 style={{ margin: "0 0 4px" }}>Laboratório 2027.1</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, margin: "0 0 10px" }}>Só o professor entra aqui. A aba Professor gera e acompanha as notas; a aba Aluno mostra o que o aluno veria.</p>
      <Abas tamanho="g" atual={modo} onMudar={setModo} itens={[{ k: "p", t: "Professor" }, { k: "a", t: "Aluno" }]} />

      {modo === "p" && (
        <>
          <Abas atual={ptab} onMudar={setPtab} itens={[{ k: "g", t: "1 · Gerador de notas" }, { k: "a", t: "2 · Acompanhamento" }, { k: "e", t: "3 · Painel e cancelamentos" }]} />
          {ptab === "g" && (<>
          <div style={box}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
              <div>
                <span style={lab}>Quantidade de notas por aluno</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {QUANTIDADES_PADRAO.map((n) => (
                    <button key={n} type="button" className={"btn " + (!outra && qtd === n ? "green" : "secondary")} style={{ padding: "5px 11px" }} onClick={() => { setOutra(false); setQtd(n); }}>{n}</button>
                  ))}
                  <button type="button" className={"btn " + (outra ? "green" : "secondary")} style={{ padding: "5px 11px" }} onClick={() => setOutra(true)}>Outra</button>
                </div>
              </div>
              {outra && <div><span style={lab}>Digite (2 a 500)</span><input type="number" min={2} max={500} value={qtd} onChange={(e) => setQtd(e.target.value)} style={{ width: 90 }} /></div>}
              <div>
                <span style={lab}>Aluno de exemplo</span>
                <select value={matricula} onChange={(e) => setMatricula(e.target.value)}>
                  <option value="20271000001">Matrícula de teste 20271000001</option>
                  {(alunos || []).map((a) => <option key={a.matricula} value={a.matricula}>{a.nome ? a.nome + " · " : ""}{a.matricula}</option>)}
                </select>
              </div>
              <div>
                <span style={lab}>Perfil da empresa</span>
                <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                  <option value="">Automático (pela matrícula)</option>
                  {Object.entries(PERFIS).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
                </select>
              </div>
              <div>
                <span style={lab}>Notas com problema</span>
                <select value={prob} onChange={(e) => setProb(e.target.value)}>
                  <option value="padrao">1 a cada 4 (padrão)</option><option value="menos">Menos (1 a cada 8)</option><option value="mais">Mais (1 a cada 2)</option>
                </select>
              </div>
              <button type="button" className="btn green" onClick={gerar}>Gerar pacote</button>
            </div>
            {erro && <p style={{ color: "var(--red)", margin: "8px 0 0" }}>{erro}</p>}
          </div>

          {!pacote && <p style={{ color: "var(--ink-soft)" }}>Escolha a quantidade e clique em "Gerar pacote". O mesmo aluno com as mesmas escolhas sempre recebe as mesmas notas.</p>}
          {pacote && (
            <>
              <div style={box}>
                <h3 style={{ margin: "0 0 4px" }}>Empresa do aluno de exemplo</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5, margin: "0 0 8px" }}>{pacote.empresa.perfilNome} · CNPJ {formatarCnpj(pacote.empresa.cnpj)} · empresa fictícia</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
                  {[["Notas", r.total], ["Entradas", r.entradas], ["Saídas", r.saidas], ["Com problema", r.problemas], ["Lotes de 6", r.lotes], ["Entradas válidas", "R$ " + brl(r.valorEntradas)], ["Saídas válidas", "R$ " + brl(r.valorSaidas)]].map(([a, b]) => (
                    <div key={a} style={{ border: "1px solid var(--line)", padding: "7px 10px" }}><b style={{ display: "block", fontSize: 19 }}>{b}</b><span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{a}</span></div>
                  ))}
                </div>
                <p style={{ color: "var(--ink-soft)", fontSize: 12.5, margin: "8px 0 0" }}>Duplicadas entram como arquivos repetidos extras, por isso o total pode passar da quantidade pedida.</p>
              </div>

              <div style={box}>
                <h3 style={{ margin: "0 0 8px" }}>Notas do pacote</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 8 }}>
                  <div><span style={lab}>Filtro</span><select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="">Todas</option><option value="entrada">Entradas</option><option value="saida">Saídas</option><option value="prob">Só com problema</option></select></div>
                  <div><span style={lab}>Lotes liberados ao aluno</span><select value={lotes} onChange={(e) => { setLotes(Number(e.target.value)); gravarPrefs({ ...lerPrefs(), lotes: Number(e.target.value) }); }}>
                    <option value={99}>Todos</option>{Array.from({ length: nLotes }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} lote{n > 1 ? "s" : ""}</option>)}</select></div>
                  <button type="button" className="btn secondary" disabled={ocupado} onClick={zipDoAluno}>Baixar ZIP do aluno (XML)</button>
                  <button type="button" className="btn secondary" onClick={csv}>Exportar lista (CSV)</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Lote</th><th style={th}>Nº</th><th style={th}>Data</th><th style={th}>Tipo</th><th style={th}>CFOP</th><th style={th}>Emitente → destinatário</th><th style={{ ...th, textAlign: "right" }}>Total</th><th style={th}>Problema</th></tr></thead>
                    <tbody>
                      {visiveis.map((d) => (
                        <tr key={d.id} onClick={() => { setSel(d.id); setVerGab(false); }} style={{ cursor: "pointer", background: sel === d.id ? "var(--green-pale)" : undefined }}>
                          <td style={td}>{d.lote}</td><td style={td}>{d.numero}</td><td style={td}>{dataBr(d.data)}</td><td style={td}>{d.direcao === "entrada" ? "Entrada" : "Saída"}</td><td style={td}>{d.cfop}</td>
                          <td style={td}>{d.emitente.nome} → {d.destinatario.nome}</td><td style={tdn}>{brl(d.valorTotal)}</td>
                          <td style={td}>{d.problema ? <span style={{ border: "1px solid var(--red)", color: "var(--red)", padding: "0 7px", fontSize: 11.5 }}>{ROT[d.problema.tipo]}{d.problema.original ? " (cópia)" : ""}</span> : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ color: "var(--ink-soft)", fontSize: 12.5, margin: "6px 0 0" }}>Clique numa linha para ver o detalhe, o XML e o gabarito.</p>
              </div>

              {notaSel && (
                <div style={box}>
                  <h3 style={{ margin: "0 0 8px" }}>NF-e {notaSel.numero} · {notaSel.direcao === "entrada" ? "entrada" : "saída"} · lote {notaSel.lote}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead><tr><th style={th}>Item</th><th style={th}>NCM</th><th style={{ ...th, textAlign: "right" }}>Qtd</th><th style={{ ...th, textAlign: "right" }}>Unit.</th><th style={{ ...th, textAlign: "right" }}>Total</th></tr></thead>
                          <tbody>{notaSel.itens.map((i, k) => <tr key={k}><td style={td}>{i.descricao}</td><td style={td}>{i.ncm}</td><td style={tdn}>{i.qtd}</td><td style={tdn}>{brl(i.valorUnit)}</td><td style={tdn}>{brl(i.total)}</td></tr>)}</tbody>
                        </table>
                      </div>
                      <p style={{ fontSize: 12.5, margin: "6px 0 0" }}>ICMS {brl(notaSel.impostos.icms.valor)} · PIS {brl(notaSel.impostos.pis.valor)} · COFINS {brl(notaSel.impostos.cofins.valor)} · Total da nota {brl(notaSel.valorTotal)}</p>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <pre style={{ margin: 0, fontSize: 11.5, overflow: "auto", maxHeight: 260, border: "1px solid var(--line)", padding: 8 }}>{gerarXml(notaSel)}</pre>
                      <div className="btn-row" style={{ marginTop: 6 }}>
                        <button type="button" className="btn secondary" onClick={() => baixar(nomeArquivo(notaSel), gerarXml(notaSel), "application/xml")}>Baixar este XML</button>
                        <button type="button" className="btn secondary" onClick={() => setVerGab((v) => !v)}>{verGab ? "Esconder gabarito" : "Ver gabarito do professor"}</button>
                      </div>
                    </div>
                  </div>
                  {verGab && (
                    <div style={{ background: "var(--red-pale)", color: "var(--red)", border: "1px solid var(--red)", padding: "8px 10px", marginTop: 8, fontSize: 13.5 }}>
                      <b>Gabarito (só o professor vê)</b><br />
                      Decisão esperada: {DEC[notaSel.gabarito?.decisao] || "—"}<br />
                      {notaSel.gabarito?.divergencias?.length ? "Campos com divergência: " + notaSel.gabarito.divergencias.join(", ") : "Nenhuma divergência."}
                      {notaSel.gabarito?.observacao && <><br />{notaSel.gabarito.observacao}</>}
                      {notaSel.direcao === "entrada" && <><br />CFOP de entrada a registrar: {notaSel.gabarito?.cfopEntrada || "1102"}</>}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          </>)}
          {ptab === "e" && (
            <>
              <div style={box}>
                <h3 style={{ margin: "0 0 4px" }}>1 · Liberação por lote</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: "0 0 8px" }}>Cada lote tem até 6 notas. O ZIP do aluno leva só os lotes liberados. {pacote ? "" : "Gere o pacote na aba 1 para liberar lotes."}</p>
                <div className="btn-row" style={{ marginTop: 0 }}>
                  {pacote && Array.from({ length: nLotes }, (_, i) => i + 1).map((l) => {
                    const lib = Math.min(lotes, nLotes);
                    return l <= lib ? <button key={l} type="button" className="btn secondary" disabled>Lote {l} liberado</button>
                      : <button key={l} type="button" className="btn green" disabled={l !== lib + 1} onClick={() => { setLotes(l); gravarPrefs({ ...lerPrefs(), lotes: l }); }}>Liberar lote {l}</button>;
                  })}
                  {pacote && <button type="button" className="btn secondary" disabled={ocupado} onClick={zipDoAluno}>Baixar ZIP das notas liberadas</button>}
                </div>
              </div>
              {pacote && (
                <div style={box}>
                  <h3 style={{ margin: "0 0 4px" }}>2 · Notas liberadas e cancelamento</h3>
                  <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: "0 0 8px" }}>Cancelar uma nota gera o evento de cancelamento (XML), como o emitente faria. Baixe o ZIP de eventos e entregue ao aluno, que importa na caixa de entrada. Se ele já lançou a nota, precisa estornar.</p>
                  <div className="btn-row" style={{ marginTop: 0, marginBottom: 8 }}>
                    <button type="button" className="btn secondary" disabled={!Object.keys(cancels).some((c) => docs.some((d) => d.chave === c && d.lote <= lotes))} onClick={zipEventos}>Baixar ZIP de eventos de cancelamento</button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr><th style={th}>Lote</th><th style={th}>Nº</th><th style={th}>Tipo</th><th style={{ ...th, textAlign: "right" }}>Total</th><th style={th}>Situação</th><th style={th}>Aluno de exemplo</th><th style={th}></th></tr></thead>
                      <tbody>{docs.filter((d) => d.lote <= lotes && !d.problema?.original).map((d) => {
                        const l = linhasAcomp.find((x) => x.chave === d.chave && !/\(\d+\)\.xml$/i.test(x.arquivo));
                        return (
                          <tr key={d.id}>
                            <td style={td}>{d.lote}</td><td style={td}>{d.numero}</td><td style={td}>{d.direcao === "entrada" ? "Compra" : "Venda"}</td><td style={tdn}>{brl(d.valorTotal)}</td>
                            <td style={td}>{cancels[d.chave] ? "cancelada" : d.problema?.tipo === "cancelada" ? "válida · cancelamento sugerido pelo gerador" : "válida"}</td>
                            <td style={td}>{l ? l.lanc : "não importada"}</td>
                            <td style={td}><button type="button" className="btn secondary" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => setCancels((c) => { const n = { ...c }; if (n[d.chave]) delete n[d.chave]; else n[d.chave] = true; return n; })}>{cancels[d.chave] ? "Retirar" : "Cancelar"}</button></td>
                          </tr>);
                      })}</tbody>
                    </table>
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
                {[["Lotes liberados", pacote ? Math.min(lotes, nLotes) + " de " + nLotes : "—"], ["Notas liberadas", pacote ? docs.filter((d) => d.lote <= lotes && !d.problema?.original).length : "—"], ["Canceladas", pacote ? docs.filter((d) => d.lote <= lotes && cancels[d.chave]).length : 0], ["Estornos conferidos", linhasAcomp.filter((l) => l.lanc === "✔ lançado e estornado").length], ["Estornos pendentes", linhasAcomp.filter((l) => l.lanc === "✖ estorno pendente").length]].map(([a, b]) => (
                  <div key={a} style={{ border: "1px solid var(--line)", padding: "7px 10px", background: "var(--surface)" }}><b style={{ display: "block", fontSize: 19 }}>{b}</b><span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{a}</span></div>))}
              </div>
            </>
          )}
          {ptab === "a" && (
            <>
              <div style={box}>
                <h3 style={{ margin: "0 0 4px" }}>Acompanhamento do aluno de exemplo · matrícula {matricula}</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: "0 0 8px" }}>Compara o que o aluno importou e decidiu na aba Aluno com o gabarito do pacote gerado. {pacote ? "" : "Gere o pacote na aba 1 para ter o gabarito."}</p>
                <div className="btn-row" style={{ marginTop: 0 }}>
                  <button type="button" className="btn secondary" disabled={!pacote || ocupado} onClick={simularAluno}>Simular aluno que importou e conferiu tudo certo</button>
                  <button type="button" className="btn secondary" onClick={limparCaixa}>Limpar caixa e conferências</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 12 }}>
                {[["Importadas", caixa.length], ["Conferidas", resumoAcomp.conferidas], ["Acertos", resumoAcomp.acertos], ["Revisar", resumoAcomp.conferidas - resumoAcomp.acertos], ["Aproveitamento", resumoAcomp.conferidas ? Math.round((resumoAcomp.acertos / resumoAcomp.conferidas) * 100) + "%" : "—"], ["Lançamentos conferidos", linhasAcomp.filter((l) => l.lanc === "✔ enviado e conferido").length], ["Do pacote, não importadas", pacote ? Math.max(0, docs.length - caixa.length) : "—"]].map(([a, b]) => (
                  <div key={a} style={{ border: "1px solid var(--line)", padding: "7px 10px", background: "var(--surface)" }}><b style={{ display: "block", fontSize: 19 }}>{b}</b><span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{a}</span></div>))}
              </div>
              <div style={box}>
                <h3 style={{ margin: "0 0 6px" }}>Conferência × gabarito</h3>
                {caixa.length === 0 ? <p style={{ color: "var(--ink-soft)", margin: 0 }}>O aluno ainda não importou notas.</p> : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr><th style={th}>Arquivo</th><th style={th}>Tipo</th><th style={th}>Gabarito</th><th style={th}>Aluno decidiu</th><th style={th}>Campos</th><th style={th}>Resultado</th><th style={th}>Lançamento</th></tr></thead>
                      <tbody>{linhasAcomp.map((l) => (
                        <tr key={l.arquivo}><td style={td}>{l.arquivo}</td><td style={td}>{l.tipo}</td><td style={td}>{l.gabDec}</td><td style={td}>{l.alunoDec}</td><td style={td}>{l.campos}</td>
                          <td style={td}>{l.res === "ok" ? "✔ acertou" : l.res === "rev" ? "✖ revisar" : "pendente"}</td><td style={td}>{l.lanc}</td></tr>))}</tbody>
                    </table>
                  </div>
                )}
                <p style={{ color: "var(--ink-soft)", fontSize: 12.5, margin: "6px 0 0" }}>Acerto = decisão igual ao gabarito, campos errados apontados e nenhum campo certo marcado como divergente (e CFOP de entrada correto nas compras aprovadas).</p>
              </div>
            </>
          )}
        </>
      )}

      {modo === "a" && (
        <>
          <div style={box}>
            <h3 style={{ margin: "0 0 4px" }}>Visão do aluno (simulada) · matrícula {matricula}</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, margin: 0 }}>É a tela que o aluno teria em 2027.1: importa o ZIP recebido, confere cada nota campo a campo e decide. Não há gabarito aqui; a comparação fica na aba Professor › Acompanhamento.</p>
          </div>
          <Abas atual={atab} onMudar={setAtab} itens={[{ k: "c", t: "Caixa de entrada" }, { k: "l", t: "Lançamentos" + (linhasLanc.length ? " (" + linhasLanc.length + ")" : "") + (pendEstorno.length ? " ⚠" : "") }]} />
          {atab === "c" && (<>
          <div style={box}>
            <h3 style={{ margin: "0 0 6px" }}>1 · Importar</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: "0 0 8px" }}>Escolha o ZIP baixado na aba Professor (ou arquivos XML soltos). Cada XML é lido e conferido na estrutura antes de entrar na caixa.</p>
            <div className="btn-row" style={{ marginTop: 0 }}>
              <input ref={entrada} type="file" accept=".zip,.xml" multiple style={{ display: "none" }} onChange={(e) => { importar(Array.from(e.target.files || [])); e.target.value = ""; }} />
              <button type="button" className="btn green" disabled={ocupado} onClick={() => entrada.current && entrada.current.click()}>Importar ZIP ou XML…</button>
              {caixa.length > 0 && <button type="button" className="btn secondary" onClick={limparCaixa}>Limpar caixa de entrada</button>}
            </div>
            {msgImp && <p style={{ fontSize: 13, margin: "8px 0 0" }}>{msgImp}</p>}
            {pendEstorno.length > 0 && <div style={{ background: "var(--red-pale)", color: "var(--red)", border: "1px solid var(--red)", padding: "8px 10px", marginTop: 8, fontSize: 13.5 }}><b>Evento recebido:</b> cancelamento de {pendEstorno.map((x) => "NF-e " + x.nota.numero).join(", ")}. Você já lançou: faça o estorno na aba Lançamentos.</div>}
          </div>
          <div style={box}>
            <h3 style={{ margin: "0 0 6px" }}>Caixa de entrada ({caixa.length})</h3>
            {caixa.length === 0 ? <p style={{ color: "var(--ink-soft)", margin: 0 }}>Vazia. Importe o ZIP.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Arquivo</th><th style={th}>Emitente</th><th style={{ ...th, textAlign: "right" }}>Total</th><th style={th}>Situação</th></tr></thead>
                  <tbody>{caixa.map((x) => { const m = marcas[x.arquivo]; return (
                    <tr key={x.arquivo} onClick={() => setAberta(x.arquivo)} style={{ cursor: "pointer", background: aberta === x.arquivo ? "var(--green-pale)" : undefined }}>
                      <td style={td}>{x.arquivo}{copiaDe(x, caixa) ? " · repetida" : ""}{x.evento ? " · cancelada" : ""}</td><td style={td}>{x.nota.emitente.nome}</td><td style={tdn}>{brl(x.nota.total)}</td>
                      <td style={td}>{m?.done ? "Conferida · " + DEC[m.dec] : "Não conferida"}</td></tr>); })}</tbody>
                </table>
              </div>
            )}
          </div>
          {entradaAberta && (
            <div style={box}>
              <h3 style={{ margin: "0 0 4px" }}>2 · Conferência fiscal · NF-e {entradaAberta.nota.numero}</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: "0 0 8px" }}>Compare cada campo com a referência e marque Conforme ou Divergente. A decisão só salva com todos os campos marcados.</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Campo</th><th style={th}>No arquivo</th><th style={th}>Referência</th><th style={th}>Sua marcação</th></tr></thead>
                  <tbody>{camposAbertos.map((c) => (
                    <tr key={c.key}><td style={td}>{c.label}</td><td style={{ ...td, wordBreak: "break-word" }}>{c.valor}</td><td style={td}>{c.ref}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {[["ok", "Conforme"], ["div", "Divergente"]].map(([v, t]) => (
                          <button key={v} type="button" className={"btn " + (mAberta.f[c.key] === v ? (v === "ok" ? "green" : "secondary") : "secondary")} style={{ padding: "3px 9px", marginRight: 4, fontSize: 12.5, ...(mAberta.f[c.key] === v && v === "div" ? { background: "var(--red)", color: "#fff", borderColor: "var(--red)" } : {}) }} onClick={() => marcar(c.key, v)}>{t}</button>))}
                      </td></tr>))}</tbody>
                </table>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginTop: 10 }}>
                <div><span style={lab}>Decisão</span><select value={mAberta.dec || ""} onChange={(e) => atualizarAberta({ dec: e.target.value })}><option value="">Escolha…</option>{Object.entries(DEC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                {entradaAberta.nota.direcao === "entrada" && mAberta.dec && mAberta.dec !== "rejeitar" && (
                  <div><span style={lab}>CFOP de entrada a registrar</span><select value={mAberta.cfopEntrada || ""} onChange={(e) => atualizarAberta({ cfopEntrada: e.target.value })}><option value="">Escolha…</option>{CFOP_ENTRADA.map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}</select></div>
                )}
                <button type="button" className="btn green" disabled={!podeSalvar} onClick={() => atualizarAberta({ done: true, comEvento: !!entradaAberta.evento })}>Salvar conferência</button>
                {mAberta.done && <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Salva.</span>}
              </div>
              <p style={{ color: "var(--ink-soft)", fontSize: 12.5, margin: "6px 0 0" }}>Na compra, o arquivo traz o CFOP do emitente (5102); o aluno informa o CFOP de entrada. Só nota aprovada segue para a classificação.</p>
            </div>
          )}
          </>)}
          {atab === "l" && (<>
            <div style={box}>
              <h3 style={{ margin: "0 0 4px" }}>3 · Notas aprovadas, prontas para lançar</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: "0 0 8px" }}>Entram aqui só as notas conferidas e aprovadas (ou aprovadas com ressalva). Rejeitadas não geram lançamento. Compra e venda são a prazo; lance os valores destacados na nota.</p>
              {linhasLanc.length === 0 ? <p style={{ color: "var(--ink-soft)", margin: 0 }}>Nenhuma nota aprovada ainda. Confira e aprove notas na Caixa de entrada.</p> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Nota</th><th style={th}>Tipo</th><th style={th}>Emitente / cliente</th><th style={{ ...th, textAlign: "right" }}>Total</th><th style={th}>Lançamento</th></tr></thead>
                    <tbody>{linhasLanc.map(({ key, x, est }) => (
                      <tr key={key} onClick={() => abrirLanc(key)} style={{ cursor: "pointer", background: abertaL === key ? "var(--green-pale)" : undefined }}>
                        <td style={td}>{x.nota.numero}</td><td style={td}>{est ? "Estorno (nota cancelada)" : (x.nota.direcao === "entrada" ? "Compra" : "Venda") + (marcas[x.arquivo].dec === "aprovar_com_ressalva" ? " · com ressalva" : "")}</td>
                        <td style={td}>{x.nota.direcao === "entrada" ? x.nota.emitente.nome : x.nota.destinatario.nome}</td><td style={tdn}>{brl(x.nota.total)}</td><td style={td}>{lancs[key]?.ok ? "✔ enviado" : est ? "estornar" : "a lançar"}</td></tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>
            {notaLanc && lancAberto && (
              <div style={box}>
                <h3 style={{ margin: "0 0 4px" }}>{ehEst ? "Estorno" : "Lançamento"} da NF-e {notaLanc.nota.numero} · {notaLanc.nota.direcao === "entrada" ? "compra" : "venda"}</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: "0 0 8px" }}>{ehEst ? "O emitente cancelou esta nota depois do seu lançamento. Estorne: repita as mesmas contas e valores do lançamento original com débito e crédito trocados." : notaLanc.nota.direcao === "entrada" ? "Mercadoria pelo valor sem os impostos recuperáveis; impostos a recuperar; dívida pelo total da nota." : "Receita pelo total da nota; ICMS e PIS/COFINS como dedução da receita, com o imposto a recolher, no mesmo lançamento."}{!ehEst && marcas[notaLanc.arquivo].dec === "aprovar_com_ressalva" ? " Nota aprovada com ressalva: lance o que está destacado no arquivo e comunique o emitente." : ""}</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Conta</th><th style={th}>D ou C</th><th style={{ ...th, textAlign: "right" }}>Valor</th><th style={th}></th></tr></thead>
                    <tbody>{lancAberto.linhas.map((l, i) => (
                      <tr key={i}>
                        <td style={td}><select value={l.conta} onChange={(e) => mudarLinha(i, { conta: e.target.value })}><option value="">Escolha a conta…</option>{CONTAS_LANCAMENTO.map((c) => <option key={c} value={c}>{c} {nomeConta(c)}</option>)}</select></td>
                        <td style={td}><select value={l.tipo} onChange={(e) => mudarLinha(i, { tipo: e.target.value })}><option value="D">Débito</option><option value="C">Crédito</option></select></td>
                        <td style={tdn}><input value={l.valor} onChange={(e) => mudarLinha(i, { valor: e.target.value })} placeholder="0,00" style={{ width: 110, textAlign: "right" }} /></td>
                        <td style={td}><button type="button" className="btn secondary" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => tirarLinha(i)}>remover</button></td>
                      </tr>))}</tbody>
                  </table>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 8 }}>
                  <button type="button" className="btn secondary" onClick={() => mudarLinha(-1, null)}>+ linha</button>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: 13 }}>Débitos {brl(lancAberto.linhas.filter((l) => l.tipo === "D").reduce((a, l) => a + numeroBr(l.valor), 0))} · Créditos {brl(lancAberto.linhas.filter((l) => l.tipo === "C").reduce((a, l) => a + numeroBr(l.valor), 0))}</span>
                  <button type="button" className="btn green" onClick={enviarLanc}>Conferir e enviar lançamento</button>
                </div>
                {msgL.length > 0 && <div style={{ background: "var(--red-pale)", color: "var(--red)", border: "1px solid var(--red)", padding: "8px 10px", marginTop: 8, fontSize: 13.5 }}><b>O sistema devolveu:</b>{msgL.map((m, i) => <div key={i}>{m}</div>)}</div>}
                {okL && <div style={{ background: "var(--green-pale)", color: "var(--green)", border: "1px solid var(--green)", padding: "8px 10px", marginTop: 8, fontSize: 13.5 }}><b>{ehEst ? "Estorno enviado." : "Lançamento enviado."}</b> Contas, lados e valores conferem {ehEst ? "com o lançamento original." : "com a nota."}</div>}
              </div>
            )}
            <div style={box}>
              <h3 style={{ margin: "0 0 6px" }}>Razão da empresa (lançamentos enviados)</h3>
              {razao.length === 0 ? <p style={{ color: "var(--ink-soft)", margin: 0 }}>Nenhum lançamento enviado.</p> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Conta</th><th style={{ ...th, textAlign: "right" }}>Débitos</th><th style={{ ...th, textAlign: "right" }}>Créditos</th><th style={{ ...th, textAlign: "right" }}>Saldo</th></tr></thead>
                    <tbody>{razao.map((r) => <tr key={r.conta}><td style={td}>{r.conta} {r.nome}</td><td style={tdn}>{brl(r.debitos)}</td><td style={tdn}>{brl(r.creditos)}</td><td style={tdn}>{brl(r.saldo)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
              <p style={{ color: "var(--ink-soft)", fontSize: 12.5, margin: "6px 0 0" }}>Na versão real, esses saldos alimentam o razão, a DRE e o balanço da empresa do aluno nas etapas seguintes.</p>
            </div>
          </>)}
        </>
      )}
    </div>
  );
}
