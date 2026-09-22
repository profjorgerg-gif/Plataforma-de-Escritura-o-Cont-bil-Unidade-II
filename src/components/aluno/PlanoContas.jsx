import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { GRUPO_INFO, naturezaDe, destinoDe } from "../../data/planoContasOficial.js";

function NovaContaForm({ onCriar, onCancelar, codigosExistentes }) {
  const [grupo, setGrupo] = useState(1);
  const [subgrupo, setSubgrupo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [redutora, setRedutora] = useState(false);
  const [erro, setErro] = useState("");

  function criar() {
    if (!codigo.trim() || !nome.trim() || !subgrupo.trim()) { setErro("Preencha código, subgrupo e nome."); return; }
    if (codigosExistentes.includes(codigo.trim())) { setErro("Já existe uma conta com esse código."); return; }
    onCriar({
      codigo: codigo.trim(), nome: nome.trim(), grupo: Number(grupo), subgrupo: subgrupo.trim(), redutora,
      natureza: naturezaDe(Number(grupo), redutora), destino: destinoDe(Number(grupo)),
    });
  }

  return (
    <div className="panel">
      <div className="panel-head"><h3>Nova conta</h3></div>
      <div className="panel-body">
        <div className="grid-2">
          <div className="field">
            <label>Grupo</label>
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              {Object.entries(GRUPO_INFO).map(([n, info]) => <option key={n} value={n}>{n} — {info.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Código</label>
            <input className="mono" placeholder="ex.: 1.1.3.10" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Subgrupo (classificação dentro do grupo)</label>
          <input value={subgrupo} onChange={(e) => setSubgrupo(e.target.value)} placeholder="ex.: Estoques" />
        </div>
        <div className="field">
          <label>Nome da conta</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Source Serif 4', serif", fontSize: 14, color: "var(--ink)" }}>
            <input type="checkbox" checked={redutora} onChange={(e) => setRedutora(e.target.checked)} style={{ width: "auto" }} />
            Conta redutora (natureza inversa ao grupo)
          </label>
        </div>
        <div className="helper-note">
          Natureza e demonstração são sugeridas automaticamente pelo grupo: {naturezaDe(Number(grupo), redutora)} · {destinoDe(Number(grupo))}.
        </div>
        {erro && <div className="balance-check bad">{erro}</div>}
        <div className="btn-row">
          <button className="btn" onClick={criar}>Criar conta</button>
          <button className="btn secondary" onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export default function PlanoContas({ contas, papel }) {
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  const filtradas = contas.filter((c) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return c.codigo.toLowerCase().includes(q) || c.nome.toLowerCase().includes(q) || c.subgrupo.toLowerCase().includes(q);
  });

  async function criarConta(nova) {
    setErroSalvar("");
    try {
      // codigo é o id do documento — mesma convenção usada no seed.
      await setDoc(doc(db, "planoContas", nova.codigo), nova);
      setCriando(false);
    } catch (e) {
      setErroSalvar("Não foi possível salvar a conta agora. Tente de novo.");
    }
  }

  return (
    <>
      <div className="screen-eyebrow">06 · plano de contas</div>
      <h2 className="screen-title">Plano de Contas</h2>
      <p className="screen-sub">Classificação oficial da escola (CEDUP Hermann Hering). Selecionar a conta correta é parte do exercício — o sistema não sugere automaticamente.</p>
      <div className="grid-2" style={{ alignItems: "end", marginBottom: 16 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Buscar por código, nome ou subgrupo</label>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="ex.: mercadorias, 4.1, tributos" />
        </div>
        {papel === "professor" && !criando && (
          <div><button className="btn" onClick={() => setCriando(true)}>+ Nova conta</button></div>
        )}
      </div>
      {erroSalvar && <div className="balance-check bad" style={{ marginBottom: 14 }}>{erroSalvar}</div>}
      {criando && (
        <NovaContaForm
          codigosExistentes={contas.map((c) => c.codigo)}
          onCancelar={() => setCriando(false)}
          onCriar={criarConta}
        />
      )}
      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Código</th><th>Conta</th><th>Grupo</th><th>Subgrupo</th><th>Natureza</th><th>Demonstração</th></tr></thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.codigo}>
                  <td className="mono">{c.codigo}</td>
                  <td>{c.nome}</td>
                  <td>{GRUPO_INFO[c.grupo].nome}</td>
                  <td>{c.subgrupo}</td>
                  <td>{c.natureza === "devedora" ? "Devedora" : "Credora"}</td>
                  <td><span className="tag-pill">{c.destino}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtradas.length === 0 && <div className="empty-state">Nenhuma conta encontrada.</div>}
        </div>
      </div>
    </>
  );
}
