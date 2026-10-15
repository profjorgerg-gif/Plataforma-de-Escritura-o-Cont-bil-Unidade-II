import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useProgressoTurma } from "../../hooks/useProgressoTurma.js";
import { useRoteiroTurma, salvarRoteiroConfig } from "../../hooks/useRoteiro.js";
import { ETAPAS } from "../../lib/avaliacao.js";
import { etapasEfetivas } from "../../lib/roteiro.js";
import { prazoEfetivo } from "../../lib/contabil.js";
import { gerarRelatorioOrientacao } from "../../lib/relatorioOrientacao.js";
import { situacaoPrazo, limitesDasEtapas, mesmosLimites, diasPara } from "../../lib/fechamento.js";
import RelatorioOrientacao from "./RelatorioOrientacao.jsx";

// Fechamento da etapa (2026-10-15). Depois do prazo o aluno só consulta; aqui o professor corrige a etapa completa,
// emite o relatório de pendências e orientações, resolve o que depende dele, emite de novo para conferir e atribui a nota.
// Etapa 1: relatório completo por aluno. Etapas 2 a 6: bloqueio, prazo e prorrogação já valem; o relatório por etapa vem a seguir.
const TELA_DA_ETAPA = { f1: "etapa1", fp: "ca-prof", ca: "ca-prof", resc: "resc-prof", agb: "agb-prof", comp: "agb-prof" };
const fmtData = (d) => (d ? d.split("-").reverse().join("/") : "—");

