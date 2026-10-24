import { useState } from "react";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";

// Ver como o aluno — SOMENTE LEITURA (2026-10-24). O professor escolhe um aluno real e cai nas telas dele (Meu progresso).
// Nada aqui grava: quem trava campos e botões é o Shell (TravaLeitura) e as regras do Firestore recusam escrita em nome de aluno real.
export default function VerComoAluno({ turma, onEntrar }) {
  const alunos = useAlunosReaisDaTurma(turma?.id);
  const [busca, setBusca] = useState("");
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (alunos === null) return <div className="empty-state">Carregando…</div>;
  const q = busca.trim().toLowerCase();
  const lista = alunos.filter((a) => !a.contaTeste && (!q || (a.nome || "").toLowerCase().includes(q) || String(a.matricula).includes(q)));
  return (
    <>
      <div className="screen-eyebrow">avaliação</div>
      <h2 className="screen-title">Ver como o aluno (somente leitura)</h2>
      <p className="screen-sub">Escolha um aluno para ver a plataforma como ele vê, na turma {turma.nome}. Você navega e lê tudo; campos e botões de gravar ficam travados e nada é salvo.</p>
      <div className="panel"><div className="panel-body">
        <div className="field"><label htmlFor="busca-aluno">Buscar aluno</label><input id="busca-aluno" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou matrícula" /></div>
        <table>
          <thead><tr><th>Aluno</th><th>Matrícula</th><th className="num">Nota Etapa 1</th><th></th></tr></thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.matricula}>
                <td>{a.nome}</td><td className="mono">{a.matricula}</td><td className="num mono">{a.notaLiberada ? a.nota : "—"}</td>
                <td><button className="btn green" onClick={() => onEntrar({ turmaId: turma.id, matricula: a.matricula, nome: a.nome, somenteLeitura: true })}>👁 Ver como este aluno</button></td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={4} style={{ color: "var(--ink-faint)" }}>Nenhum aluno encontrado.</td></tr>}
          </tbody>
        </table>
        <div className="helper-note">Abre em "Meu progresso" do aluno. Contas de teste ficam no Modo de teste.</div>
      </div></div>
    </>
  );
}
