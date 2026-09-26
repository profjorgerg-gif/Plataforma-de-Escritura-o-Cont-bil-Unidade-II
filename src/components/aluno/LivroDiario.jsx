import { useState } from "react";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { fmt } from "../../lib/contabil.js";
import { StatusBadge } from "../shared/UI.jsx";

// Status em que o próprio aluno ainda pode editar o lançamento:
// - rascunho: nunca foi enviado
// - correcao: o professor devolveu para ajustes
const EDITAVEIS = ["rascunho", "correcao"];

function NovoLancamentoForm({ onSalvar, onCancelar, documentos, contas, lancamentoExistente }) {
  const editando = !!lancamentoExistente;
  const [data, setData] = useState(lancamentoExistente?.data || "");
  const [documento, setDocumento] = useState(lancamentoExistente?.documento || "");
  const [historico, setHistorico] = useState(lancamentoExistente?.historico || "");
  const [partidas, setPartidas] = useState(
    lancamentoExistente?.partidas?.length
      ? lancamentoExistente.partidas.map((p) => ({ ...p }))
      : [{ conta: "", tipo: "D", valor: "" }, { conta: "", tipo: "C", valor: "" }]
  );
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
      <div className="panel-head"><h3>{editando ? "Editar lançamento" : "Novo lançamento"}</h3></div>
      <div className="panel-body">
        {editando && lancamentoExistente.historicoCorrecoes?.length > 0 && (
          <div className="helper-note" style={{ marginBottom: 14, borderColor: "var(--red)" }}>
            <b>Histórico de correções deste lançamento ({lancamentoExistente.historicoCorrecoes.length}):</b>
            <ol style={{ margin: "6px 0 0 18px", padding: 0 }}>
              {lancamentoExistente.historicoCorrecoes.map((h, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    {new Date(h.em).toLocaleString("pt-BR")}
                  </span>
                  {" — "}{h.obs}
                </li>
              ))}
            </ol>
          </div>
        )}
        {editando && lancamentoExistente.status === "correcao" && !lancamentoExistente.historicoCorrecoes?.length && lancamentoExistente.obsCorrecao && (
          <div className="helper-note" style={{ marginBottom: 14, borderColor: "var(--red)" }}>
            <b>Observação do professor:</b> {lancamentoExistente.obsCorrecao}
          </div>
        )}
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
          {editando && <button className="btn secondary" disabled={salvando} onClick={onCancelar}>Cancelar</button>}
          <button className="btn secondary" disabled={salvando} onClick={() => salvar("rascunho")}>Salvar como rascunho</button>
          <button className="btn" disabled={!bate || !historico || salvando} onClick={() => salvar("enviado")}>
            {editando ? "Reenviar para análise do professor" : "Enviar para análise do professor"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LivroDiario({ turmaId, matricula, lancamentos, contas, documentos = [] }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null); // lançamento sendo editado, ou null = novo

  async function salvar(novo) {
    if (editando) {
      await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula, "lancamentos", editando.id), novo);
    } else {
      await addDoc(collection(db, "turmas", turmaId, "alunos", matricula, "lancamentos"), {
        ...novo,
        criadoEm: serverTimestamp(),
      });
    }
    setMostrarForm(false);
    setEditando(null);
  }

  function abrirNovo() {
    setEditando(null);
    setMostrarForm(true);
  }

  function abrirEdicao(l) {
    setEditando(l);
    setMostrarForm(true);
  }

  function cancelar() {
    setMostrarForm(false);
    setEditando(null);
  }

  return (
    <>
      <div className="screen-eyebrow">08 · livro diário</div>
      <h2 className="screen-title">Livro Diário</h2>
      <p className="screen-sub">Registro cronológico dos fatos contábeis da sua empresa didática. Só é enviado para análise quando débitos e créditos coincidem.</p>
      {!mostrarForm && <button className="btn" style={{ marginBottom: 18 }} onClick={abrirNovo}>+ Novo lançamento</button>}
      {mostrarForm && (
        <NovoLancamentoForm
          onSalvar={salvar}
          onCancelar={cancelar}
          documentos={documentos}
          contas={contas}
          lancamentoExistente={editando}
        />
      )}
      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Data</th><th>Doc.</th><th>Histórico</th><th>Partidas</th><th className="num">Valor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {lancamentos.slice().reverse().map((l) => {
                const editavel = EDITAVEIS.includes(l.status);
                return (
                  <tr key={l.id}>
                    <td className="mono">{l.data}</td>
                    <td className="mono">{l.documento}</td>
                    <td>{l.historico}</td>
                    <td>{l.partidas.map((p, i) => <div key={i} className="mono" style={{ fontSize: 12 }}>{(p.tipo === "D" ? "D " : "C ") + p.conta}</div>)}</td>
                    <td className="num mono">{fmt(l.partidas.filter((p) => p.tipo === "D").reduce((s, p) => s + p.valor, 0))}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>
                      {editavel && (
                        <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => abrirEdicao(l)}>
                          ✏️ Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
