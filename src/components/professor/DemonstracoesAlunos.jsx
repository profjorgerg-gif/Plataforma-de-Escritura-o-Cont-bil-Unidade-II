import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { calcularRazao, calcularBalancete, calcularDRE, calcularBP, saldoConta, fmt } from "../../lib/contabil.js";
import { DrillModal } from "../shared/UI.jsx";
import LivroRazao from "../aluno/LivroRazao.jsx";
import Balancete from "../aluno/Balancete.jsx";
import BalancoPatrimonial from "../aluno/BalancoPatrimonial.jsx";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";

// 2026-10-17 — Dashboard do professor: itens 5 a 10 da Etapa 1 por aluno (Livro diário, Razão, Balancete, ARE, DRE, Balanço).
// SÓ LEITURA. Usa as mesmas funções de lib/contabil.js que as telas do aluno, sobre os lançamentos APROVADOS. Não grava nada.
const TOL = 0.005;
const SIT = { ok: ["ok", "✓ ", "fecha"], av: ["av", "◐ ", "parcial"], no: ["no", "✗ ", "não fecha"], sd: ["sd", "— ", "sem dados"] };
const COR = {
  ok: { background: "var(--green-pale)", color: "var(--green-dark, var(--green))" },
  av: { background: "var(--amber-pale, #f6eacb)", color: "var(--amber, #8a5a00)" },
  no: { background: "var(--red-pale, #f6dedc)", color: "var(--red, #9b2c2c)" },
  sd: { background: "var(--surface-alt, rgba(128,128,128,.15))", color: "var(--ink-soft)" },
};
const Pilula = ({ s }) => <span style={{ ...COR[s], display: "inline-block", fontSize: 12.5, fontWeight: 600, padding: "2px 8px", whiteSpace: "nowrap" }}>{SIT[s][1] + SIT[s][2]}</span>;

const ABAS = ["5 · Livro diário", "6 · Razão", "7 · Balancete", "8 · ARE", "9 · DRE", "10 · Balanço"];
const FILTROS = {
  receita: (c) => c.grupo === 4 && c.subgrupo === "Receita Bruta de Vendas",
  outras: (c) => c.grupo === 4 && c.subgrupo === "Outras Receitas Operacionais",
  finrec: (c) => c.grupo === 4 && c.subgrupo === "Receitas Financeiras",
  deducoes: (c) => c.grupo === 4 && c.redutora,
  cmv: (c) => c.codigo.startsWith("6.2"),
  prod: (c) => c.codigo.startsWith("6.1"),
  despop: (c) => c.grupo === 5 && c.subgrupo !== "Despesas Financeiras",
  findesp: (c) => c.grupo === 5 && c.subgrupo === "Despesas Financeiras",
};
const SIT_LANC = { aprovado: "aprovado", enviado: "enviado", correcao: "devolvido", rascunho: "rascunho" };

