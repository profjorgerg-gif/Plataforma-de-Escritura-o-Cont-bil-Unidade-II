import { useEffect, useState } from "react";
import { collection, addDoc, doc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { fmt } from "../../lib/contabil.js";

export default function ClassificacaoContabil({ turmaId, matricula, documentos, contas }) {
  const [documento, setDocumento] = useState("");
  const [fato, setFato] = useState("");
  const [contaDebito, setContaDebito] = useState("");
  const [contaCredito, setContaCredito] = useState("");
  const [valor, setValor] = useState("");
  const [historico, setHistorico] = useState("");
  const [tratamento, setTratamento] = useState("");
  const [classificacoes, setClassificacoes] = useState([]);

  useEffect(() => {
    if (!turmaId || !matricula) return;
    const ref = collection(db, "turmas", turmaId, "alunos", matricula, "classificacoes");
    const unsub = onSnapshot(ref, (snap) => setClassificacoes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [turmaId, matricula]);

  async function salvar() {
    if (!fato.trim() || !contaDebito || !contaCredito || !valor) return;
    await addDoc(collection(db, "turmas", turmaId, "alunos", matricula, "classificacoes"), {
      documento, fato, contaDebito, contaCredito, valor: Number(valor), historico, tratamento,
      status: "pendente", criadoEm: serverTimestamp(),
    });
    setDocumento(""); setFato(""); setContaDebito(""); setContaCredito(""); setValor(""); setHistorico(""); setTratamento("");
  }

  async function marcarLancada(id) {
    await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula, "classificacoes", id), { status: "lançada" });
  }

  return (
    <>
      <div className="screen-eyebrow">07 · classificação contábil</div>
      <h2 className="screen-title">Classificação do fato contábil</h2>
      <p className="screen-sub">Depois de analisar o documento, identifique o fato contábil e a classificação antes de lançar no Diário. O sistema disponibiliza o Plano de Contas, mas não indica a conta correta.</p>
      <div className="panel">
        <div className="panel-head"><h3>Nova classificação</h3></div>
        <div className="panel-body">
          <div className="grid-2">
            <div className="field">
              <label>Documento de origem</label>
              <select value={documento} onChange={(e) => setDocumento(e.target.value)}>
                <option value="">— sem documento —</option>
                {documentos.map((d) => <option key={d.id} value={d.id}>Nº {d.numero}</option>)}
              </select>
            </div>
            <div className="field"><label>Valor</label><input className="mono" type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          </div>
          <div className="field"><label>Fato contábil identificado</label><textarea value={fato} onChange={(e) => setFato(e.target.value)} placeholder="O que aconteceu, em suas palavras — ex.: compra de mercadorias a prazo" /></div>
          <div className="grid-2">
            <div className="field">
              <label>Conta a debitar</label>
              <select value={contaDebito} onChange={(e) => setContaDebito(e.target.value)}>
                <option value="">Selecione</option>
                {contas.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Conta a creditar</label>
              <select value={contaCredito} onChange={(e) => setContaCredito(e.target.value)}>
                <option value="">Selecione</option>
                {contas.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label>Histórico</label><input value={historico} onChange={(e) => setHistorico(e.target.value)} /></div>
          <div className="field"><label>Tratamento tributário (se houver)</label><input value={tratamento} onChange={(e) => setTratamento(e.target.value)} /></div>
          <div className="btn-row"><button className="btn" onClick={salvar}>Salvar classificação</button></div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Classificações registradas</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          {classificacoes.length === 0 ? (
            <div className="empty-state">Nenhuma classificação registrada ainda.</div>
          ) : (
            <table>
              <thead><tr><th>Fato</th><th>Débito</th><th>Crédito</th><th className="num">Valor</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {classificacoes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.fato}</td>
                    <td className="mono">{c.contaDebito}</td>
                    <td className="mono">{c.contaCredito}</td>
                    <td className="num mono">{fmt(c.valor)}</td>
                    <td><span className={"status " + (c.status === "lançada" ? "aprovado" : "rascunho")}>{c.status}</span></td>
                    <td>{c.status === "pendente" && <button className="btn secondary" onClick={() => marcarLancada(c.id)}>marcar como lançada no Diário</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="helper-note">Use os dados desta classificação para preencher as partidas do lançamento na etapa seguinte (Livro Diário).</div>
    </>
  );
}
