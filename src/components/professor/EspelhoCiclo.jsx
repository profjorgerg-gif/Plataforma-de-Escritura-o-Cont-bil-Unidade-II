import { useEffect, useMemo } from "react";
import { ETAPAS, etapaPorId, fmtNota, faixaDaNota } from "../../lib/avaliacao.js";
import { etapasEfetivas } from "../../lib/roteiro.js";
import { useRoteiroTurma, useRoteiroDosAlunos } from "../../hooks/useRoteiro.js";
import { completudeCiclo, autonomiaCorrecoes, notaFinalPonderada, descontoEfetivo, prazoEfetivo, fmtData, fmt } from "../../lib/contabil.js";

// Dashboard do ciclo — demais etapas do projeto + espelho final das notas (2026-10-23, pedido do professor).
// Só leitura: nada aqui grava. Etapa 1 vem da tela Notas (documento do aluno); as demais vêm de "avaliacoes" e "roteiro/entregas".
const OUTRAS = ETAPAS.filter((e) => e.id !== "f1");
const hojeISO = () => new Date().toISOString().slice(0, 10);
const nf = (n) => (n === null || n === undefined || isNaN(n) ? "—" : Number(n).toFixed(1).replace(".", ","));

function pill(tipo, txt) { return <span className={"tag-pill " + tipo} style={{ whiteSpace: "nowrap" }}>{txt}</span>; }

