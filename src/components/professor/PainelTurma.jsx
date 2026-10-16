import { useEffect, useMemo, useState } from "react";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useCatalogoDocumentos } from "../../hooks/useCatalogoDocumentos.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useChamados } from "../../hooks/useChamados.js";
import { useAndamentoDaTurma } from "../../hooks/useAndamentoDaTurma.js";
import { montarSala, chamadoAguardando, haQuanto, LIMITE_PADRAO } from "../../lib/salaDeAula.js";

// Painel da turma (2026-10-16): visão geral da turma, com tudo clicável.
// Só LEITURA e navegação: usa os mesmos dados da Sala de aula e não grava nada.
const COR = { r: "var(--red)", a: "var(--amber)", g: "var(--green)", c: "var(--ink-faint)" };
const PASSOS = [["dig", "① Digitação"], ["ana", "② Análise fiscal"], ["cla", "③ Classificação"], ["lan", "④ Lançamento"], ["apr", "⑤ Aprovado"]];
const ESTADO = {
  ok: { g: "✓", bg: "var(--green-pale)", cor: "var(--green)", t: "completo" },
  and: { g: "…", bg: "var(--blue-pale)", cor: "var(--blue)", t: "em andamento" },
  nao: { g: "·", bg: "var(--paper-deep)", cor: "var(--ink-faint)", t: "não começou" },
};
const estadoDe = (n, total) => (total > 0 && n >= total ? "ok" : n > 0 ? "and" : "nao");