// ARE/DRE conta a conta (só para o professor): cada linha mostra as contas que a formam; clicar na conta abre os lançamentos.
function Detalhada({ dre, tipo, onDrill }) {
  const grupo = (titulo, chave, sinal) => {
    const cs = dre.linhas.filter((l) => FILTROS[chave](l.conta));
    if (!cs.length) return null;
    return (
      <div key={chave}>
        <div className="bp-group-label">{titulo}</div>
        {cs.map((c) => (
          <div className="dre-row clickable" key={c.conta.codigo} onClick={() => onDrill({ title: c.conta.nome, legenda: "Lançamentos que formam este saldo.", linhas: c.movimentos })}>
            <span>{c.conta.codigo} {c.conta.nome}</span><span className="val mono">{sinal === "-" ? "(" + fmt(saldoConta(c)) + ")" : fmt(saldoConta(c))}</span>
          </div>
        ))}
      </div>
    );
  };
  const total = (rot, v) => <div className="dre-row total" key={rot}><span>{rot}</span><span className="val">{fmt(v)}</span></div>;
  const rec = dre.receitaBruta + dre.receitasFin + (dre.outrasReceitas || 0);
  return (
    <div className="panel"><div className="panel-body">
      {tipo === "are" ? (
        <>
          {grupo("RECEITAS · vendas", "receita", "+")}{grupo("RECEITAS · outras operacionais", "outras", "+")}{grupo("RECEITAS · financeiras", "finrec", "+")}{total("Total das receitas", rec)}
          {grupo("(–) DEDUÇÕES", "deducoes", "-")}{grupo("(–) CUSTOS · CMV", "cmv", "-")}{grupo("(–) CUSTOS · produção", "prod", "-")}
          {grupo("(–) DESPESAS operacionais", "despop", "-")}{grupo("(–) DESPESAS financeiras", "findesp", "-")}
          {total("= Resultado do Exercício", dre.resultadoExercicio)}
        </>
      ) : (
        <>
          {grupo("Receita Bruta de Vendas", "receita", "+")}{total("= Receita Bruta", dre.receitaBruta)}
          {grupo("(–) Deduções da Receita", "deducoes", "-")}{total("= Receita Líquida", dre.receitaLiquida)}
          {grupo("(–) CMV", "cmv", "-")}{grupo("(–) Custos de Produção", "prod", "-")}{total("= Resultado Bruto", dre.resultadoBruto)}
          {grupo("(–) Despesas Operacionais", "despop", "-")}{grupo("(+) Outras Receitas Operacionais", "outras", "+")}
          {grupo("(+) Receitas Financeiras", "finrec", "+")}{grupo("(–) Despesas Financeiras", "findesp", "-")}
          {total("= Resultado do Exercício", dre.resultadoExercicio)}
        </>
      )}
    </div></div>
  );
}

