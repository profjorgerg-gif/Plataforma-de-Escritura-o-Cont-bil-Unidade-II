import { useState } from "react";
import NotasEtapas from "../aluno/NotasEtapas.jsx";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useRoteiroDosAlunos } from "../../hooks/useRoteiro.js";

// "Como o aluno vê" (13/11/2026): a mesma tela "Notas e retornos" do aluno, para o professor escolher um aluno e conferir o que ele enxerga.
// SÓ LEITURA. Por padrão mostra só o que está liberado ao aluno; a prévia mostra também o que ainda não foi liberado.
export default function VisaoNotasAluno({ turma }) {
  const tid = turma && turma.id;
  const alunos = useAlunosDaTurma(tid);
  const { mapa, recarregar } = useRoteiroDosAlunos(tid, alunos);
  const [mat, setMat] = useState("");
  const [previa, setPrevia] = useState(false);
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (!alunos || !mapa) return <div className="empty-state">Carregando…</div>;
  const ordem = [...alunos].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  const aluno = ordem.find((a) => a.matricula === mat) || ordem[0];
  if (!aluno) return <div className="empty-state">Nenhum aluno na turma.</div>;
  const av = ((mapa[aluno.matricula] || {}).avaliacoes) || {};
  const todas = Object.entries(av).map(([etapaId, v]) => ({ etapaId, ...v }));
  const visiveis = todas.filter((a) => a.liberada === true);
  const naoLib = todas.filter((a) => a.liberada !== true);
  return (
    <>
      <div className="screen-eyebrow">avaliação</div>
      <h2 className="screen-title">Como o aluno vê as notas</h2>
      <p className="screen-sub">É a tela “Notas e retornos” do aluno, igual à dele. Só leitura.</p>
      <div className="panel"><div className="panel-body" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "end" }}>
        <div className="field" style={{ margin: 0, minWidth: 280 }}>
          <label>Aluno</label>
          <select value={aluno.matricula} onChange={(e) => setMat(e.target.value)}>{ordem.map((a) => <option key={a.matricula} value={a.matricula}>{a.nome}</option>)}</select>
        </div>
        <label style={{ fontSize: 13.5 }}><input type="checkbox" checked={previa} onChange={(e) => setPrevia(e.target.checked)} /> Incluir notas ainda não liberadas (prévia)</label>
        <button className="btn secondary" onClick={recarregar}>Atualizar</button>
        <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>{visiveis.length} liberada(s) · {naoLib.length} ainda não liberada(s)</span>
      </div></div>
      {previa && naoLib.length > 0 && <div className="balance-check bad" style={{ marginBottom: 12 }}>Prévia: {naoLib.map((a) => a.etapaId).join(", ")} ainda não aparece(m) para o aluno. Libere em Avaliação das etapas.</div>}
      <NotasEtapas key={aluno.matricula + previa} avaliacoes={previa ? todas : visiveis} />
    </>
  );
}
