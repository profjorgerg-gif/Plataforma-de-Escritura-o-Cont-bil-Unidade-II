import { useState } from "react";
import { serverTimestamp } from "firebase/firestore";
import { criarChamadoNumerado } from "../../lib/chamados.js";
import DashboardCiclo from "./DashboardCiclo.jsx";
import { GRUPOS_ETAPAS, ETAPAS as ETAPAS_BASE, notaDaEtapa, fmtNota, limitaNota, entregaEmAtraso } from "../../lib/avaliacao.js";
import { resumoAtividade, situacaoEmpregado, PASSOS_CONTRACHEQUE } from "../../lib/folhaAtividade.js";
import { casoDoEmpregado, opcoesDoEmpregado } from "../../lib/enunciadosCA.js";
import { folhaEmUso } from "../../lib/folha.js";
import { folhaDoAluno } from "../../lib/folhaAluno.js";
import { sugestaoEtapa } from "../../lib/notasAuto.js";
import { situacaoPrazo } from "../../lib/fechamento.js";
import { etapasEfetivas, situacaoEtapa } from "../../lib/roteiro.js";
import { orientacaoEtapa, NOTA_OK } from "../../lib/orientacaoEtapas.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useCaTurma, useTrabalhosCaDaTurma } from "../../hooks/useCa.js";
import { useAgbTurma, useTrabalhosAgbDaTurma } from "../../hooks/useAgb.js";
import { useRescisaoTurma } from "../../hooks/useRescisao.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { useNotaEtapa1 } from "../../hooks/useNotaEtapa1.js";
import { useRoteiroTurma, useRoteiroDosAlunos, useLancamentosDaTurma } from "../../hooks/useRoteiro.js";

// Dashboard do ciclo por etapas (pedido do professor, 13/11/2026).
// Etapa 1 = o painel de Entrada × Saída que já existia (inalterado). Etapas 2 a 6 = andamento, nota parcial até o fechamento
// da etapa (prazo) e orientação por aluno, com envio pelo Suporte. Só LÊ dados; nada do aluno é alterado.
const ETAPAS = ETAPAS_BASE.map((e, i) => ({ ...e, n: i + 1 }));
const ROTULOS = { f1: "Escrituração", fp: "Folha de pagamento", ca: "Folha, provisões e contabilização", resc: "Rescisão trabalhista", agb: "Análise gerencial de balanços", comp: "Análise comparativa" };

const dec = (v) => (v === null || v === undefined ? "—" : fmtNota(v));

// Nota parcial: média dos critérios que já têm nota (a avaliação salva vale mais que a sugestão automática).
function notasDoAluno(etapa, sug, salva) {
  const vals = {};
  etapa.criterios.forEach((c) => {
    const s = salva && salva.criterios && salva.criterios[c.key];
    const v = s && s.nota !== undefined && s.nota !== null && s.nota !== "" ? limitaNota(s.nota) : sug && sug[c.key] !== undefined ? sug[c.key] : null;
    vals[c.key] = v === undefined ? null : v;
  });
  const dispon = etapa.criterios.filter((c) => vals[c.key] !== null);
  const peso = dispon.reduce((s, c) => s + c.peso, 0);
  const parcial = peso > 0 ? Math.round(dispon.reduce((s, c) => s + Number(vals[c.key]) * c.peso, 0) / peso * 10) / 10 : null;
  const completa = notaDaEtapa(etapa, vals);
  const final = salva && salva.nota !== undefined && salva.nota !== null ? salva.nota : null;
  return { vals, parcial, completa, final, cobertura: peso };
}

export default function DashboardEtapas({ turma, onSelecionarAluno, onIr }) {
  const [aba, setAba] = useState("g1");
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  const abas = [{ id: "geral", t: "Visão geral", s: "todas as etapas" }, ...GRUPOS_ETAPAS.map((g) => ({ id: g.id, t: g.titulo.split(" · ")[0], s: g.titulo.split(" · ")[1] }))];
  return (
    <>
      <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }} role="tablist">
        {abas.map((a) => (
          <button key={a.id} role="tab" aria-selected={aba === a.id} className={"btn " + (aba === a.id ? "" : "secondary")} onClick={() => setAba(a.id)}
            style={{ textAlign: "left", padding: "7px 12px", lineHeight: 1.25 }}>
            <b>{a.t}</b><br /><span style={{ fontSize: 11.5, fontWeight: 400 }}>{a.s}</span>
          </button>
        ))}
      </div>
      {aba === "g1" ? <DashboardCiclo turma={turma} onSelecionarAluno={onSelecionarAluno} /> : <PainelEtapas turma={turma} aba={aba} onSelecionarAluno={onSelecionarAluno} onIrAba={setAba} onIr={onIr} />}
    </>
  );
}