// Livro diário do aluno, só consulta: todos os lançamentos com as partidas e a situação de cada um.
function DiarioConsulta({ lancs, contas }) {
  const nome = (cod) => { const c = contas.find((x) => x.codigo === cod); return cod + (c ? " " + c.nome : ""); };
  const lista = [...(lancs || [])].sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")));
  if (!lista.length) return <div className="empty-state">Este aluno ainda não tem lançamentos.</div>;
  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table style={{ minWidth: 560 }}>
        <thead><tr><th>Data</th><th>Histórico / partidas</th><th style={{ textAlign: "right" }}>Débito</th><th style={{ textAlign: "right" }}>Crédito</th><th>Situação</th></tr></thead>
        <tbody>
          {lista.map((l) => (
            <FragLanc key={l.id} l={l} nome={nome} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
function FragLanc({ l, nome }) {
  const ps = l.partidas || [];
  return (
    <>
      <tr><td className="mono">{l.data || "—"}</td><td><b>{l.historico || "(sem histórico)"}</b></td><td /><td /><td>{SIT_LANC[l.status] || l.status || "—"}</td></tr>
      {ps.map((p, i) => (
        <tr key={i}><td /><td style={{ paddingLeft: p.tipo === "C" ? 36 : 18 }}>{nome(p.conta)}</td>
          <td className="mono" style={{ textAlign: "right" }}>{p.tipo === "D" ? fmt(Number(p.valor) || 0) : ""}</td>
          <td className="mono" style={{ textAlign: "right" }}>{p.tipo === "C" ? fmt(Number(p.valor) || 0) : ""}</td><td /></tr>
      ))}
    </>
  );
}

function analisar(lancs, contas, totalNotas) {
  const cont = { aprovado: 0, enviado: 0, correcao: 0, rascunho: 0 };
  (lancs || []).forEach((l) => { if (cont[l.status] !== undefined) cont[l.status]++; });
  const ap = cont.aprovado;
  if (ap === 0) return { ...cont, ap, sd: true, parcial: false, bal: "sd", bp: "sd", razao: "sd", are: "sd", dre: "sd" };
  const razao = calcularRazao(lancs, contas);
  const linhas = calcularBalancete(razao);
  const totalD = linhas.reduce((s, l) => s + l.totalD, 0);
  const totalC = linhas.reduce((s, l) => s + l.totalC, 0);
  const dre = calcularDRE(razao);
  const bp = calcularBP(razao, dre.resultadoExercicio);
  const parcial = ap < totalNotas;
  const base = parcial ? "av" : "ok";
  const balOk = Math.abs(totalD - totalC) < TOL;
  const rec = dre.receitaBruta + dre.receitasFin + (dre.outrasReceitas || 0);
  return {
    ...cont, ap, sd: false, parcial, contas: linhas.length, totalD, totalC, dre, bp, rec,
    balDif: Math.abs(totalD - totalC), bpDif: Math.abs(bp.totalAtivo - (bp.totalPassivo + bp.totalPL)),
    razao: base, are: base, dre: base,
    bal: balOk ? base : "no", bp_: bp.fecha ? base : "no",
  };
}

// Razão completo (todas as contas movimentadas, uma após a outra, com o saldo corrente). Só consulta/impressão.
function RazaoCompleto({ razao }) {
  const contas = Object.values(razao).filter((b) => b.movimentos.length > 0);
  return (
    <>
      <div className="screen-eyebrow">09 · livro razão · completo</div>
      <h2 className="screen-title">Livro Razão — todas as contas ({contas.length})</h2>
      {contas.map((b) => {
        let saldo = 0;
        const dev = b.conta.natureza === "devedora";
        return (
          <div className="panel imp-conta" key={b.conta.codigo} style={{ marginBottom: 12 }}>
            <div className="panel-head"><h3 className="mono" style={{ margin: 0 }}>{b.conta.codigo} — {b.conta.nome}</h3></div>
            <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
              <table>
                <thead><tr><th>Data</th><th>Documento</th><th>Histórico</th><th className="num">Débito</th><th className="num">Crédito</th><th className="num">Saldo</th></tr></thead>
                <tbody>
                  {b.movimentos.map((m, i) => {
                    saldo += (m.tipo === "D" ? 1 : -1) * m.valor * (dev ? 1 : -1);
                    return (
                      <tr key={i}>
                        <td className="mono">{m.data}</td><td className="mono">{m.documento}</td><td>{m.historico}</td>
                        <td className="num mono">{m.tipo === "D" ? fmt(m.valor) : ""}</td><td className="num mono">{m.tipo === "C" ? fmt(m.valor) : ""}</td>
                        <td className="num mono">{fmt(Math.abs(saldo))} {saldo >= 0 ? (dev ? "D" : "C") : (dev ? "C" : "D")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: "8px 18px", borderTop: "1px solid var(--line-strong)", display: "flex", justifyContent: "space-between", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, flexWrap: "wrap", gap: 8 }}>
                <span>Totais D: {fmt(b.totalD)} C: {fmt(b.totalC)}</span>
                <span style={{ fontWeight: 600 }}>Saldo: {fmt(saldoConta(b))} ({dev ? "devedor" : "credor"})</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function montar(x, lancs, contas) {
  if (x.sd) return null;
  const razao = calcularRazao(lancs, contas);
  const dre = calcularDRE(razao);
  return { razao, dre, bp: calcularBP(razao, dre.resultadoExercicio) };
}

// Uma demonstração (índice 0 a 5). razaoCompleto = true mostra todas as contas; false mostra a tela do aluno (uma conta por vez).
function Demonstrativo({ idx, mont, lancs, contas, razaoCompleto, onDrill }) {
  if (idx === 0) return <DiarioConsulta lancs={lancs} contas={contas} />;
  if (!mont) return <div className="empty-state">Este aluno ainda não tem lançamentos aprovados: as telas 6 a 10 ficam vazias, como ficam para ele.</div>;
  if (idx === 1) return razaoCompleto ? <RazaoCompleto razao={mont.razao} /> : <LivroRazao razao={mont.razao} />;
  if (idx === 2) return <Balancete razao={mont.razao} />;
  if (idx === 3) return <Detalhada dre={mont.dre} tipo="are" onDrill={onDrill} />;
  if (idx === 4) return <Detalhada dre={mont.dre} tipo="dre" onDrill={onDrill} />;
  return <BalancoPatrimonial bp={mont.bp} />;
}

function Visor({ x, aba, lancs, contas, onDrill, razaoCompleto, setRazaoCompleto }) {
  const mont = useMemo(() => montar(x, lancs, contas), [x.sd, lancs, contas]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {aba === 1 && !x.sd && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "0 0 8px" }} role="group" aria-label="Modo do Razão">
          <button type="button" className={!razaoCompleto ? "btn" : "btn ghost"} aria-pressed={!razaoCompleto} onClick={() => setRazaoCompleto(false)}>Uma conta</button>
          <button type="button" className={razaoCompleto ? "btn" : "btn ghost"} aria-pressed={razaoCompleto} onClick={() => setRazaoCompleto(true)}>Razão completo (todas as contas)</button>
        </div>
      )}
      <Demonstrativo idx={aba} mont={mont} lancs={lancs} contas={contas} razaoCompleto={razaoCompleto} onDrill={onDrill} />
    </>
  );
}

// Impressão / PDF por aluno: monta uma folha só para o papel (escondida na tela) e abre a caixa de impressão do navegador.
// "Salvar como PDF" é escolher esse destino na caixa. Cada demonstração começa em página nova; o Razão sai completo.
const CSS_IMP = `
#imp-demo{display:none}
@media print{
  body>*:not(#imp-demo){display:none!important}
  #imp-demo{display:block!important;position:static!important;background:#fff;color:#111;font-size:11.5px;
    --ink:#111;--ink-soft:#444;--ink-faint:#666;--surface:#fff;--paper:#fff;--paper-deep:#fff;--line:#bbb;--line-strong:#777;--green:#1f5c4a;--green-dark:#163f33;--green-pale:#fff;--red:#9b2c2c;--amber:#8a5a00}
  #imp-demo .imp-pg{break-before:page;padding:0}
  #imp-demo .imp-pg:first-child{break-before:auto}
  #imp-demo .imp-cab{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;font-size:11px}
  #imp-demo .imp-rod{border-top:1px solid #777;margin-top:14px;padding-top:6px;display:flex;justify-content:space-between;gap:12px;font-size:10.5px}
  #imp-demo .imp-conta,#imp-demo tr,#imp-demo .dre-row{break-inside:avoid}
  #imp-demo .panel,#imp-demo .panel-body{border:1px solid #bbb;box-shadow:none;background:#fff}
  #imp-demo table{width:100%;border-collapse:collapse}#imp-demo th,#imp-demo td{padding:3px 6px;border-bottom:1px solid #ddd}
  #imp-demo .screen-eyebrow{display:none}
  #imp-demo .screen-title{font-size:15px;margin:4px 0}
  #imp-demo .screen-sub{display:none}
}
@page{size:A4;margin:12mm}
`;
function Impressao({ pedido, aluno, turmaNome, x, lancs, contas, onFim }) {
  const mont = useMemo(() => montar(x, lancs, contas), [x.sd, lancs, contas]); // eslint-disable-line react-hooks/exhaustive-deps
  const agora = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const lista = pedido.idxs;
  useEffect(() => {
    const t0 = document.title;
    document.title = "Demonstrativos - " + aluno.nome + " - " + new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    const fim = () => { document.title = t0; onFim(); };
    window.addEventListener("afterprint", fim);
    const h = setTimeout(() => window.print(), 400);
    return () => { clearTimeout(h); window.removeEventListener("afterprint", fim); document.title = t0; };
  }, [pedido.n]); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div id="imp-demo">
      <style>{CSS_IMP}</style>
      {lista.map((i, k) => (
        <div className="imp-pg" key={i}>
          <div className="imp-cab">
            <div><b>Projeto Interdisciplinar CI–CA–AGB · Etapa 1 · Escrituração</b><br />Turma: {turmaNome}<br /><b>{ABAS[i]}</b>{i === 1 ? " · completo" : ""}</div>
            <div style={{ textAlign: "right" }}><b>{aluno.nome}</b><br />Matrícula {aluno.matricula}<br />Emitido em {agora}</div>
          </div>
          <Demonstrativo idx={i} mont={mont} lancs={lancs} contas={contas} razaoCompleto onDrill={() => {}} />
          <div className="imp-rod"><span>Conferência do aluno: ____________ &nbsp; Visto do professor: ____________</span><span>Demonstrativo {k + 1} de {lista.length}</span></div>
        </div>
      ))}
    </div>,
    document.body
  );
}

export default function DemonstracoesAlunos({ turma }) {
  const alunos = useAlunosReaisDaTurma(turma?.id);
  const { porMatricula } = useLancamentosDaTurma(turma?.id, alunos);
  const documentos = useDocumentosDaTurma(turma?.id);
  const { contas } = usePlanoContas();
  const [filtro, setFiltro] = useState("todos");
  const [mat, setMat] = useState(null);
  const [aba, setAba] = useState(0);
  const [drill, setDrill] = useState(null);
  const [razaoCompleto, setRazaoCompleto] = useState(false);
  const [impressao, setImpressao] = useState(null);
  const totalNotas = (documentos && documentos.length) || 24;

  const linhas = useMemo(() => {
    if (!alunos || !contas || !contas.length) return null;
    return alunos.map((a) => {
      const r = analisar(porMatricula[a.matricula], contas, totalNotas);
      r.bpS = r.sd ? "sd" : r.bp_; // situação do Balanço
      return { aluno: a, ...r };
    });
  }, [alunos, porMatricula, contas, totalNotas]);

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (!linhas) return <div className="empty-state">Carregando…</div>;

  const sit = (x) => (x.sd ? "sd" : "ok");
  const pend = (x) => x.correcao > 0 || [x.razao, x.bal, x.are, x.dre, x.bpS].some((s) => s !== "ok");
  const noFecha = (x) => x.bal === "no" || x.bpS === "no";
  const lista = linhas.filter((x) => filtro === "todos" || (filtro === "pend" && pend(x)) || (filtro === "no" && noFecha(x)) || (filtro === "ok" && !pend(x)));
  const sel = linhas.find((x) => x.aluno.matricula === mat) || null;
  const n = linhas.length;
  const resumo = [
    [n, "alunos na turma"],
    [linhas.filter((x) => x.ap >= totalNotas).length, "com todas as " + totalNotas + " notas aprovadas"],
    [linhas.filter((x) => x.sd).length, "sem nenhum lançamento aprovado"],
    [linhas.filter((x) => x.bal === "no").length, "balancete que não fecha"],
    [linhas.filter((x) => x.bpS === "no").length, "balanço que não fecha"],
    [linhas.filter((x) => !pend(x)).length, "com tudo certo (5 a 10)"],
  ];
  const filtros = [["todos", "Todos"], ["pend", "Com pendência"], ["no", "Não fecham"], ["ok", "Tudo certo"]];
  const barra = (x) => {
    const fal = Math.max(0, totalNotas - x.ap - x.enviado - x.correcao - x.rascunho);
    const seg = (cor, v) => <i style={{ display: "block", height: "100%", flex: v, background: cor }} />;
    return <div style={{ display: "flex", gap: 2, height: 10, minWidth: 90 }} role="img" aria-label={x.ap + " aprovados, " + x.enviado + " enviados, " + x.correcao + " devolvidos, " + (x.rascunho + fal) + " em rascunho ou faltando"}>
      {seg("var(--green)", x.ap)}{seg("var(--amber, #c9922b)", x.enviado)}{seg("var(--red, #b3261e)", x.correcao)}{seg("var(--ink-faint, #999)", x.rascunho + fal)}
    </div>;
  };
  const avisos = (x) => {
    const a = [];
    if (x.sd) a.push("Nenhum lançamento aprovado ainda: não há demonstrativos para mostrar.");
    if (x.correcao) a.push(x.correcao + " lançamento(s) devolvido(s) aguardando correção do aluno.");
    if (x.enviado) a.push(x.enviado + " lançamento(s) enviado(s) esperando a sua análise (Fila de correção).");
    if (!x.sd && x.parcial) a.push("Faltam " + (totalNotas - x.ap) + " nota(s) aprovada(s): os demonstrativos são parciais.");
    if (x.bal === "no") a.push("Balancete com diferença de R$ " + fmt(x.balDif) + " entre débitos e créditos. Confira partidas e valores.");
    if (x.bpS === "no") a.push("Balanço com diferença de R$ " + fmt(x.bpDif) + " entre Ativo e Passivo + PL. Confira contas redutoras e o resultado do exercício.");
    if (!a.length) a.push("Nada a corrigir nos itens 5 a 10.");
    return a;
  };
  const th = { textAlign: "left", fontSize: 12, whiteSpace: "nowrap", padding: "8px" };
  const td = { padding: "8px", verticalAlign: "middle" };
  const num = { textAlign: "right", fontVariantNumeric: "tabular-nums" };

  return (
    <>
      <div className="screen-eyebrow">etapa 1 · escrituração · itens 5 a 10</div>
      <h2 className="screen-title">Do Livro diário ao Balanço, por aluno</h2>
      <p className="screen-sub">Uma linha por aluno: 5 Livro diário, 6 Razão, 7 Balancete, 8 ARE, 9 DRE e 10 Balanço patrimonial. Os demonstrativos usam só os lançamentos aprovados, como nas telas do aluno. Só leitura: nada é gravado. A tela se atualiza sozinha.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, margin: "10px 0" }}>
        {resumo.map(([v, t]) => (
          <div key={t} className="panel" style={{ padding: "10px 12px" }}>
            <b style={{ display: "block", fontSize: 24, fontVariantNumeric: "tabular-nums" }}>{v}</b>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{t}</span>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-body">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }} role="group" aria-label="Filtrar alunos">
            {filtros.map(([k, t]) => (
              <button key={k} type="button" className={filtro === k ? "btn" : "btn ghost"} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}</button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>■ <span style={{ color: "var(--green)" }}>aprovados</span></span><span>■ <span style={{ color: "var(--amber, #c9922b)" }}>enviados</span></span><span>■ <span style={{ color: "var(--red, #b3261e)" }}>devolvidos</span></span><span>■ rascunho ou faltando</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: 780 }}>
              <thead><tr>
                <th style={th}>Aluno</th>
                <th style={{ ...th, minWidth: 130 }}>5 · Diário<br /><span style={{ fontWeight: 400 }}>notas de {totalNotas}</span></th>
                <th style={{ ...th, ...num }}>6 · Razão<br /><span style={{ fontWeight: 400 }}>contas</span></th>
                <th style={th}>7 · Balancete<br /><span style={{ fontWeight: 400 }}>débito = crédito</span></th>
                <th style={{ ...th, ...num }}>8 · ARE<br /><span style={{ fontWeight: 400 }}>resultado</span></th>
                <th style={{ ...th, ...num }}>9 · DRE<br /><span style={{ fontWeight: 400 }}>resultado</span></th>
                <th style={th}>10 · Balanço<br /><span style={{ fontWeight: 400 }}>A = P + PL</span></th>
              </tr></thead>
              <tbody>
                {lista.length === 0 && <tr><td colSpan={7} style={{ ...td, color: "var(--ink-soft)" }}>Nenhum aluno neste filtro.</td></tr>}
                {lista.map((x) => (
                  <tr key={x.aluno.matricula} tabIndex={0} aria-selected={mat === x.aluno.matricula} style={{ cursor: "pointer", background: mat === x.aluno.matricula ? "var(--green-pale)" : undefined }}
                    onClick={(e) => { setDrill(null); setMat(x.aluno.matricula); const td = e.target.closest("td"); if (td && td.cellIndex > 0) setAba(Math.min(5, td.cellIndex - 1)); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMat(x.aluno.matricula); } }}>
                    <td style={td}><b>{x.aluno.nome}</b></td>
                    <td style={td}>{barra(x)}<span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{x.ap} de {totalNotas}{x.correcao ? " · " + x.correcao + " devolvidos" : ""}</span></td>
                    <td style={{ ...td, ...num }}>{x.sd ? "—" : x.contas}</td>
                    <td style={td}><Pilula s={x.bal} /></td>
                    <td className="mono" style={{ ...td, ...num }}>{x.sd ? "—" : fmt(x.dre.resultadoExercicio)}</td>
                    <td className="mono" style={{ ...td, ...num }}>{x.sd ? "—" : fmt(x.dre.resultadoExercicio)}</td>
                    <td style={td}><Pilula s={x.bpS} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 8, fontSize: 12.5, color: "var(--ink-soft)" }}>Clique numa linha para ver o detalhe do aluno.</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-body">
          {!sel ? <p style={{ color: "var(--ink-soft)" }}>Escolha uma linha da tabela para ver o detalhe do aluno.</p> : (() => {
            const x = sel, d = x.dre;
            const caixa = { border: "1px solid var(--line)", padding: "10px 12px", minWidth: 0 };
            return (
              <>
                <h3 style={{ marginTop: 0 }}>{x.aluno.nome}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
                  <div style={caixa}><b>5 · Diário</b><div className="mono">{x.ap} aprovados · {x.enviado} enviados · {x.correcao} devolvidos · {x.rascunho} rascunhos</div></div>
                  <div style={caixa}><b>6 · Razão</b><div className="mono">{x.sd ? "—" : x.contas + " contas movimentadas"}</div></div>
                  <div style={caixa}><b>7 · Balancete</b><div className="mono">{x.sd ? "—" : "Débitos " + fmt(x.totalD) + " · Créditos " + fmt(x.totalC)}</div></div>
                  <div style={caixa}><b>8 · ARE</b>{x.sd ? <div className="mono">—</div> : <div className="mono">Receitas {fmt(x.rec)}<br />(–) Deduções {fmt(d.deducoes)}<br />(–) Custos {fmt(d.cmv + (d.custosProducao || 0))}<br />(–) Despesas {fmt(d.despesasOp + d.despesasFin)}<br />= Resultado {fmt(d.resultadoExercicio)}</div>}</div>
                  <div style={caixa}><b>9 · DRE</b>{x.sd ? <div className="mono">—</div> : <div className="mono">Receita líquida {fmt(d.receitaLiquida)}<br />Resultado bruto {fmt(d.resultadoBruto)}<br />Resultado do exercício {fmt(d.resultadoExercicio)}</div>}</div>
                  <div style={caixa}><b>10 · Balanço</b>{x.sd ? <div className="mono">—</div> : <div className="mono">Ativo {fmt(x.bp.totalAtivo)}<br />Passivo + PL {fmt(x.bp.totalPassivo + x.bp.totalPL)}</div>}</div>
                </div>
                <h3>O que olhar</h3>
                <ul>{avisos(x).map((t) => <li key={t}>{t}</li>)}</ul>
                <h3>Ver como o aluno vê</h3>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }} role="group" aria-label="Demonstração">
                  {ABAS.map((n, i) => <button key={n} type="button" className={aba === i ? "btn" : "btn ghost"} aria-pressed={aba === i} onClick={() => setAba(i)}>{n}</button>)}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 8px" }}>
                  <button type="button" className="btn ghost" onClick={() => setImpressao({ idxs: [aba], n: Date.now() })} title="Abre a caixa de impressão: escolha a impressora ou Salvar como PDF">🖨 Imprimir / salvar PDF: só esta demonstração</button>
                  <button type="button" className="btn ghost" onClick={() => setImpressao({ idxs: [0, 1, 2, 3, 4, 5], n: Date.now() })} title="As 6 demonstrações do aluno, cada uma em página nova">🖨 Imprimir / salvar PDF: todas as 6 do aluno</button>
                </div>
                <Visor x={x} aba={aba} lancs={porMatricula[x.aluno.matricula]} contas={contas} onDrill={setDrill} razaoCompleto={razaoCompleto} setRazaoCompleto={setRazaoCompleto} />
                {impressao && <Impressao pedido={impressao} aluno={x.aluno} turmaNome={turma.nome} x={x} lancs={porMatricula[x.aluno.matricula]} contas={contas} onFim={() => setImpressao(null)} />}
              </>
            );
          })()}
        </div>
      </div>
      <DrillModal item={drill} onClose={() => setDrill(null)} />
    </>
  );
}