export default function EspelhoCiclo({ turma, alunos, documentos, progressoTurma, todos, modoImp, setModoImp }) {
  const tid = turma ? turma.id : null;
  const rotCfg = useRoteiroTurma(tid);
  const { mapa } = useRoteiroDosAlunos(tid, alunos);
  const prazos = useMemo(() => Object.fromEntries(etapasEfetivas(rotCfg || null).map((e) => [e.id, e.prazo])), [rotCfg]);

  // impressão: o painel principal recebe "no-print" enquanto modoImp está ativo
  useEffect(() => {
    if (!modoImp) return;
    const anterior = document.title;
    const d = new Date(), dois = (n) => String(n).padStart(2, "0");
    document.title = "Espelho de notas - " + (turma.nome || "turma") + " - " + d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate()) + "_" + dois(d.getHours()) + "h" + dois(d.getMinutes());
    const estilo = document.createElement("style");
    estilo.textContent = "@page{size:A4 portrait;margin:12mm} .espelho-imp{display:block!important} .esp-quebra{break-inside:avoid;page-break-inside:avoid}";
    document.head.appendChild(estilo);
    const fim = () => { document.title = anterior; estilo.remove(); setModoImp(null); window.removeEventListener("afterprint", fim); };
    window.addEventListener("afterprint", fim);
    const t = setTimeout(() => window.print(), 80);
    return () => { clearTimeout(t); };
  }, [modoImp]); // eslint-disable-line

  const linhas = useMemo(() => (alunos || []).filter((a) => !a.contaTeste).map((a) => {
    const lancs = (todos || []).filter((t) => t.aluno.matricula === a.matricula).map((t) => t.lancamento);
    const comp = documentos ? completudeCiclo(documentos, progressoTurma.digitacoesPorMatricula[a.matricula], progressoTurma.analisesPorMatricula[a.matricula], progressoTurma.classificacoesPorMatricula[a.matricula], lancs) : null;
    const aut = autonomiaCorrecoes(lancs);
    const desc = descontoEfetivo(a, turma);
    const final1 = notaFinalPonderada({ completudePct: comp, qualidadeNota: a.nota, autonomiaPct: aut, desconto: desc });
    const prazo1 = prazoEfetivo(a, turma);
    const etapas = { f1: { nome: "Etapa 1 · Escrituração", nota: final1 === null ? null : Math.round(final1 * 10) / 10, liberada: !!a.notaLiberada, entregue: !!a.dataEntrega, prazo: prazo1,
      resumo: "Completude " + (comp === null ? "—" : comp + "%") + " · Qualidade técnica " + (a.nota ?? "—") + " · Autonomia " + (aut === null ? "—" : aut + "%") + (desc > 0 ? " · Desconto por atraso −" + fmt(desc) : ""),
      parecer: a.parecer || "" } };
    const av = ((mapa || {})[a.matricula] || {});
    OUTRAS.forEach((e) => {
      const s = (av.avaliacoes || {})[e.id];
      const ent = av.entregas || {};
      etapas[e.id] = { nome: e.titulo, nota: s && s.nota !== undefined && s.nota !== null ? s.nota : null, liberada: !!(s && s.liberada), entregue: !!(ent["p_" + e.id] || ent[e.id]), prazo: prazos[e.id] || "",
        resumo: s ? e.criterios.map((c) => c.nome.replace(/\s*\(.*\)\s*$/, "") + " " + nf(s.criterios && s.criterios[c.key] ? s.criterios[c.key].nota : null)).join(" · ") + (s.desconto > 0 ? " · Desconto por atraso −" + nf(s.desconto) : "") : "",
        parecer: (s && s.comentario) || "" };
    });
    return { a, etapas };
  }), [alunos, todos, documentos, progressoTurma, turma, mapa, prazos]);

  if (!turma || !alunos || !mapa) return <div className="helper-note">Carregando etapas e notas…</div>;
  const hoje = hojeISO();
  const todasEtapas = [{ id: "f1", titulo: "Etapa 1 · Escrituração" }].concat(OUTRAS.map((e) => ({ id: e.id, titulo: e.titulo })));

  const resumoEtapa = (id) => {
    const xs = linhas.map((l) => l.etapas[id]);
    const prazo = id === "f1" ? (turma.prazoUnidadeII || "") : (prazos[id] || "");
    const avaliados = xs.filter((x) => x.nota !== null);
    const emAtraso = xs.filter((x) => prazo && prazo < hoje && !x.entregue).length;
    return { total: xs.length, entregaram: xs.filter((x) => x.entregue).length, avaliados: avaliados.length, liberados: xs.filter((x) => x.liberada && x.nota !== null).length, emAtraso,
      media: avaliados.length ? avaliados.reduce((s, x) => s + x.nota, 0) / avaliados.length : null, prazo };
  };

  const celula = (x) => {
    if (x.nota !== null) return pill(x.liberada ? "ok" : "warn", nf(x.nota));
    if (x.prazo && x.prazo < hoje && !x.entregue) return pill("bad", "sem entrega");
    if (x.entregue) return pill("", "entregue");
    return <span className="mono" style={{ color: "var(--ink-faint)" }}>—</span>;
  };

  const detalhe = (l) => {
    const feitas = todasEtapas.filter((e) => l.etapas[e.id].nota !== null || l.etapas[e.id].parecer);
    return feitas.length === 0 ? <div className="helper-note">Nenhuma etapa avaliada ainda.</div> : feitas.map((e) => {
      const x = l.etapas[e.id], f = faixaDaNota(x.nota);
      return (
        <div key={e.id} className="esp-quebra" style={{ borderLeft: "3px solid var(--green)", paddingLeft: 10, margin: "8px 0" }}>
          <b>{x.nome}</b>{x.nota !== null && <> — <span className="mono">{nf(x.nota)}</span>{f ? " · " + f.nome : ""} · {x.liberada ? "liberada ao aluno" : "não liberada"}</>}
          {x.resumo && <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{x.resumo}</div>}
          {x.parecer && <div style={{ fontSize: 13, whiteSpace: "pre-wrap", marginTop: 2 }}><b>Parecer técnico:</b> {x.parecer}</div>}
        </div>
      );
    });
  };

  const imp = modoImp ? linhas.filter((l) => modoImp === "turma" || l.a.matricula === modoImp) : [];
  const semImp = modoImp ? " no-print" : "";

  return (
    <>
      <div className={"panel" + semImp} style={{ marginTop: 18 }}>
        <div className="panel-head"><h3>Demais etapas do projeto</h3></div>
        <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
          <table>
            <thead><tr><th>Etapa</th><th className="num">Prazo</th><th className="num">Entregaram</th><th className="num">Avaliados</th><th className="num">Liberados</th><th className="num">Em atraso</th><th className="num">Média da turma</th></tr></thead>
            <tbody>
              {todasEtapas.map((e) => { const r = resumoEtapa(e.id); return (
                <tr key={e.id}>
                  <td>{e.titulo}</td><td className="num mono">{r.prazo ? fmtData(r.prazo) : "—"}</td>
                  <td className="num mono">{r.entregaram} de {r.total}</td><td className="num mono">{r.avaliados} de {r.total}</td><td className="num mono">{r.liberados} de {r.total}</td>
                  <td className="num">{pill(r.emAtraso > 0 ? "bad" : "ok", r.emAtraso)}</td><td className="num mono">{nf(r.media)}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
        <div className="helper-note" style={{ margin: "0 16px 16px" }}>A média é só da turma, por etapa, para você ver o nível geral. Ela não entra na nota de nenhum aluno. Etapa 1: prazo da turma (alunos com novo prazo individual são contados pelo prazo da turma).</div>
      </div>

      <div className={"panel" + semImp}>
        <div className="panel-head"><h3>Espelho final das notas, por aluno e etapa</h3></div>
        <div className="panel-body">
          <div className="helper-note" style={{ marginTop: 0 }}>Cada célula mostra a nota final da etapa. Verde: liberada ao aluno · âmbar: avaliada, ainda não liberada · vermelho: prazo vencido sem entrega. Abra um aluno para ver critérios, desconto e parecer técnico.</div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Aluno</th>{todasEtapas.map((e) => <th key={e.id} className="num">{e.id === "f1" ? "Etapa 1" : e.titulo.length > 16 ? e.titulo.split(/[ ,]/)[0] : e.titulo}</th>)}</tr></thead>
              <tbody>
                {linhas.map((l) => <tr key={l.a.matricula}><td>{l.a.nome}</td>{todasEtapas.map((e) => <td key={e.id} className="num">{celula(l.etapas[e.id])}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          <div className="btn-row" style={{ marginTop: 10 }}><button className="btn secondary" onClick={() => setModoImp("turma")}>Imprimir espelho da turma</button></div>
          <div style={{ marginTop: 10 }}>
            {linhas.map((l) => (
              <details key={l.a.matricula} style={{ border: "1px solid var(--line)", marginTop: 6 }}>
                <summary style={{ cursor: "pointer", padding: "8px 10px" }}><b>{l.a.nome}</b> <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>· {todasEtapas.filter((e) => l.etapas[e.id].nota !== null).length} etapa(s) avaliada(s)</span></summary>
                <div style={{ padding: "4px 12px 12px" }}>
                  {detalhe(l)}
                  <button className="btn secondary" style={{ marginTop: 6 }} onClick={() => setModoImp(l.a.matricula)}>Imprimir espelho deste aluno</button>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {modoImp && (
        <div className="espelho-imp" style={{ display: "none" }}>
          <h2 style={{ margin: "0 0 2px" }}>Espelho final de notas — {modoImp === "turma" ? "turma" : (imp[0] ? imp[0].a.nome : "")}</h2>
          <div style={{ fontSize: 12, marginBottom: 8 }}>{turma.nome} · emitido em {new Date().toLocaleDateString("pt-BR")}</div>
          {modoImp === "turma" && (
            <table style={{ marginBottom: 12 }}>
              <thead><tr><th>Aluno</th>{todasEtapas.map((e) => <th key={e.id} className="num">{e.id === "f1" ? "Etapa 1" : e.titulo.split(/[ ,]/)[0]}</th>)}</tr></thead>
              <tbody>{linhas.map((l) => <tr key={l.a.matricula}><td>{l.a.nome}</td>{todasEtapas.map((e) => <td key={e.id} className="num mono">{nf(l.etapas[e.id].nota)}</td>)}</tr>)}</tbody>
            </table>
          )}
          {imp.map((l) => <div key={l.a.matricula} className="esp-quebra" style={{ marginBottom: 12 }}><h3 style={{ margin: "0 0 4px" }}>{l.a.nome}</h3>{detalhe(l)}</div>)}
        </div>
      )}
    </>
  );
}
