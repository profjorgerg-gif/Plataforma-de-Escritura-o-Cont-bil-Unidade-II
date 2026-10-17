import { useMemo, useState } from "react";
import { calcularRazao, calcularBalancete, calcularDRE, calcularBP, fmt } from "../../lib/contabil.js";
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

export default function DemonstracoesAlunos({ turma }) {
  const alunos = useAlunosReaisDaTurma(turma?.id);
  const { porMatricula } = useLancamentosDaTurma(turma?.id, alunos);
  const documentos = useDocumentosDaTurma(turma?.id);
  const { contas } = usePlanoContas();
  const [filtro, setFiltro] = useState("todos");
  const [mat, setMat] = useState(null);
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
                    onClick={() => setMat(x.aluno.matricula)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMat(x.aluno.matricula); } }}>
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
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}
