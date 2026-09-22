import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { fmt } from "../../lib/contabil.js";

// NOTA DE PORTAGEM: no protótipo, os campos desta tela (selects de
// "CFOP está correto?", textarea de justificativa, botões "Enviar
// análise"/"Salvar rascunho") não tinham value/onChange nem onClick — era
// só um formulário visual, sem nenhum estado por trás. Aqui virou um
// formulário controlado de verdade, salvo em
// turmas/{turmaId}/alunos/{matricula}/analisesFiscais/{documentoId} — uma
// coleção que NÃO estava no documento de modelo de dados original; se
// quiserem manter o modelo em sincronia, adicionem essa subcoleção lá.

function blankAnalise() {
  return { cfopCorreto: "", cfopSugerido: "", ncmCorreto: "", cstCorreto: "", justificativa: "", status: "rascunho" };
}

export default function AnaliseFiscal({ turmaId, matricula, documentos }) {
  const [docSel, setDocSel] = useState(documentos[0]?.id || "");
  const docFiscal = documentos.find((d) => d.id === docSel);
  const [form, setForm] = useState(blankAnalise());
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState("");

  useEffect(() => {
    if (!turmaId || !matricula || !docSel) return;
    setSalvo("");
    const unsub = onSnapshot(doc(db, "turmas", turmaId, "alunos", matricula, "analisesFiscais", docSel), (snap) => {
      setForm(snap.exists() ? snap.data() : blankAnalise());
    });
    return unsub;
  }, [turmaId, matricula, docSel]);

  if (!docFiscal) {
    return (
      <>
        <div className="screen-eyebrow">05 · análise fiscal</div>
        <h2 className="screen-title">Análise fiscal do documento</h2>
        <div className="empty-state">Nenhum documento liberado para esta turma ainda.</div>
      </>
    );
  }

  function setField(field, value) { setForm({ ...form, [field]: value }); }

  async function salvar(status) {
    setSalvando(true);
    await setDoc(doc(db, "turmas", turmaId, "alunos", matricula, "analisesFiscais", docSel), {
      ...form, status, atualizadoEm: serverTimestamp(),
    });
    setSalvando(false);
    setSalvo(status === "enviado" ? "Análise enviada." : "Rascunho salvo.");
  }

  return (
    <>
      <div className="screen-eyebrow">05 · análise fiscal</div>
      <h2 className="screen-title">Análise fiscal do documento</h2>
      <p className="screen-sub">Antes de contabilizar, verifique se CFOP, NCM e CST estão corretos para esta operação. O sistema não indica a resposta certa.</p>
      <div className="panel">
        <div className="panel-head">
          <h3>Documento</h3>
          <select className="mono" style={{ padding: "6px 8px" }} value={docSel} onChange={(e) => setDocSel(e.target.value)}>
            {documentos.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}
          </select>
        </div>
        <div className="panel-body">
          <div className="grid-2">
            <div>
              <div className="field"><label>Natureza da operação</label><div>{docFiscal.natureza}</div></div>
              <div className="field"><label>CFOP informado no documento</label><div className="mono">{docFiscal.cfop}</div></div>
              <div className="field"><label>NCM / CST dos itens</label><div className="mono">{docFiscal.itens.map((i) => i.ncm + "/" + i.cst).join(", ")}</div></div>
            </div>
            <div>
              <div className="field"><label>Itens</label><div>{docFiscal.itens.map((i) => i.qtd + " " + i.unidade + " " + i.descricao).join("; ")}</div></div>
              <div className="field"><label>Valor total</label><div className="mono">R$ {fmt(docFiscal.valorTotal)}</div></div>
            </div>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "6px 0 16px 0" }} />
          <div className="grid-2">
            <div>
              <div className="field">
                <label>CFOP está correto?</label>
                <select value={form.cfopCorreto} onChange={(e) => setField("cfopCorreto", e.target.value)}>
                  <option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Não</option>
                </select>
              </div>
              <div className="field"><label>CFOP sugerido (se aplicável)</label><input className="mono" value={form.cfopSugerido} onChange={(e) => setField("cfopSugerido", e.target.value)} /></div>
            </div>
            <div>
              <div className="field">
                <label>NCM está correto?</label>
                <select value={form.ncmCorreto} onChange={(e) => setField("ncmCorreto", e.target.value)}>
                  <option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Não</option>
                </select>
              </div>
              <div className="field">
                <label>CST está correto?</label>
                <select value={form.cstCorreto} onChange={(e) => setField("cstCorreto", e.target.value)}>
                  <option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Não</option>
                </select>
              </div>
            </div>
          </div>
          <div className="field"><label>Justificativa / fonte utilizada na pesquisa</label><textarea value={form.justificativa} onChange={(e) => setField("justificativa", e.target.value)} /></div>
          <div className="btn-row">
            <button className="btn" disabled={salvando} onClick={() => salvar("enviado")}>Enviar análise</button>
            <button className="btn secondary" disabled={salvando} onClick={() => salvar("rascunho")}>Salvar rascunho</button>
          </div>
          {salvo && <div className="balance-check ok" style={{ marginTop: 10 }}>✓ {salvo}</div>}
        </div>
      </div>
    </>
  );
}
