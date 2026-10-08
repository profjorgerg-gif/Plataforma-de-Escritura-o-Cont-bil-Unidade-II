import { useMemo } from "react";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { Kpi } from "../shared/UI.jsx";

// Agrega as devoluções da turma inteira por conta usada nos lançamentos que
// já precisaram de correção — dá ao professor um retrato do que vale reforçar
// em aula para todo mundo, não só observação isolada aluno por aluno.
function mapaDeErros(todos, contas) {
  const comCorrecao = todos.filter(({ lancamento }) => (lancamento.historicoCorrecoes?.length || 0) > 0);
  const totalCorrecoes = comCorrecao.reduce((s, { lancamento }) => s + lancamento.historicoCorrecoes.length, 0);
  const contagem = {};
  comCorrecao.forEach(({ lancamento }) => {
    (lancamento.partidas || []).forEach((p) => {
      contagem[p.conta] = (contagem[p.conta] || 0) + 1;
    });
  });
  const ranking = Object.entries(contagem)
    .map(([codigo, vezes]) => ({ codigo, nome: contas.find((c) => c.codigo === codigo)?.nome || codigo, vezes }))
    .sort((a, b) => b.vezes - a.vezes)
    .slice(0, 8);
  return { lancamentosComCorrecao: comCorrecao.length, totalCorrecoes, ranking };
}

export default function Painel({ turma }) {
  const alunos = useAlunosDaTurma(turma?.id);
  const { todos } = useLancamentosDaTurma(turma?.id, alunos);
  const { contas } = usePlanoContas();
  const pendentes = todos.filter(({ lancamento }) => lancamento.status === "enviado");
  const emCorrecao = todos.filter(({ lancamento }) => lancamento.status === "correcao");
  const aprovadosTotal = todos.filter(({ lancamento }) => lancamento.status === "aprovado").length;
  const erros = useMemo(() => mapaDeErros(todos, contas || []), [todos, contas]);

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (alunos === null) return <div className="empty-state">Carregando…</div>;

  return (
    <>
      <div className="screen-eyebrow">painel do professor</div>
      <h2 className="screen-title">Painel do Professor — Unidade II</h2>
      <p className="screen-sub">Visão geral da turma {turma.nome} e lançamentos pendentes. A avaliação ficou em "Notas", no menu.</p>

      <div className="btn-row no-print" style={{ marginBottom: 16 }}>
        <a className="btn secondary" href="https://console.firebase.google.com/project/plataforma-ci-unidade-ii/firestore/usage" target="_blank" rel="noopener noreferrer">
          📊 Ver uso do Firestore (Console Firebase) ↗
        </a>
      </div>

      <div className="kpi-row">
        <Kpi label="Alunos na turma" value={alunos.length} />
        <Kpi label="Lançamentos pendentes" value={pendentes.length} tone="warn" />
        <Kpi label="Correções em aberto" value={emCorrecao.length} tone="bad" />
        <Kpi label="Aprovados na turma" value={aprovadosTotal} tone="ok" />
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Turma — {turma.nome}</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Aluno</th><th className="num">Pendentes</th><th className="num">Aprovados</th></tr></thead>
            <tbody>
              {alunos.map((a) => {
                const lancsAluno = todos.filter((t) => t.aluno.matricula === a.matricula).map((t) => t.lancamento);
                return (
                  <tr key={a.matricula}>
                    <td>{a.nome}</td>
                    <td className="num mono">{lancsAluno.filter((l) => l.status === "enviado").length}</td>
                    <td className="num mono">{lancsAluno.filter((l) => l.status === "aprovado").length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {erros.lancamentosComCorrecao > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Mapa de erros recorrentes da turma</h3></div>
          <div className="panel-body">
            <div className="helper-note" style={{ marginBottom: 12 }}>
              {erros.lancamentosComCorrecao} lançamento(s) desta turma já precisaram de correção ({erros.totalCorrecoes} devolução(ões) ao todo). As contas abaixo são as que mais aparecem nesses lançamentos — um sinal do que vale reforçar em aula para todos, não só individualmente.
            </div>
            <table>
              <thead><tr><th>Conta</th><th className="num">Vezes em lançamento devolvido</th><th className="num">% das devoluções</th></tr></thead>
              <tbody>
                {erros.ranking.map((r) => (
                  <tr key={r.codigo}>
                    <td className="mono">{r.codigo} — {r.nome}</td>
                    <td className="num mono">{r.vezes}</td>
                    <td className="num mono">{Math.round((r.vezes / erros.lancamentosComCorrecao) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
