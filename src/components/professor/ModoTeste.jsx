import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";

export default function ModoTeste({ turma, onEntrar }) {
  const alunos = useAlunosDaTurma(turma?.id);
  const contasTeste = (alunos || []).filter((a) => a.contaTeste);
  const [criando, setCriando] = useState(false);

  async function criarContaTeste() {
    setCriando(true);
    const matricula = "TESTE-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    await setDoc(doc(db, "turmas", turma.id, "alunos", matricula), {
      nome: "Conta de teste do professor",
      matricula,
      uid: null,
      contaTeste: true,
      nota: null,
      notaLiberada: false,
      prazoIndividual: null,
      prazoHistorico: [],
      dataEntrega: null,
      desconto: 0,
      descontoManual: false,
    });
    setCriando(false);
  }

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (alunos === null) return <div className="empty-state">Carregando…</div>;

  return (
    <>
      <div className="screen-eyebrow">modo de teste</div>
      <h2 className="screen-title">Testar como aluno</h2>
      <p className="screen-sub">
        Crie uma conta de teste para experimentar o fluxo do aluno (digitar NF-e, lançar no Diário, etc.) sem usar uma
        conta Google de aluno de verdade. É um registro separado, marcado como teste — nunca mistura com dados de alunos reais.
      </p>

      <div className="btn-row" style={{ marginBottom: 18 }}>
        <button className="btn" disabled={criando} onClick={criarContaTeste}>
          {criando ? "Criando…" : "+ Criar conta de teste"}
        </button>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Contas de teste — {turma.nome}</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          {contasTeste.length === 0 ? (
            <div className="empty-state">Nenhuma conta de teste criada ainda.</div>
          ) : (
            <table>
              <thead><tr><th>Nome</th><th>Identificador</th><th></th></tr></thead>
              <tbody>
                {contasTeste.map((a) => (
                  <tr key={a.matricula}>
                    <td>{a.nome}</td>
                    <td className="mono">{a.matricula}</td>
                    <td>
                      <button className="btn secondary" onClick={() => onEntrar({ turmaId: turma.id, matricula: a.matricula, nome: a.nome })}>
                        Entrar no modo de teste →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
