import { useEffect, useMemo, useState } from "react";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useCatalogoDocumentos } from "../../hooks/useCatalogoDocumentos.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useChamados } from "../../hooks/useChamados.js";
import { useAndamentoDaTurma } from "../../hooks/useAndamentoDaTurma.js";
import { montarSala, chamadoAguardando, haQuanto, LIMITES_PARADO, LIMITE_PADRAO } from "../../lib/salaDeAula.js";

// Sala de aula (2026-10-16): tela inicial do professor. Mostra quem precisa de você agora.
// Só LEITURA e navegação: não grava nada e não altera nada do que os alunos digitaram.
const COR = { r: "var(--red)", a: "#b7791f", g: "var(--green)", c: "var(--ink-faint)" };
const FILTROS = [["pre", "Precisam de mim"], ["par", "Parados"], ["tra", "Trabalhando"], ["ok", "Em dia"], ["all", "Todos"]];

// Cada sinal é um botão: leva direto à tela onde o professor resolve aquilo (fila só deste aluno, o chamado, o histórico).
function Sinal({ s, onClick }) {
  return (
    <button type="button" title="Abrir" onClick={(e) => { e.stopPropagation(); onClick(s); }}
      style={{ display: "inline-block", fontSize: 12, fontWeight: 700, padding: "2px 7px", margin: "2px 6px 2px 0", border: "1px solid " + COR[s.tom], color: COR[s.tom], background: "transparent", cursor: "pointer", font: "inherit", fontSize: 12 }}>{s.texto} ›</button>
  );
}
// Lembra o filtro e o aluno aberto quando o professor volta de outra tela (só em memória).
let memoria = { filtro: "pre", aberto: null };

