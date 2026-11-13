import { useState } from "react";
import NotasEtapas from "../aluno/NotasEtapas.jsx";
import { GRUPOS_ETAPAS, ETAPAS, notaDaEtapa } from "../../lib/avaliacao.js";
import { useSugestoesAvaliacao } from "../../hooks/useSugestoesAvaliacao.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useRoteiroDosAlunos } from "../../hooks/useRoteiro.js";

// "Como o aluno vê" (13/11/2026): a mesma tela "Notas e retornos" do aluno, para o professor escolher um aluno e conferir o que ele enxerga.
// SÓ LEITURA. Por padrão mostra só o que está liberado ao aluno; a prévia mostra também o que ainda não foi liberado.
export default function VisaoNotasAluno({ turma }) {
  const tid = turma && turma.id;
  const alunos = useAlunosDaTurma(tid);
  const { mapa, recarregar } = useRoteiroDosAlunos(tid, alunos);
  const sg = useSugestoesAvaliacao(tid, alunos);
  const [mat, setMat] = useState("");
  const [previa, setPrevia] = useState(true);
  const [grupoId, setGrupoId] = useState("todas");
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (!alunos || !mapa) return <div className="empty-state">Carregando…</div>;
  const ordem = [...alunos].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  const aluno = ordem.find((a) => a.matricula === mat) || ordem[0];
  if (!aluno) return <div className="empty-state">Nenhum aluno na turma.</div>;
  const av = ((mapa[aluno.matricula] || {}).avaliacoes) || {};
  const salvas = Object.entries(av).map(([etapaId, v]) => ({ etapaId, ...v }));
  // prévia: onde o professor ainda não avaliou, mostra o que o sistema já confere (sugestão automática), marcado como prévia
  const auto = !sg.pronto ? [] : ETAPAS.filter((e) => e.id !== "f1" && !salvas.some((x) => x.etapaId === e.id)).map((e) => {
    const sug = sg.sugestoes(aluno, e.id) || {};
    const crit = Object.fromEntries(e.criterios.map((c) => [c.key, { nota: sug[c.key] === undefined ? null : sug[c.key], comentario: "" }]));
    const disp = e.criterios.filter((c) => crit[c.key].nota !== null);
    const peso = disp.reduce((t, c) => t + c.peso, 0);
    const parcial = peso > 0 ? Math.round(disp.reduce((t, c) => t + Number(crit[c.key].nota) * c.peso, 0) / peso * 10) / 10 : null;
    return { etapaId: e.id, liberada: false, previaAuto: true, criterios: crit, nota: parcial === null ? null : parcial };
  }).filter((x) => x.nota !== null);
  const todas = [...salvas, ...auto].sort((x, y) => ETAPAS.findIndex((e) => e.id === x.etapaId) - ETAPAS.findIndex((e) => e.id === y.etapaId));
  const gr = GRUPOS_ETAPAS.find((g) => g.id === grupoId);
  const noGrupo = (a) => !gr || gr.etapas.includes(a.etapaId);
  const visiveis = todas.filter((a) => a.liberada === true && noGrupo(a));
  const naoLib = todas.filter((a) => a.liberada !== true && noGrupo(a));
  const semNada = previa && todas.filter(noGrupo).length === 0;
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
      <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {[{ id: "todas", titulo: "Todas as etapas" }, ...GRUPOS_ETAPAS].map((g) => <button key={g.id} className={"btn " + (g.id === grupoId ? "" : "secondary")} onClick={() => setGrupoId(g.id)}>{g.titulo}</button>)}
      </div>
      {previa && naoLib.length > 0 && <div className="balance-check bad" style={{ marginBottom: 12 }}>Prévia: {naoLib.map((a) => a.etapaId).join(", ")} ainda não aparece(m) para o aluno. Libere em Avaliação das etapas.</div>}
      {semNada && <div className="helper-note" style={{ marginBottom: 12 }}>{grupoId === "g1" ? "Etapa 1: o aluno vê esta nota em “Minha nota”, não em “Notas e retornos”. Aqui ela só entra depois que você salvar a avaliação da Etapa 1." : "Este aluno ainda não tem nota nem conferência automática neste grupo."}</div>}
      {!previa && visiveis.length === 0 && <div className="helper-note" style={{ marginBottom: 12 }}>Nenhuma nota liberada para este aluno neste grupo. Marque “Incluir notas ainda não liberadas (prévia)” para ver o que o sistema já confere.</div>}
      <NotasEtapas key={aluno.matricula + previa + grupoId} avaliacoes={previa ? todas.filter(noGrupo) : visiveis} />
    </>
  );
}
