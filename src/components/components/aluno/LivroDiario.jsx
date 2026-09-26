import { useState } from "react";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { fmt } from "../../lib/contabil.js";
import { StatusBadge } from "../shared/UI.jsx";

// Um lançamento com status "correcao" ou "rascunho" pode ser reaberto e
// reenviado — é o ciclo que faltava: aluno envia → professor devolve com
// observação → aluno corrige e reenvia → professor revê, e assim por
// diante até aprovar. "Aprovado" nunca é editável (trava por regra do
// Firestore também, não só aqui).
const EDITAVEIS = ["rascunho", "correcao"];

function NovoLancamentoForm({ onSalvar, onCancelar, documentos, contas, lancamentoExistente }) {
  const editando = !!lancamentoExistente;
  const [data, setData] = useState(lancamentoExistente?.data || "");
  const [documento, setDocumento] = useState(lancamentoExistente?.documento || "");
  const [historico, setHistorico] = useState(lancamentoExistente?.historico || "");
  const [partidas, setPartidas] = useState(
    lancamentoExistente?.partidas?.length ? lancamentoExistente.partidas.map((p) => ({ ...p })) : [{ conta: "", tipo: "D", valor: "" }, { conta: "", tipo: "C", valor: "" }]
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
        {editando && lancamentoExistente.status === "correcao" && lancamentoExistente.obsCorrecao && (
          <div className="balance-check bad" style={{ marginBottom: 16, display: "block" }}>
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
          <button className="btn secondary" disabled={salvando} onClick={() => salvar("rascunho")}>Salvar como rascunho</button>
          <button className="btn" disabled={!bate || !historico || salvando} onClick={() => salvar("enviado")}>
            {editando ? "Reenviar para análise do professor" : "Enviar para análise do professor"}
          </button>
          <button className="btn secondary" disabled={salvando} onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export default function LivroDiario({ turmaId, matricula, lancamentos, contas, documentos = [] }) {
  // null = fechado · "novo" = criando · objeto lançamento = editando aquele
  const [modoForm, setModoForm] = useState(null);
  const editando = modoForm && modoForm !== "novo" ? modoForm : null;

  async function salvarNovo(dados) {
    await addDoc(collection(db, "turmas", turmaId, "alunos", matricula, "lancamentos"), {
      ...dados,
      criadoEm: serverTimestamp(),
    });
    setModoForm(null);
  }

  async function salvarEdicao(id, dados) {
    await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula, "lancamentos", id), dados);
    setModoForm(null);
  }

  return (
    <>
      <div className="screen-eyebrow">08 · livro diário</div>
      <h2 className="screen-title">Livro Diário</h2>
      <p className="screen-sub">Registro cronológico dos fatos contábeis da sua empresa didática. Só é enviado para análise quando débitos e créditos coincidem.</p>
      {!modoForm && <button className="btn" style={{ marginBottom: 18 }} onClick={() => setModoForm("novo")}>+ Novo lançamento</button>}
      {modoForm === "novo" && (
        <NovoLancamentoForm onSalvar={salvarNovo} onCancelar={() => setModoForm(null)} documentos={documentos} contas={contas} />
      )}
      {editando && (
        <NovoLancamentoForm
          lancamentoExistente={editando}
          onSalvar={(dados) => salvarEdicao(editando.id, dados)}
          onCancelar={() => setModoForm(null)}
          documentos={documentos}
          contas={contas}
        />
      )}
      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Data</th><th>Doc.</th><th>Histórico</th><th>Partidas</th><th className="num">Valor</th><th>Status</th></tr></thead>
            <tbody>
              {lancamentos.slice().reverse().map((l) => {
                const podeEditar = EDITAVEIS.includes(l.status);
                return (
                  <tr
                    key={l.id}
                    className={podeEditar ? "clickable" : ""}
                    onClick={() => { if (podeEditar) setModoForm(l); }}
                  >
                    <td className="mono">{l.data}</td>
                    <td className="mono">{l.documento}</td>
                    <td>{l.historico}</td>
                    <td>{l.partidas.map((p, i) => <div key={i} className="mono" style={{ fontSize: 12 }}>{(p.tipo === "D" ? "D " : "C ") + p.conta}</div>)}</td>
                    <td className="num mono">{fmt(l.partidas.filter((p) => p.tipo === "D").reduce((s, p) => s + p.valor, 0))}</td>
                    <td>
                      <StatusBadge status={l.status} />
                      {l.status === "correcao" && (
                        <div className="helper-note" style={{ marginTop: 4, maxWidth: 260 }}>
                          {l.obsCorrecao || "Revisar lançamento."} <span style={{ textDecoration: "underline" }}>Clique para corrigir</span>
                        </div>
                      )}
                      {l.status === "rascunho" && (
                        <div className="helper-note" style={{ marginTop: 4 }}>Clique para editar</div>
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
