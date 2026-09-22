import { useEscrituracao } from "../../hooks/useEscrituracao.js";
import { contaInfo, fmt } from "../../lib/contabil.js";
import { StatusBadge } from "../shared/UI.jsx";

export default function HistoricoAluno({ turmaId, alunoSelecionado }) {
  const { carregando, lancamentos, contas } = useEscrituracao(turmaId, alunoSelecionado?.matricula);

  if (!alunoSelecionado) {
    return (
      <>
        <div className="screen-eyebrow">histórico do aluno</div>
        <h2 className="screen-title">Histórico de lançamentos</h2>
        <div className="empty-state">Selecione um aluno na tela Turmas para ver o histórico dele.</div>
      </>
    );
  }
  if (carregando) return <div className="empty-state">Carregando…</div>;

  const ordenados = lancamentos.slice().reverse();

  return (
    <>
      <div className="screen-eyebrow">histórico do aluno</div>
      <h2 className="screen-title">Histórico de lançamentos — {alunoSelecionado.nome}</h2>
      <p className="screen-sub">Todos os lançamentos da empresa didática deste aluno, aprovados ou não, com as observações de correção já dadas.</p>
      {ordenados.length === 0 && <div className="panel"><div className="empty-state">Nenhum lançamento registrado ainda.</div></div>}
      {ordenados.map((l) => (
        <div className="panel" key={l.id}>
          <div className="panel-head">
            <h3>{l.data} · {l.documento} — {l.historico}</h3>
            <StatusBadge status={l.status} />
          </div>
          <div className="panel-body">
            <table>
              <thead><tr><th>Conta</th><th className="num">Débito</th><th className="num">Crédito</th></tr></thead>
              <tbody>
                {l.partidas.map((p, i) => (
                  <tr key={i}>
                    <td className="mono">{p.conta} — {contaInfo(p.conta, contas)?.nome || ""}</td>
                    <td className="num mono">{p.tipo === "D" ? fmt(p.valor) : ""}</td>
                    <td className="num mono">{p.tipo === "C" ? fmt(p.valor) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {l.obsCorrecao && (
              <div className="helper-note" style={{ marginTop: 10 }}>
                <b>Observação de correção enviada ao aluno: </b>{l.obsCorrecao}
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