export default function PainelTurma({ turma, onIr, onAbrirHistorico }) {
  const turmaId = turma && turma.id;
  const alunos = useAlunosReaisDaTurma(turmaId);
  const { porMatricula } = useLancamentosDaTurma(turmaId, alunos);
  const catalogo = useCatalogoDocumentos();
  const documentos = useDocumentosDaTurma(turmaId);
  const { chamados } = useChamados(turmaId, null);
  const andamento = useAndamentoDaTurma(turmaId, alunos);
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(t); }, []);

  const sala = useMemo(() => {
    if (!alunos) return null;
    return montarSala({ alunos, porAluno: andamento, lancsPorAluno: porMatricula, chamados: chamados || [], catalogo, totalNotas: documentos ? documentos.length : 0 }, agora, LIMITE_PADRAO);
  }, [alunos, andamento, porMatricula, chamados, catalogo, documentos, agora]);

  if (!turma) return <div className="helper-note">Escolha uma turma em <b>Turmas</b> para ver o painel. <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => onIr("turmas")}>Abrir Turmas</button></div>;
  if (!sala) return <div className="empty-state">Carregando…</div>;

  const total = documentos ? documentos.length : 0;
  const L = sala.linhas;
  const nFila = L.reduce((t, x) => t + x.enviados, 0);
  const nOk = L.reduce((t, x) => t + x.nOk, 0), nNo = L.reduce((t, x) => t + x.nNo, 0);
  const nSup = (chamados || []).filter(chamadoAguardando).length;
  const nDev = L.filter((x) => x.devolvidos > 0).length;
  const sala_ = (filtro) => onIr("inicio", { filtro });
  const irSinal = (x, s) => {
    if (s.alvo === "fila") onIr("fila", { matricula: x.aluno.matricula, nome: x.aluno.nome });
    else if (s.alvo === "suporte") onIr("suporte", { chamadoId: s.chamadoId });
    else onAbrirHistorico && onAbrirHistorico(x.aluno);
  };
  const Kpi = ({ cor, n, t, sub, onClick }) => (
    <button type="button" onClick={onClick} style={{ textAlign: "left", background: "var(--surface)", border: "1px solid var(--line)", borderLeft: "4px solid " + cor, padding: "9px 12px", cursor: "pointer", font: "inherit", color: "inherit" }}>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.05 }}>{n}</div>
      <div>{t}</div>
      <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{sub}</div>
    </button>
  );
  const precisam = L.filter((x) => x.grupo === "pre").slice(0, 8);
  const porNome = [...L].sort((a, b) => (a.aluno.nome || "").localeCompare(b.aluno.nome || ""));

  return (
    <>
      <div className="screen-eyebrow">projeto interdisciplinar CI–CA–AGB</div>
      <h2 className="screen-title">Painel da turma</h2>
      <p className="screen-sub">{turma.nome} · {L.length} alunos · atualiza sozinho · toque em qualquer número, nome ou célula para abrir.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, margin: "10px 0 14px" }}>
        <Kpi cor="var(--amber)" n={nFila} t="na fila de correção" sub={!catalogo ? "conferindo…" : "✅ " + nOk + " conferem · ❌ " + nNo + " com erro"} onClick={() => onIr("fila")} />
        <Kpi cor="var(--blue)" n={nSup} t="chamados no suporte" sub="esperando você" onClick={() => onIr("suporte")} />
        <Kpi cor="var(--red)" n={sala.cont.pre} t="precisam de você" sub={"de " + L.length + " alunos"} onClick={() => sala_("pre")} />
        <Kpi cor="var(--amber)" n={nDev} t="com devolução pendente" sub="o aluno ainda não corrigiu" onClick={() => sala_("pre")} />
        <Kpi cor="var(--ink-faint)" n={sala.cont.par} t="parados" sub={"sem gravar há " + LIMITE_PADRAO + " min ou mais"} onClick={() => sala_("par")} />
        <Kpi cor="var(--green)" n={sala.cont.ok + " de " + L.length} t="em dia" sub="Etapa 1 concluída" onClick={() => sala_("ok")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginBottom: 14 }}>
        <div className="panel" style={{ margin: 0 }}><div className="panel-body">
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>ANDAMENTO DA ETAPA 1 · {total} NOTAS POR ALUNO</div>
          {PASSOS.map(([k, nome]) => {
            const c = { ok: 0, and: 0, nao: 0 };
            L.forEach((x) => { c[estadoDe(x.prog[k], total)]++; });
            return (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "120px 1fr 40px", gap: 8, alignItems: "center", margin: "6px 0" }}>
                <button type="button" onClick={() => onIr(k === "lan" || k === "apr" ? "fila" : "painel")} style={{ background: "none", border: 0, cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit", padding: 0 }}>{nome}</button>
                <div style={{ display: "flex", height: 22, gap: 2 }}>
                  {["ok", "and", "nao"].filter((e) => c[e]).map((e) => (
                    <button type="button" key={e} title={ESTADO[e].t + ": " + c[e]} onClick={() => onIr(k === "lan" || k === "apr" ? "fila" : "painel")}
                      style={{ flex: c[e], border: 0, background: ESTADO[e].bg, color: ESTADO[e].cor, fontWeight: 700, fontSize: 11, cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap", minWidth: 0 }}>{ESTADO[e].g} {c[e]}</button>
                  ))}
                </div>
                <span className="mono" style={{ textAlign: "right", color: "var(--ink-soft)" }}>{L.length ? Math.round(c.ok / L.length * 100) : 0}%</span>
              </div>
            );
          })}
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>✓ completo · … em andamento · · não começou. Cada barra conta os alunos.</div>
        </div></div>

        <div className="panel" style={{ margin: 0 }}><div className="panel-body">
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>PRECISAM DE VOCÊ AGORA</div>
          {precisam.length === 0 && <div style={{ color: "var(--ink-soft)" }}>Ninguém precisa de você agora. 🎉</div>}
          {precisam.map((x) => (
            <div key={x.aluno.matricula} style={{ borderBottom: "1px solid var(--line)", padding: "5px 0" }}>
              <button type="button" onClick={() => onAbrirHistorico && onAbrirHistorico(x.aluno)} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", fontWeight: 700, color: "inherit", padding: 0 }}>{x.aluno.nome}</button>
              <div>{x.sinais.map((s, i) => (
                <button type="button" key={i} onClick={() => irSinal(x, s)} style={{ fontSize: 12, fontWeight: 700, padding: "1px 7px", margin: "2px 6px 2px 0", border: "1px solid " + COR[s.tom], color: COR[s.tom], background: "transparent", cursor: "pointer", font: "inherit" }}>{s.texto} ›</button>
              ))}</div>
            </div>
          ))}
          {sala.cont.pre > precisam.length && <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => sala_("pre")}>Ver todos os {sala.cont.pre}</button>}
        </div></div>
      </div>

      <div className="panel" style={{ margin: 0 }}><div className="panel-body" style={{ overflowX: "auto" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>MAPA DA TURMA · ALUNO × PASSO · CLIQUE NA CÉLULA PARA ABRIR O ALUNO</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>
            <th style={{ textAlign: "left", padding: "4px 6px" }}>Aluno</th>
            {PASSOS.map(([k, n]) => <th key={k} style={{ padding: "4px 6px", fontSize: 12 }}>{n}</th>)}
            <th style={{ textAlign: "left", padding: "4px 6px" }}>Última atividade</th>
          </tr></thead>
          <tbody>
            {porNome.map((x) => (
              <tr key={x.aluno.matricula} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                  <button type="button" onClick={() => onAbrirHistorico && onAbrirHistorico(x.aluno)} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", color: "inherit", padding: 0 }}>{x.aluno.nome}</button>
                  {x.chamado ? " ✉" : ""}
                </td>
                {PASSOS.map(([k]) => {
                  const e = estadoDe(x.prog[k], total), n = x.prog[k];
                  const erro = (k === "lan") && x.nNo > 0, dev = (k === "lan") && x.devolvidos > 0;
                  return (
                    <td key={k} style={{ textAlign: "center", padding: "3px 4px" }}>
                      <button type="button" title={nome(k) + ": " + n + "/" + total}
                        onClick={() => (erro ? onIr("fila", { matricula: x.aluno.matricula, nome: x.aluno.nome }) : onAbrirHistorico && onAbrirHistorico(x.aluno))}
                        style={{ minWidth: 52, height: 24, border: erro ? "2px solid var(--red)" : 0, background: ESTADO[e].bg, color: ESTADO[e].cor, fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: 12 }}>
                        {ESTADO[e].g} {n}/{total}{erro ? " ❌" : dev ? " ↩" : ""}
                      </button>
                    </td>
                  );
                })}
                <td style={{ padding: "4px 6px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{haQuanto(x.ultima, agora)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
      <div className="helper-note" style={{ marginTop: 12 }}>Este painel só mostra e leva você às telas de trabalho: nada é aprovado, devolvido ou alterado aqui, e nada que o aluno digitou muda.</div>
    </>
  );
}
function nome(k) { return (PASSOS.find((p) => p[0] === k) || [k, k])[1]; }
