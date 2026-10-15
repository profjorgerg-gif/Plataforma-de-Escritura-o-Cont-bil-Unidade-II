import { useState } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";

export default function ModoTeste({ turma, onEntrar }) {
  const alunos = useAlunosDaTurma(turma?.id);
  const contasTeste = (alunos || []).filter((a) => a.contaTeste);
  const [criando, setCriando] = useState(false);
  // "Zerar dados do teste": só para conta marcada contaTeste (conferido no banco antes de apagar).
  const COLECOES_TESTE = ["lancamentos", "digitacoesNFe", "classificacoes", "analisesFiscais", "lixeira"];
  const [zerar, setZerar] = useState(null);        // { matricula, nome, total } ou null
  const [confZerar, setConfZerar] = useState("");
  const [zerando, setZerando] = useState(false);
  const [msgZerar, setMsgZerar] = useState("");

  async function abrirZerar(a) {
    setMsgZerar(""); setConfZerar("");
    setZerar({ matricula: a.matricula, nome: a.nome, total: null });
    try {
      let total = 0;
      for (const c of COLECOES_TESTE) total += (await getDocs(collection(db, "turmas", turma.id, "alunos", a.matricula, c))).size;
      setZerar({ matricula: a.matricula, nome: a.nome, total });
    } catch (e) { setMsgZerar("Não foi possível contar os itens: " + e.message); }
  }

  async function zerarTeste() {
    if (!zerar || confZerar.trim().toUpperCase() !== "ZERAR") return;
    setZerando(true); setMsgZerar("");
    try {
      const ref = doc(db, "turmas", turma.id, "alunos", zerar.matricula);
      const snap = await getDoc(ref);
      if (!snap.exists() || snap.data().contaTeste !== true) {
        setMsgZerar("Parei: esta conta não está marcada como conta de teste. Nada foi apagado.");
        setZerando(false); return;
      }
      let n = 0;
      for (const c of COLECOES_TESTE) {
        const itens = await getDocs(collection(db, "turmas", turma.id, "alunos", zerar.matricula, c));
        for (const d of itens.docs) { await deleteDoc(d.ref); n++; }
      }
      setMsgZerar(n + " item(ns) da conta de teste apagado(s). A conta continua existindo, vazia, pronta para novos testes.");
      setZerar(null); setConfZerar("");
    } catch (e) {
      setMsgZerar("Parou no meio: " + e.message + ". Só a conta de teste foi afetada; pode tentar de novo.");
    }
    setZerando(false);
  }

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
                      </button>{" "}
                      <button className="btn secondary" onClick={() => abrirZerar(a)}>Zerar dados do teste</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {msgZerar && !zerar && <div className="helper-note">{msgZerar}</div>}
      {zerar && (
        <div className="panel">
          <div className="panel-head"><h3>Zerar dados do teste — {zerar.nome}</h3></div>
          <div className="panel-body">
            <div className="aviso-pedagogico">
              ⚠ Vai apagar tudo que foi digitado nesta CONTA DE TESTE{zerar.total !== null ? " (" + zerar.total + " itens)" : ""}. Alunos de verdade não são tocados — o sistema confere que a conta é de teste antes de apagar.
            </div>
            <div className="field">
              <label>Para confirmar, digite ZERAR</label>
              <input value={confZerar} onChange={(e) => setConfZerar(e.target.value)} />
            </div>
            {msgZerar && <div className="helper-note">{msgZerar}</div>}
            <div className="btn-row">
              <button className="btn" disabled={zerando || confZerar.trim().toUpperCase() !== "ZERAR"} onClick={zerarTeste}>
                {zerando ? "Apagando…" : "Apagar dados do teste"}
              </button>{" "}
              <button className="btn secondary" disabled={zerando} onClick={() => { setZerar(null); setMsgZerar(""); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