function PainelEtapas({ turma, aba, onSelecionarAluno, onIrAba, onIr }) {
  const tid = turma.id;
  const alunos = useAlunosDaTurma(tid);
  const ca = useCaTurma(tid);
  const agb = useAgbTurma(tid);
  const resc = useRescisaoTurma(tid);
  const rotCfg = useRoteiroTurma(tid);
  const { contas } = usePlanoContas();
  const { mapa } = useRoteiroDosAlunos(tid, alunos);
  const { mapa: trabCa } = useTrabalhosCaDaTurma(tid, alunos);
  const { mapa: trabAgb } = useTrabalhosAgbDaTurma(tid, alunos);
  const lancs = useLancamentosDaTurma(tid, alunos, true);
  const n1 = useNotaEtapa1(turma, alunos);
  const [orient, setOrient] = useState(null); // { aluno, etapa, texto }
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [modoVg, setModoVg] = useState("nota"); // visão geral: o que mostrar nas células (nota | sit | prog)
  const [ordemVg, setOrdemVg] = useState("nome");
  const [soAtencao, setSoAtencao] = useState(false);
  const [confTodos, setConfTodos] = useState(false);
  const [focoVg, setFocoVg] = useState(null); // célula "aguarda você" aberta: { m: matrícula, id: etapa }

  const pronto = alunos && n1 && mapa && trabCa && trabAgb && lancs && contas && ca.config !== undefined && agb.anterior !== undefined;
  if (!pronto) return <div className="empty-state">Carregando dados dos alunos…</div>;

  const idsEmp = ((ca.config && ca.config.empregados) || []).map((e) => e.id);
  const prazos = Object.fromEntries(etapasEfetivas(rotCfg || null).map((e) => [e.id, e.prazo]));

  function sugestoes(a, etapaId) {
    if (etapaId === "f1") return {};
    if (etapaId === "fp") {
      const { competencia: comp, parametros: parFolha } = folhaEmUso(ca.folha);
      const r = resumoAtividade(((trabCa || {})[a.matricula] || {}).fp || {}, idsEmp, idsEmp.length, (id) => casoDoEmpregado(a.matricula, id, comp, opcoesDoEmpregado(ca.config, id)), parFolha);
      return { calculos: r.notaCalculos, quantidade: r.notaQuantidade };
    }
    return sugestaoEtapa(etapaId, {
      trabCa: (trabCa || {})[a.matricula], trabAgb: (trabAgb || {})[a.matricula], folhaCfg: folhaDoAluno(ca.folha, ca.config, a.matricula), folhaTurma: ca.folha, casoCfg: resc.caso,
      lancamentos: (lancs || {})[a.matricula] || [], contas, anterior: agb.anterior, liberados: (agb.config && agb.config.exerciciosLiberados) || [],
    });
  }
  // contracheques com linhas erradas ou não iniciados (Etapa 2): itens extras da orientação
  function extraFp(a) {
    const { competencia: comp, parametros: parFolha } = folhaEmUso(ca.folha);
    const fp = ((trabCa || {})[a.matricula] || {}).fp || {};
    const nomeDe = (id) => ((ca.config.empregados || []).find((e) => e.id === id) || {}).nome || id;
    const pend = [], vazios = [];
    idsEmp.forEach((id) => {
      const s = situacaoEmpregado(fp, id, undefined, casoDoEmpregado(a.matricula, id, comp, opcoesDoEmpregado(ca.config, id)), parFolha);
      if (!s.iniciado) vazios.push(nomeDe(id));
      else if (!s.concluido) {
        const erradas = s.passos.map((p, i) => (p.digitado && !p.ok ? PASSOS_CONTRACHEQUE[i].nome.replace(/\s*\(.*$/, "") : null)).filter(Boolean);
        const faltam = s.passos.filter((p) => !p.digitado).length;
        pend.push(nomeDe(id).split(" ").slice(0, 2).join(" ") + ": " + (erradas.length ? "revisar " + erradas.join(", ") : "") + (faltam ? (erradas.length ? "; " : "") + faltam + " linha(s) em branco" : ""));
      }
    });
    const ex = [];
    if (pend.length) ex.push({ criterio: "Contracheques com linhas para revisar", nota: null, orientacao: pend.slice(0, 8).join(" | ") + (pend.length > 8 ? " | e mais " + (pend.length - 8) : ""), onde: "Etapa 2 · Folha de pagamento → Atividade · Elaborar a folha" });
    if (vazios.length) ex.push({ criterio: "Contracheques ainda não iniciados (" + vazios.length + ")", nota: null, orientacao: vazios.slice(0, 8).map((n) => n.split(" ").slice(0, 2).join(" ")).join(", ") + (vazios.length > 8 ? " e mais " + (vazios.length - 8) : ""), onde: "Etapa 2 · Folha de pagamento → Atividade · Elaborar a folha" });
    return ex;
  }

  const linhaDe = (a, etapa) => {
    const salva = ((mapa[a.matricula] || {}).avaliacoes || {})[etapa.id];
    const sug = sugestoes(a, etapa.id);
    return { a, sug, salva, ...notasDoAluno(etapa, sug, salva) };
  };
  const ordem = [...alunos].sort((x, y) => (x.nome || "").localeCompare(y.nome || "", "pt-BR"));

  function abrirOrient(a, etapa, l, fechada) {
    const o = orientacaoEtapa({ etapa, aluno: a, sug: l.sug, extra: etapa.id === "fp" ? extraFp(a) : [], fechada, nota: l.final !== null ? l.final : l.parcial });
    setMsg(""); setOrient({ aluno: a, etapa, texto: o.texto, n: o.itens.length });
  }
  async function enviar() {
    if (!orient || !orient.texto.trim()) return;
    setOcupado(true); setMsg("");
    try {
      const r = await criarChamadoNumerado(tid, {
        matricula: orient.aluno.matricula, alunoNome: orient.aluno.nome || "", assunto: "Orientação do professor · " + (orient.etapa ? "Etapa " + orient.etapa.n : "Etapas 1 a 6"),
        documentoId: null, documentoNumero: null, status: "respondido", iniciadoPor: "professor",
        mensagens: [{ autor: "professor", texto: orient.texto.trim(), em: new Date().toISOString() }],
        naoLidoProfessor: false, naoLidoAluno: true, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      });
      setOrient(null);
      setMsg("Orientação enviada pelo Suporte" + (r && r.numero ? " (chamado Nº " + String(r.numero).padStart(4, "0") + ")" : "") + ". O aluno vê no menu Suporte.");
    } catch (e) { setMsg("Não foi possível enviar: " + (e.message || e)); }
    setOcupado(false);
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(orient.texto); setMsg("Texto copiado."); }
    catch (e) { setMsg("Não copiou automaticamente: selecione o texto e use Ctrl+C."); }
  }

  const painelOrient = orient && (
    <div className="panel" style={{ borderColor: "var(--amber)", borderWidth: 2, marginBottom: 12 }}>
      <div className="panel-body">
        <b>Orientação de {orient.aluno.nome} · {orient.etapa ? "Etapa " + orient.etapa.n : "todas as etapas"}</b> Vai para o Suporte dele como mensagem. Você pode editar o texto antes.
        <textarea style={{ width: "100%", minHeight: 200, marginTop: 8 }} value={orient.texto} onChange={(e) => setOrient({ ...orient, texto: e.target.value })} />
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn" disabled={ocupado || !orient.texto.trim()} onClick={enviar}>{ocupado ? "Enviando…" : "Enviar pelo Suporte"}</button>
          <button className="btn secondary" onClick={copiar}>Copiar texto</button>
          <button className="btn secondary" onClick={() => setOrient(null)}>Cancelar</button>
        </div>
      </div>
    </div>
  );
  const aviso = msg && <div className="balance-check ok" style={{ marginBottom: 12 }}>{msg}</div>;

  // Sem o período anterior da turma, o aluno não consegue fazer a análise horizontal (Etapa 5). Chamado 0088 (27/11/2026).
  const avisoAnterior = agb && agb.anterior === null ? (
    <div className="balance-check bad" style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span><b>Período anterior da turma não cadastrado.</b> Na Etapa 5 os alunos veem "o professor ainda não cadastrou o período anterior" e não conseguem fazer a análise horizontal (AH) nem interpretá-la.</span>
      <button className="btn" onClick={() => onIr && onIr("agb-prof")}>Cadastrar agora (Gerar período anterior)</button>
    </div>
  ) : null;
  if (aba === "geral") {
    // Visão geral completa (modelo aprovado em 25/11/2026): situação, nota, % e aviso de entrega fora do prazo, por aluno e etapa.
    const lista = etapasEfetivas(rotCfg || null);
    const SIT = { fim: "Avaliada", aval: "Aguarda você", and: "Em andamento", nao: "Não iniciou", ajus: "Ajustar", bloq: "Bloqueada" };
    const venc = Object.fromEntries(ETAPAS.map((e) => [e.id, !!situacaoPrazo(e.id, rotCfg || null).vencido]));
    const dados = ordem.filter((a) => !a.contaTeste).map((a) => { // a conta de teste do professor não entra na visão geral
      const r = mapa[a.matricula] || { estado: {}, entregas: {} };
      const cels = ETAPAS.map((e) => {
        const i = lista.findIndex((x) => x.id === e.id);
        const sit = i >= 0 ? situacaoEtapa(lista, i, r.estado, r.entregas) : { cod: "bloqueada" };
        const ent = (r.entregas || {})[e.id];
        const fora = !!(ent && prazos[e.id] && entregaEmAtraso(prazos[e.id], ent));
        let v = null, final = false, p = 0;
        if (e.id === "f1") { const x = n1[a.matricula] || {}; v = x.v === undefined ? null : x.v; final = !!x.final; p = typeof x.p === "number" ? x.p : 0; }
        else { const l = linhaDe(a, e); v = l.final !== null ? l.final : l.parcial; final = l.final !== null; p = Math.round((v || 0) * 10); }
        let s;
        if (final) s = "fim";
        else if (sit.cod === "ajustar") s = "ajus";
        else if (sit.cod === "entregue" || sit.cod === "aprovada") s = "aval";
        else if (v !== null && v > 0) s = "and";
        else if (sit.cod === "bloqueada") s = "bloq";
        else s = "nao";
        return { e, s, v, p, fora, ent };
      });
      const itens = [];
      cels.forEach((c) => {
        if (c.s === "nao" && venc[c.e.id]) itens.push({ t: "nao", txt: "não iniciou a Etapa " + c.e.n });
        if (c.s === "ajus") itens.push({ t: "ajus", txt: "Etapa " + c.e.n + " voltou para ajuste" });
        if (c.fora) itens.push({ t: "late", txt: "Etapa " + c.e.n + " entregue fora do prazo" });
        if (c.s === "aval") itens.push({ t: "aval", txt: "Etapa " + c.e.n + " aguarda sua avaliação" });
      });
      const vs = cels.filter((c) => c.v !== null && c.v !== undefined && c.s !== "nao" && c.s !== "bloq").map((c) => c.v);
      return { a, cels, itens, media: vs.length ? vs.reduce((s, x) => s + x, 0) / vs.length : null };
    });
    const nCel = (i, k) => dados.filter((d) => d.cels[i].s === k).length;

    // orientação geral do aluno: junta o que falta em cada etapa (Etapa 1 em uma linha; 2 a 6 pelas regras de cada etapa)
    function orientacaoGeral(d) {
      const nome = (d.a.nome || "").split(" ")[0] || "Olá";
      const L = [nome + ", segue a sua orientação geral do projeto (etapas 1 a 6).", ""];
      let n = 0;
      d.cels.forEach((c) => {
        const itens = [];
        if (c.e.id === "f1") {
          if (c.s === "nao" || c.s === "and") itens.push({ criterio: "Escrituração em andamento", orientacao: "Conclua os documentos pendentes (digitação, análise fiscal, classificação e lançamento) e envie os lançamentos ao Livro diário.", onde: "Etapa 1 · Escrituração" });
        } else if (c.s !== "bloq") {
          const l = linhaDe(d.a, c.e);
          orientacaoEtapa({ etapa: c.e, aluno: d.a, sug: l.sug, extra: c.e.id === "fp" ? extraFp(d.a) : [], fechada: false, nota: null }).itens.forEach((x) => itens.push(x));
        }
        if (c.s === "ajus") itens.unshift({ criterio: "Etapa devolvida para ajuste", orientacao: "Leia o retorno do professor no Meu roteiro por etapas, ajuste e reenvie.", onde: "Meu roteiro por etapas" });
        if (!itens.length) return;
        L.push("ETAPA " + c.e.n + " — " + c.e.titulo);
        itens.forEach((x, i) => { n++; L.push((i + 1) + ") " + x.criterio + (x.nota !== null && x.nota !== undefined ? " (nota " + fmtNota(x.nota) + ")" : "")); L.push("   O que fazer: " + x.orientacao); if (x.onde) L.push("   Onde: " + x.onde); });
        L.push("");
      });
      if (!n) L.push("Nenhuma pendência encontrada nos itens que o sistema confere. Continue assim!", "");
      L.push("Qualquer dúvida, responda esta mensagem.", "Prof. Jorge");
      return { texto: L.join("\n"), n };
    }
    function abrirGeral(d) { const o = orientacaoGeral(d); setMsg(""); setOrient({ aluno: d.a, etapa: null, texto: o.texto, n: o.n }); }
    async function orientarTodos() {
      const alvo = dados.filter((d) => d.itens.length);
      setConfTodos(false); setOcupado(true); setMsg("");
      let ok = 0;
      try {
        for (const d of alvo) {
          await criarChamadoNumerado(tid, {
            matricula: d.a.matricula, alunoNome: d.a.nome || "", assunto: "Orientação do professor · Etapas 1 a 6",
            documentoId: null, documentoNumero: null, status: "respondido", iniciadoPor: "professor",
            mensagens: [{ autor: "professor", texto: orientacaoGeral(d).texto.trim(), em: new Date().toISOString() }],
            naoLidoProfessor: false, naoLidoAluno: true, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
          });
          ok++;
        }
        setMsg("Orientações enviadas pelo Suporte para " + ok + " aluno(s).");
      } catch (e) { setMsg("Enviadas " + ok + " de " + alvo.length + ". Parou por erro: " + (e.message || e)); }
      setOcupado(false);
    }

    const peso = { nao: 3, ajus: 2, late: 1, aval: 1 };
    const comAtencao = dados.filter((d) => d.itens.length);
    const ranking = [...comAtencao].sort((x, y) => y.itens.reduce((s, i) => s + peso[i.t], 0) - x.itens.reduce((s, i) => s + peso[i.t], 0)).slice(0, 6);
    let linhas = soAtencao ? comAtencao : dados;
    linhas = [...linhas].sort((x, y) => (ordemVg === "nome" ? 0 : (x.media === null ? -1 : x.media) - (y.media === null ? -1 : y.media)));
    const nAval = dados.reduce((s, d) => s + d.cels.filter((c) => c.s === "aval").length, 0);
    const nFora = dados.reduce((s, d) => s + d.cels.filter((c) => c.fora).length, 0);
    const nAjus = dados.reduce((s, d) => s + d.cels.filter((c) => c.s === "ajus").length, 0);
    const nParados = dados.filter((d) => d.cels.every((c) => c.s === "nao" || c.s === "bloq")).length;
    const fmtPrazo = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "sem prazo");
    const irEtapa = (e) => { const g = GRUPOS_ETAPAS.find((x) => x.etapas.includes(e.id)); if (g && onIrAba) onIrAba(g.id); };

    return (
      <>
        <div className="screen-eyebrow">dashboard do ciclo</div>
        <h2 className="screen-title">Visão geral — todas as etapas</h2>
        <p className="screen-sub">{turma.nome}. Quem está onde, quem precisa de você e o que passou do prazo de referência. Clique em uma célula para abrir a aba da etapa.</p>
        {aviso}
        {avisoAnterior}
        {painelOrient}

        <div className="vg-etapas">
          {ETAPAS.map((e, i) => {
            const cs = dados.map((d) => d.cels[i]);
            const ini = cs.filter((c) => c.s !== "nao" && c.s !== "bloq").length;
            const vals = cs.filter((c) => c.s !== "nao" && c.s !== "bloq" && c.v !== null).map((c) => c.v);
            const med = vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : null;
            return (
              <div className="vg-et" key={e.id}>
                <button className="vg-etit" onClick={() => irEtapa(e)}><span className="mono">E{e.n}</span> {ROTULOS[e.id]}</button>
                <div className="vg-bar" title="avaliadas / aguardam você / ajustar / em andamento / não iniciaram">
                  {["fim", "aval", "ajus", "and", "nao"].map((k) => <i key={k} className={"vg-s-" + k} style={{ width: (dados.length ? nCel(i, k) / dados.length * 100 : 0) + "%" }} />)}
                </div>
                <div className="vg-kv"><span>iniciaram</span><b>{ini} de {dados.length}</b></div>
                <div className="vg-kv"><span>média</span><b>{med === null ? "—" : fmtNota(Math.round(med * 10) / 10)}</b></div>
                <div className="vg-kv"><span>aguardam você</span><b>{nCel(i, "aval")}</b></div>
                <div className="vg-kv"><span>fora do prazo</span><b>{cs.filter((c) => c.fora).length}</b></div>
                <div className={"vg-prazo mono" + (venc[e.id] ? " venc" : "")}>prazo {fmtPrazo(prazos[e.id])}{venc[e.id] ? " · vencido" : ""}</div>
              </div>
            );
          })}
        </div>

        {(() => {
          const fd = focoVg && dados.find((d) => d.a.matricula === focoVg.m);
          const fc = fd && fd.cels.find((c) => c.e.id === focoVg.id);
          if (!fc || fc.s !== "aval") return null;
          const e = fc.e;
          const ONDE_VER = { fp: ["Notas e avaliação → Conferência da folha (etapa 2)", null], ca: ["Etapa 3 · CA (turma)", "ca-prof"], resc: ["Etapa 4 · Rescisão (turma)", "resc-prof"], agb: ["Etapas 5–6 · AGB (turma)", "agb-prof"], comp: ["Etapas 5–6 · AGB (turma)", "agb-prof"] };
          const ver = ONDE_VER[e.id];
          const entTxt = fc.ent ? new Date(fc.ent).toLocaleDateString("pt-BR") : null;
          return (
            <div className="panel vg-foco">
              <div className="panel-head"><h3>{fd.a.nome} · Etapa {e.n} ({ROTULOS[e.id]}) aguarda você</h3><button className="btn secondary" onClick={() => setFocoVg(null)}>Fechar</button></div>
              <div className="panel-body" style={{ fontSize: 13.5 }}>
                {entTxt ? <div>Entregue em {entTxt}{fc.fora ? " ⏰ (fora do prazo de referência; sem desconto automático)" : ""}.</div> : <div>O aluno ainda não marcou a entrega, mas a etapa já está em análise.</div>}
                {e.id === "f1" ? (
                  <ol className="vg-passos">
                    <li><b>O que fazer:</b> digitar a qualidade técnica (nota do professor) do aluno. O sistema já calculou completude e autonomia.<br /><b>Onde:</b> Notas e avaliação → Notas · Etapa 1.</li>
                    <li><b>Depois:</b> marcar a nota como liberada para o aluno ver.</li>
                  </ol>
                ) : (
                  <ol className="vg-passos">
                    <li><b>1) Conferir o trabalho</b> (o que o sistema não confere: pareceres e interpretações).<br /><b>Onde:</b> {ver ? ver[0] : "Etapa " + e.n}.</li>
                    <li><b>2) Dar a nota 0 a 10</b> e escrever o retorno. O sistema já sugere a nota dos itens que confere.<br /><b>Onde:</b> Notas e avaliação → Avaliação das etapas (0 a 10) → aba do grupo da Etapa {e.n}.</li>
                    <li><b>3) Aprovar</b> (libera a próxima) <b>ou pedir ajuste</b> ao aluno.<br /><b>Onde:</b> Etapas, prazos e liberação → Liberar etapas e situação dos alunos → {fd.a.nome.split(" ")[0]}.</li>
                  </ol>
                )}
                <div className="btn-row">
                  {e.id === "f1"
                    ? <button className="btn" onClick={() => onIr && onIr("notas", { matricula: fd.a.matricula, etapaId: e.id })}>Ir para Notas · Etapa 1 ({fd.a.nome.split(" ")[0]})</button>
                    : <button className="btn" onClick={() => onIr && onIr("aval-prof", { matricula: fd.a.matricula, etapaId: e.id })}>Corrigir {fd.a.nome.split(" ")[0]} · Etapa {e.n} agora</button>}
                  {e.id !== "f1" && ver && ver[1] && <button className="btn secondary" onClick={() => onIr && onIr(ver[1], { matricula: fd.a.matricula, etapaId: e.id })}>Ver o trabalho da turma</button>}
                  {e.id !== "f1" && <button className="btn secondary" onClick={() => onIr && onIr("roteiro-lib", { matricula: fd.a.matricula, etapaId: e.id })}>Aprovar ou pedir ajuste</button>}
                  <button className="btn secondary" onClick={() => irEtapa(e)}>Ver a etapa no dashboard</button>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="vg-main">
          <div className="panel">
            <div className="panel-head">
              <h3>Aluno por etapa</h3>
              <div className="vg-tools no-print">
                <span className="vg-seg">{[["nota", "Nota"], ["sit", "Situação"], ["prog", "% feito"]].map(([k, t]) => <button key={k} className={modoVg === k ? "on" : ""} onClick={() => setModoVg(k)}>{t}</button>)}</span>
                <label className="vg-chk"><input type="checkbox" checked={soAtencao} onChange={(e) => setSoAtencao(e.target.checked)} /> só quem precisa de atenção</label>
                <span className="vg-seg">{[["nome", "A–Z"], ["media", "Menor média"]].map(([k, t]) => <button key={k} className={ordemVg === k ? "on" : ""} onClick={() => setOrdemVg(k)}>{t}</button>)}</span>
              </div>
            </div>
            <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
              <table className="vg-tab">
                <thead><tr><th>Aluno</th>{ETAPAS.map((e) => <th key={e.id} className="c" title={ROTULOS[e.id]}>E{e.n}<br />{fmtPrazo(prazos[e.id])}</th>)}<th className="c">Média</th><th className="c">Atenção</th><th></th></tr></thead>
                <tbody>
                  {linhas.map((d) => (
                    <tr key={d.a.matricula}>
                      <td className="vg-nome"><button className="btn secondary" style={{ padding: "2px 8px" }} onClick={() => onSelecionarAluno && onSelecionarAluno(d.a)}>{d.a.nome}</button></td>
                      {d.cels.map((c) => (
                        <td key={c.e.id}>
                          <button className={"vg-cell vg-s-" + c.s} onClick={() => (c.s === "aval" ? setFocoVg({ m: d.a.matricula, id: c.e.id }) : irEtapa(c.e))} title={c.s === "aval" ? "Aguarda você: clique para ver o que fazer e onde" : SIT[c.s] + (c.fora ? " · entregue fora do prazo" : "")}>
                            {c.s === "bloq" ? <span className="vg-l">Bloqueada</span>
                              : modoVg === "sit" ? <span className="vg-l"><b>{SIT[c.s]}</b>{c.fora ? " ⏰" : ""}</span>
                              : modoVg === "prog" ? <><span className="vg-v mono">{c.p}%{c.fora ? " ⏰" : ""}</span><span className="vg-mini"><i style={{ width: c.p + "%" }} /></span></>
                              : c.s === "nao" ? <><span className="vg-v mono">—</span><span className="vg-l">não iniciou</span></>
                              : <><span className={"vg-v mono" + (c.s === "fim" ? "" : " parc")}>{dec(c.v)}{c.fora ? " ⏰" : ""}</span><span className="vg-l">{c.s === "fim" ? "avaliada" : c.s === "aval" ? "aguarda você ›" : c.s === "ajus" ? "ajustar" : "parcial"}</span></>}
                          </button>
                        </td>
                      ))}
                      <td className="c mono"><b>{d.media === null ? "—" : dec(Math.round(d.media * 10) / 10)}</b></td>
                      <td className="c">{d.itens.length ? <span className="tag-pill bad">{d.itens.length}</span> : <span className="tag-pill ok">ok</span>}</td>
                      <td><button className={"btn" + (d.itens.length ? "" : " secondary")} style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => abrirGeral(d)}>Orientação</button></td>
                    </tr>
                  ))}
                  {!linhas.length && <tr><td colSpan={ETAPAS.length + 4} style={{ padding: 18 }}>Ninguém precisa de atenção neste momento.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="vg-leg">
              {["fim", "aval", "and", "nao", "ajus", "bloq"].map((k) => <span key={k}><i className={"vg-dot vg-s-" + k} />{SIT[k]}</span>)}
              <span>⏰ entregue fora do prazo de referência (etapa vencida segue aberta)</span><span><i>itálico</i> = nota parcial</span>
              <span>% feito: Etapa 1 = documentos concluídos; Etapas 2 a 6 = pontos já conferidos pelo sistema (nota parcial × 10)</span>
            </div>
          </div>

          <div className="vg-aside">
            <div className="panel">
              <div className="panel-head"><h3>Para você agora</h3></div>
              <div className="vg-cnt">
                <div><b>{nAval}</b><span>etapas aguardam sua avaliação</span></div>
                <div><b>{nFora}</b><span>entregues fora do prazo</span></div>
                <div><b>{nAjus}</b><span>devolvidas para ajuste</span></div>
                <div><b>{nParados}</b><span>sem nenhuma etapa iniciada</span></div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head"><h3>Precisam de atenção</h3>
                {!confTodos && <button className="btn" disabled={ocupado || comAtencao.length === 0} onClick={() => setConfTodos(true)}>Orientar todos ({comAtencao.length})</button>}
              </div>
              {confTodos && (
                <div className="panel-body" style={{ fontSize: 13 }}>
                  Vai enviar uma orientação pelo Suporte a <b>{comAtencao.length} aluno(s)</b>, com o que falta em cada etapa. Confirma?
                  <div className="btn-row" style={{ marginTop: 8 }}>
                    <button className="btn" disabled={ocupado} onClick={orientarTodos}>Enviar agora</button>
                    <button className="btn secondary" onClick={() => setConfTodos(false)}>Cancelar</button>
                  </div>
                </div>
              )}
              <ul className="vg-att">
                {ranking.map((d) => (
                  <li key={d.a.matricula}>
                    <div className="vg-t"><span>{d.a.nome}</span><span className="tag-pill bad">{d.itens.length}</span></div>
                    <div className="vg-d">{d.itens.slice(0, 3).map((i) => i.txt).join("; ")}{d.itens.length > 3 ? "; …" : ""}</div>
                  </li>
                ))}
                {!ranking.length && <li className="vg-d">Ninguém precisa de atenção agora.</li>}
              </ul>
            </div>
          </div>
        </div>
      </>
    );
  }

  const grupo = GRUPOS_ETAPAS.find((g) => g.id === aba);
  const renderEtapa = (etapa) => {
  const sp = situacaoPrazo(etapa.id, rotCfg || null);
  const fechada = sp.fechada;
  const linhas = ordem.map((a) => linhaDe(a, etapa));
  const auto = etapa.criterios.filter((c) => c.tipo === "auto");
  const iniciaram = linhas.filter((l) => l.parcial !== null && l.parcial > 0).length;
  const avaliados = linhas.filter((l) => l.final !== null).length;
  const valores = linhas.map((l) => (l.final !== null ? l.final : l.parcial)).filter((x) => x !== null);
  const media = valores.length ? valores.reduce((s, x) => s + x, 0) / valores.length : null;
  const prazoTxt = prazos[etapa.id] ? new Date(prazos[etapa.id] + "T12:00:00").toLocaleDateString("pt-BR") : "sem prazo definido";

  return (
    <>
      <div className="screen-eyebrow">dashboard do ciclo</div>
      <h2 className="screen-title">Etapa {etapa.n} · {etapa.titulo}</h2>
      <p className="screen-sub">
        <span className={"tag-pill " + (fechada ? "" : "ok")}>{sp.vencido ? "aberta · prazo de referência vencido em " + prazoTxt : "aberta · prazo " + prazoTxt}</span>{" "}
        {fechada ? "A nota é final depois da sua avaliação; enquanto isso, é a nota parcial com o que o sistema já confere." : "A nota é parcial até a sua avaliação."} Turma: {turma.nome}.
      </p>
      <div className="kpi-row">
        <div className="kpi"><div className="kpi-v">{iniciaram} de {linhas.length}</div><div className="kpi-l">alunos que iniciaram</div></div>
        <div className="kpi"><div className="kpi-v">{avaliados} de {linhas.length}</div><div className="kpi-l">já avaliados por você</div></div>
        <div className="kpi"><div className="kpi-v">{media === null ? "—" : fmtNota(media)}</div><div className="kpi-l">média {avaliados === linhas.length && avaliados > 0 ? "final" : "parcial"} da turma</div></div>
        <div className="kpi"><div className="kpi-v">{linhas.length - iniciaram}</div><div className="kpi-l">ainda sem nada conferido</div></div>
      </div>
      <div className="panel"><div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Aluno</th>{auto.map((c) => <th key={c.key} className="num" title={c.nome}>{c.nome.split(" (")[0].slice(0, 22)}</th>)}<th className="num">{fechada || avaliados ? "Nota" : "Nota parcial"}</th><th>Situação</th><th></th></tr></thead>
          <tbody>{linhas.map((l) => {
            const sit = l.final !== null ? ["avaliado", "ok"] : !l.parcial ? ["não iniciou", "bad"] : fechada ? ["aguarda sua avaliação", "warn"] : ["em andamento", "warn"];
            const pend = auto.some((c) => l.sug[c.key] === null || l.sug[c.key] === undefined || l.sug[c.key] < NOTA_OK);
            return (
              <tr key={l.a.matricula}>
                <td><button className="btn secondary" style={{ padding: "2px 8px" }} onClick={() => onSelecionarAluno && onSelecionarAluno(l.a)}>{l.a.nome}</button></td>
                {auto.map((c) => <td key={c.key} className="num mono">{dec(l.sug[c.key])}</td>)}
                <td className="num mono" style={{ fontWeight: l.final !== null ? 700 : 400, fontStyle: l.final !== null ? "normal" : "italic" }}>{dec(l.final !== null ? l.final : l.parcial)}</td>
                <td><span className={"tag-pill " + sit[1]}>{sit[0]}</span></td>
                <td><button className={"btn " + (pend ? "" : "secondary")} style={{ padding: "2px 10px", fontSize: 12.5 }} onClick={() => abrirOrient(l.a, etapa, l, fechada)}>{pend ? "Orientação" : "Ver orientação"}</button></td>
              </tr>);
          })}</tbody>
        </table>
      </div></div>
      <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 8 }}>
        As colunas mostram a nota sugerida pelo sistema em cada critério automático (0 a 10). A parte que depende de você (pareceres) entra na nota quando você avalia em Avaliação das etapas.
        “Orientação” gera o texto para o aluno com o que ajustar e onde; você edita e envia pelo Suporte.
      </div>
    </>
  );
  };
  return <>{aviso}{grupo.etapas.includes("agb") && avisoAnterior}{painelOrient}{grupo.etapas.map((id) => <div key={id}>{renderEtapa(ETAPAS.find((e) => e.id === id))}</div>)}</>;
}