export default function Fechamento({ turma, onIr }) {
  const turmaId = turma?.id;
  const cfg = useRoteiroTurma(turmaId || null);
  const alunos = useAlunosDaTurma(turmaId);
  const documentos = useDocumentosDaTurma(turmaId);
  const { porMatricula } = useLancamentosDaTurma(turmaId, alunos);
  const progresso = useProgressoTurma(turmaId, alunos);
  const [etapaId, setEtapaId] = useState("f1");
  const [novoPrazo, setNovoPrazo] = useState("");
  const [msg, setMsg] = useState("");
  const [aberto, setAberto] = useState("");
  const [regra, setRegra] = useState(undefined); // documento roteiro/fechamento (regra do Firestore)

  useEffect(() => {
    if (!turmaId) return;
    return onSnapshot(doc(db, "turmas", turmaId, "roteiro", "fechamento"), (s) => setRegra(s.exists() ? s.data() : null), () => setRegra(null));
  }, [turmaId]);

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (cfg === undefined) return <div className="empty-state">Carregando…</div>;
  if (cfg === null) return <div className="empty-state">O roteiro por etapas desta turma ainda não foi configurado. Preencha e salve os prazos em <b>Etapas, prazos e liberação</b>; o bloqueio só vale depois disso.</div>;

  const lista = etapasEfetivas(cfg);
  const etapa = lista.find((e) => e.id === etapaId) || lista[0];
  const sit = situacaoPrazo(etapa.id, cfg);
  const dias = diasPara(etapa.prazo);
  const regraOk = regra ? mesmosLimites(regra, limitesDasEtapas(cfg)) : false;

  async function prorrogar() {
    if (!novoPrazo) return;
    if (!window.confirm("Mudar o prazo da etapa " + etapa.titulo + " para " + fmtData(novoPrazo) + "? Vale para toda a turma e a etapa reabre se o novo prazo for futuro.")) return;
    try {
      const salvas = cfg.etapas || [];
      const etapas = ETAPAS.map((e) => {
        const s = salvas.find((x) => x.id === e.id);
        const base = s || { id: e.id, prazo: e.prazoPadrao || "", descricao: e.descricao, entrega: e.entrega, ativa: true };
        return e.id === etapa.id ? { ...base, id: e.id, prazo: novoPrazo } : base;
      });
      await salvarRoteiroConfig(turmaId, { etapas });
      setMsg("✓ Prazo atualizado para " + fmtData(novoPrazo) + ". Os alunos já veem a mudança.");
      setNovoPrazo("");
    } catch (e) { setMsg("Não foi possível salvar: " + (e.message || e)); }
  }

  const carregado = alunos && documentos && alunos.every((a) =>
    progresso.digitacoesPorMatricula[a.matricula] && progresso.analisesPorMatricula[a.matricula] && progresso.classificacoesPorMatricula[a.matricula] && porMatricula[a.matricula]);
  const linhas = etapa.id === "f1" && carregado && documentos
    ? alunos.map((a) => gerarRelatorioOrientacao({
        aluno: a, documentos,
        digitacoes: progresso.digitacoesPorMatricula[a.matricula] || {}, analises: progresso.analisesPorMatricula[a.matricula] || {},
        classificacoes: progresso.classificacoesPorMatricula[a.matricula] || [], lancamentos: porMatricula[a.matricula] || [],
        prazo: prazoEfetivo(a, turma),
      })).sort((x, y) => (x.aluno.nome || "").localeCompare(y.aluno.nome || ""))
    : null;

  return (
    <>
      <div className="screen-eyebrow">fechamento</div>
      <h2 className="screen-title">Fechamento da etapa</h2>
      <p className="screen-sub">Depois do prazo, o aluno só consulta. Aqui você corrige a etapa, emite o relatório de pendências e orientações, resolve o que depende de você, emite de novo para conferir e atribui a nota.</p>

      <div className="panel">
        <div className="panel-body">
          <div className="field" style={{ maxWidth: 420 }}>
            <label>Etapa</label>
            <select value={etapa.id} onChange={(e) => { setEtapaId(e.target.value); setAberto(""); setMsg(""); }}>
              {lista.map((e, i) => <option key={e.id} value={e.id}>{i + 1} · {e.titulo} (prazo {fmtData(e.prazo)})</option>)}
            </select>
          </div>
          <p style={{ margin: "8px 0" }}>
            {sit.fechada
              ? <b style={{ color: "var(--red)" }}>🔒 Etapa encerrada em {fmtData(etapa.prazo)}. Os alunos só consultam.</b>
              : <b style={{ color: "var(--green)" }}>Etapa aberta. Fecha ao fim de {fmtData(etapa.prazo)}{dias !== null ? " (falta(m) " + Math.max(0, dias) + " dia(s))" : ""}.</b>}
          </p>
          <div className="helper-note" style={{ marginBottom: 8 }}>
            Trava no Firestore (impede gravar mesmo fora da tela): {regra === undefined ? "verificando…" : regraOk ? <b>ativa e igual aos prazos</b> : <b style={{ color: "var(--red)" }}>ainda não sincronizada (abra esta tela com a turma selecionada e aguarde alguns segundos)</b>}.
            {" "}Para as etapas 2 a 4, a trava no Firestore só vale depois do prazo da última etapa de cada grupo (4 e 6); antes disso o bloqueio é pela tela.
          </div>
          <div className="field" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
            <div><label>Prorrogar o prazo da turma</label><input type="date" value={novoPrazo} onChange={(e) => setNovoPrazo(e.target.value)} /></div>
            <button className="btn secondary" disabled={!novoPrazo} onClick={prorrogar}>Prorrogar</button>
            <button className="btn secondary" onClick={() => onIr && onIr(TELA_DA_ETAPA[etapa.id])}>Abrir a etapa (professor)</button>
            <button className="btn" onClick={() => onIr && onIr("notas-aval")}>Atribuir nota</button>
          </div>
          {msg && <div className="balance-check ok" style={{ marginTop: 8 }}>{msg}</div>}
        </div>
      </div>

      {etapa.id !== "f1" && (
        <div className="panel"><div className="panel-body">
          O bloqueio, o prazo e a prorrogação já valem para esta etapa. O relatório de pendências com <b>Resolver</b> desta etapa vem na próxima atualização; por ora use “Abrir a etapa (professor)” e “Atribuir nota”.
        </div></div>
      )}

      {etapa.id === "f1" && (
        <div className="panel">
          <div className="panel-head"><h3>Alunos · Etapa 1 Escrituração</h3></div>
          <div className="panel-body" style={{ padding: 0 }}>
            {!linhas ? <div style={{ padding: 12 }}>Carregando dados dos alunos…</div> : (
              <table>
                <thead><tr><th>Aluno</th><th className="num">Em dia</th><th className="num">Pendências do aluno</th><th className="num">Pendências do professor</th><th className="num">Corrigidos por você</th><th>Situação</th><th></th></tr></thead>
                <tbody>
                  {linhas.map((r) => {
                    const ok = r.comAluno === 0 && r.comProfessor === 0;
                    return (
                      <tr key={r.aluno.matricula}>
                        <td>{r.aluno.nome}{r.contaTeste ? " (teste)" : ""}</td>
                        <td className="num mono">{r.nOk}/{r.total}</td>
                        <td className="num mono">{r.comAluno}</td>
                        <td className="num mono">{r.comProfessor}</td>
                        <td className="num mono">{(r.corrigidos || []).length}</td>
                        <td>{ok ? <span className="tag-pill ok">sem pendências</span> : r.comProfessor > 0 ? <b style={{ color: "var(--red)" }}>resolver</b> : <b style={{ color: "var(--amber, #9c6b1f)" }}>só do aluno</b>}</td>
                        <td><button className="btn secondary" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setAberto(aberto === r.aluno.matricula ? "" : r.aluno.matricula)}>{aberto === r.aluno.matricula ? "fechar" : "relatório"}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {etapa.id === "f1" && aberto && <RelatorioOrientacao key={aberto} turma={turma} alunoInicial={aberto} fechada />}
    </>
  );
}