export default function SalaDeAula({ turma, onIr, onAbrirHistorico }) {
  const turmaId = turma && turma.id;
  const alunos = useAlunosReaisDaTurma(turmaId);
  const { porMatricula } = useLancamentosDaTurma(turmaId, alunos);
  const catalogo = useCatalogoDocumentos();
  const documentos = useDocumentosDaTurma(turmaId);
  const { chamados } = useChamados(turmaId, null);
  const andamento = useAndamentoDaTurma(turmaId, alunos);
  const [filtro, setFiltroRaw] = useState(memoria.filtro);
  const setFiltro = (f) => { memoria.filtro = f; setFiltroRaw(f); };
  const [limite, setLimite] = useState(LIMITE_PADRAO);
  const [aberto, setAbertoRaw] = useState(memoria.aberto);
  const setAberto = (a) => { memoria.aberto = a; setAbertoRaw(a); };
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(t); }, []);

  const sala = useMemo(() => {
    if (!alunos) return null;
    return montarSala({ alunos, porAluno: andamento, lancsPorAluno: porMatricula, chamados: chamados || [], catalogo, totalNotas: documentos ? documentos.length : 0 }, agora, limite);
  }, [alunos, andamento, porMatricula, chamados, catalogo, documentos, agora, limite]);

  if (!turma) {
    return (<><div className="screen-eyebrow">projeto interdisciplinar CI–CA–AGB</div><h2 className="screen-title">Sala de aula</h2>
      <div className="helper-note">Escolha uma turma em <b>Turmas</b> para ver a sala. <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => onIr("turmas")}>Abrir Turmas</button></div></>);
  }
  if (!sala) return <div className="empty-state">Carregando…</div>;

  const numDoc = (id) => { const d = (catalogo || []).find((x) => x.id === id); return d ? "NF " + d.numero : id || "—"; };
  const nFila = sala.linhas.reduce((t, x) => t + x.enviados, 0);
  const nOk = sala.linhas.reduce((t, x) => t + x.nOk, 0), nNo = sala.linhas.reduce((t, x) => t + x.nNo, 0);
  const nSup = (chamados || []).filter(chamadoAguardando).length;
  // Leva o professor direto ao processo certo, com o aluno já escolhido; o botão "← Voltar" (ou "🏫 Sala de aula") traz de volta.
  function irSinal(x, s) {
    if (s.alvo === "fila") onIr("fila", { matricula: x.aluno.matricula, nome: x.aluno.nome });
    else if (s.alvo === "suporte") onIr("suporte", { chamadoId: s.chamadoId });
    else if (onAbrirHistorico) onAbrirHistorico(x.aluno);
  }
  const lista = sala.linhas.filter((x) => filtro === "all" || x.grupo === filtro);
  const carregando = !catalogo || !chamados;

  return (
    <>
      <div className="screen-eyebrow">projeto interdisciplinar CI–CA–AGB</div>
      <h2 className="screen-title">Sala de aula</h2>
      <p className="screen-sub">{turma.nome} · atualiza sozinha · toque em um aluno para ver o que fazer.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, margin: "10px 0" }}>
        <div className="panel" style={{ margin: 0 }}><div className="panel-body">
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>NA FILA DE CORREÇÃO</div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{nFila}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: "2px 0 8px" }}>{carregando ? "conferindo…" : "✅ " + nOk + " conferem · ❌ " + nNo + " com erro"}</div>
          <button className="btn" onClick={() => onIr("fila")}>Abrir a fila</button>
        </div></div>
        <div className="panel" style={{ margin: 0 }}><div className="panel-body">
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>PERGUNTAS NO SUPORTE</div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{nSup}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: "2px 0 8px" }}>esperando a sua resposta</div>
          <button className="btn" onClick={() => onIr("suporte")}>Responder</button>
        </div></div>
        <div className="panel" style={{ margin: 0 }}><div className="panel-body">
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>PRECISAM DE VOCÊ AGORA</div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{sala.cont.pre}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: "2px 0 8px" }}>de {sala.cont.all} alunos</div>
          <button className="btn secondary" onClick={() => { setFiltro("pre"); setAberto(null); }}>Ver só esses</button>
        </div></div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", margin: "8px 0" }}>
        {FILTROS.map(([k, t]) => (
          <button key={k} className={"btn " + (filtro === k ? "" : "secondary")} style={{ padding: "4px 10px", fontSize: 13 }} onClick={() => { setFiltro(k); setAberto(null); }}>{t} ({sala.cont[k]})</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-faint)" }}>
          Parado = sem gravar há mais de{" "}
          <select value={limite} onChange={(e) => setLimite(Number(e.target.value))} style={{ fontSize: 12 }}>
            {LIMITES_PARADO.map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </span>
      </div>

      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        {lista.length === 0 && <div className="empty-state">Ninguém neste filtro.</div>}
        {lista.map((x) => {
          const a = x.aluno, ab = aberto === a.matricula;
          return (
            <div key={a.matricula} style={{ borderBottom: "1px solid var(--line, #ddd)" }}>
              <div role="button" tabIndex={0} onClick={() => setAberto(ab ? null : a.matricula)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAberto(ab ? null : a.matricula); } }}
                style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", cursor: "pointer", background: ab ? "var(--paper-deep, #f1efe8)" : "transparent" }}>
                <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", background: COR[x.semaforo], marginTop: 5, flex: "0 0 12px" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                    <b>{a.nome}</b>
                    <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>última atividade {haQuanto(x.ultima, agora)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>
                    {x.etapa}{x.total > 0 && x.etapa.startsWith("Etapa 1") ? " · ① " + x.prog.dig + "/" + x.total + " ② " + x.prog.ana + "/" + x.total + " ③ " + x.prog.cla + "/" + x.total + " ④ " + x.prog.apr + "/" + x.total : ""}
                  </div>
                  <div>{x.sinais.map((s, i) => <Sinal key={i} s={s} onClick={(sg) => irSinal(x, sg)} />)}</div>
                </div>
                <span style={{ color: "var(--ink-faint)" }}>{ab ? "▾" : "▸"}</span>
              </div>
              {ab && (
                <div style={{ padding: "4px 14px 14px 34px", fontSize: 13.5 }}>
                  {x.erros.length > 0 && (<><b>O que o sistema encontrou:</b><ul style={{ margin: "4px 0 8px 18px", padding: 0 }}>
                    {x.erros.map((e, i) => <li key={i}><b>{numDoc(e.doc)}:</b> {e.motivo}{e.acao ? <> — <i>{e.acao}</i></> : null}</li>)}
                  </ul></>)}
                  {x.devolvidos > 0 && <p style={{ margin: "4px 0" }}>↩ {x.devolvidos} lançamento(s) devolvido(s) que o aluno ainda não corrigiu.</p>}
                  {x.chamado && <p style={{ margin: "4px 0" }}>✉ <b>Pergunta:</b> “{String(((x.chamado.mensagens || []).find((m) => m.autor === "aluno") || {}).texto || x.chamado.assunto || "").slice(0, 160)}”</p>}
                  {x.enviados > 0 && x.erros.length === 0 && <p style={{ margin: "4px 0" }}>⏳ {x.enviados} lançamento(s) esperando a sua aprovação na fila.</p>}
                  {!x.erros.length && !x.devolvidos && !x.chamado && !x.enviados && <p style={{ margin: "4px 0", color: "var(--ink-faint)" }}>Sem pendências. {x.concluido ? "A Etapa 1 deste aluno está concluída." : "Se estiver parado, vale uma conversa rápida."}</p>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {(x.enviados > 0 || x.erros.length > 0) && <button className="btn" onClick={() => onIr("fila", { matricula: a.matricula, nome: a.nome })}>Corrigir na fila (só {String(a.nome || "").split(" ")[0]})</button>}
                    {x.chamado && <button className="btn" onClick={() => onIr("suporte", { chamadoId: x.chamado.id })}>Responder o chamado</button>}
                    <button className={"btn" + (x.enviados > 0 || x.chamado ? " secondary" : "")} onClick={() => onAbrirHistorico && onAbrirHistorico(a)}>Abrir o histórico do aluno</button>
                    <button className="btn secondary" onClick={() => onIr("modelos")}>Mensagens prontas</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div></div>
      <div className="helper-note">Aqui você escolhe o aluno e o sistema leva direto ao processo (fila, suporte ou histórico). Para voltar a esta tela use “← Voltar” ou “🏫 Sala de aula”, no topo. Nada é aprovado, devolvido ou alterado por esta tela. “Parado” e “sem atividade hoje” usam a última vez que o aluno gravou algo. O sistema ainda não registra a hora de entrada do aluno.</div>
    </>
  );
}
