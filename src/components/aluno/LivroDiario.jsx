import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { fmt } from "../../lib/contabil.js";
import { StatusBadge } from "../shared/UI.jsx";

function NovoLancamentoForm({ onSalvar, documentos, contas }) {
  const [data, setData] = useState("");
  const [documento, setDocumento] = useState("");
  const [historico, setHistorico] = useState("");
  const [partidas, setPartidas] = useState([{ conta: "", tipo: "D", valor: "" }, { conta: "", tipo: "C", valor: "" }]);
  const [salvando, setSalvando] = useState(false);

  const totalD = partidas.filter((p) => p.tipo === "D").reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const totalC = partidas.filter((p) => p.tipo === "C").reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const bate = totalD > 0 && Math.abs(totalD - totalC) < 0.005;

  function updatePartida(i, field, val) {
    const novo = [...partidas]; novo[i] = { ...novo[i], [field]: val }; setPartidas(novo);
  }
  function addPartida() { setPartidas([...partidas, { conta: "", tipo: "D", valor: "" }]); }
  function removePartida(i) { setPartidas(partidas.filter((_, idx) => idx !== i)); }

  async function salvar(status) {
    setSalvando(true);
    await onSalvar({ data, documento, historico, partidas: partidas.filter((p) => p.conta && p.valor), status });
    setSalvando(false);
  }

  return (
    <div className="panel">
      <div className="panel-head"><h3>Novo lançamento</h3></div>
      <div className="panel-body">
        <div className="grid-2">
          <div className="field"><label>Data</label><input type="date" className="mono" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="field">
            <label>Documento de origem</label>
            <select value={documento} onChange={(e) => setDocumento(e.target.value)}>
              <option value="">— sem documento —</option>
              {documentos.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Histórico</label><textarea value={historico} onChange={(e) => setHistorico(e.target.value)} /></div>
        <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", color: "var(--ink-faint)" }}>Partidas</label>
        <div style={{ marginTop: 8 }}>
          {partidas.map((p, i) => (
            <div key={i} className="partida-row">
              <select value={p.conta} onChange={(e) => updatePartida(i, "conta", e.target.value)}>
                <option value="">Selecione a conta</option>
                {contas.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nome}</option>)}
              </select>
              <select value={p.tipo} onChange={(e) => updatePartida(i, "tipo", e.target.value)}>
                <option value="D">Débito</option>
                <option value="C">Crédito</option>
              </select>
              <input className="mono" placeholder="Valor" type="number" value={p.valor} onChange={(e) => updatePartida(i, "valor", e.target.value)} />
              <div className="mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>{p.tipo === "D" ? "a débito" : "a crédito"}</div>
              {partidas.length > 2 ? <button className="remove-partida" onClick={() => removePartida(i)}>×</button> : <span />}
            </div>
          ))}
        </div>
        <button className="btn secondary" style={{ marginTop: 6 }} onClick={addPartida}>+ adicionar partida</button>
        <div className={"balance-check " + (bate ? "ok" : "bad")}>
          <span>Débitos: {fmt(totalD)} · Créditos: {fmt(totalC)}</span>
          <span>{bate ? "✓ Débito = Crédito" : "✗ Lançamento desequilibrado — não pode ser enviado"}</span>
        </div>
        <div className="btn-row">
          <button className="btn secondary" disabled={salvando} onClick={() => salvar("rascunho")}>Salvar como rascunho</button>
          <button className="btn" disabled={!bate || !historico || salvando} onClick={() => salvar("enviado")}>Enviar para análise do professor</button>
        </div>
      </div>
    </div>
  );
}

export default function LivroDiario({ turmaId, matricula, lancamentos, contas, documentos = [] }) {
  const [mostrarForm, setMostrarForm] = useState(false);

  async function salvar(novo) {
    await addDoc(collection(db, "turmas", turmaId, "alunos", matricula, "lancamentos"), {
      ...novo,
      criadoEm: serverTimestamp(),
    });
    setMostrarForm(false);
  }

  return (
    <>
      <div className="screen-eyebrow">08 · livro diário</div>
      <h2 className="screen-title">Livro Diário</h2>
      <p className="screen-sub">Registro cronológico dos fatos contábeis da sua empresa didática. Só é enviado para análise quando débitos e créditos coincidem.</p>
      {!mostrarForm && <button className="btn" style={{ marginBottom: 18 }} onClick={() => setMostrarForm(true)}>+ Novo lançamento</button>}
      {mostrarForm && <NovoLancamentoForm onSalvar={salvar} documentos={documentos} contas={contas} />}
      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Data</th><th>Doc.</th><th>Histórico</th><th>Partidas</th><th className="num">Valor</th><th>Status</th></tr></thead>
            <tbody>
              {lancamentos.slice().reverse().map((l) => (
                <tr key={l.id}>
                  <td className="mono">{l.data}</td>
                  <td className="mono">{l.documento}</td>
                  <td>{l.historico}</td>
                  <td>{l.partidas.map((p, i) => <div key={i} className="mono" style={{ fontSize: 12 }}>{(p.tipo === "D" ? "D " : "C ") + p.conta}</div>)}</td>
                  <td className="num mono">{fmt(l.partidas.filter((p) => p.tipo === "D").reduce((s, p) => s + p.valor, 0))}</td>
                  <td><StatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
