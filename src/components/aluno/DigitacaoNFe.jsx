import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";

function blankDigitacao(docFiscal) {
  return {
    numero: "", serie: "", natureza: "", cfop: "", data: "",
    emitenteNome: "", emitenteDoc: "", emitenteEndereco: "",
    destinatarioNome: "", destinatarioDoc: "", destinatarioEndereco: "",
    itens: docFiscal.itens.map(() => ({ codigo: "", descricao: "", ncm: "", cst: "", cfop: "", unidade: "", qtd: "", valorUnit: "" })),
    icmsValor: "", ipiValor: "", pisValor: "", cofinsValor: "", cbsValor: "", ibsValor: "",
    totalProdutos: "", desconto: "", frete: "", seguro: "", outras: "", total: "",
  };
}

export default function DigitacaoNFe({ turmaId, matricula, documentos }) {
  const [docSel, setDocSel] = useState(documentos[0]?.id || "");
  const docFiscal = documentos.find((d) => d.id === docSel);
  const [form, setForm] = useState(docFiscal ? blankDigitacao(docFiscal) : null);
  const [conferido, setConferido] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!turmaId || !matricula || !docSel || !docFiscal) return;
    setConferido(null); setSalvo(false);
    const unsub = onSnapshot(doc(db, "turmas", turmaId, "alunos", matricula, "digitacoesNFe", docSel), (snap) => {
      setForm(snap.exists() ? snap.data() : blankDigitacao(docFiscal));
    });
    return unsub;
  }, [turmaId, matricula, docSel]);

  if (!docFiscal || !form) {
    return (
      <>
        <div className="screen-eyebrow">04 · digitação da nf-e</div>
        <h2 className="screen-title">Digitar nota fiscal</h2>
        <div className="empty-state">Nenhum documento liberado para esta turma ainda.</div>
      </>
    );
  }

  function setField(field, value) { setForm({ ...form, [field]: value }); }
  function setItemField(i, field, value) {
    setForm({ ...form, itens: form.itens.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)) });
  }
  function addItem() { setForm({ ...form, itens: [...form.itens, { codigo: "", descricao: "", ncm: "", cst: "", cfop: "", unidade: "", qtd: "", valorUnit: "" }] }); }
  function removeItem(i) { setForm({ ...form, itens: form.itens.filter((_, idx) => idx !== i) }); }

  function conferir() {
    const somaItens = form.itens.reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valorUnit) || 0), 0);
    const totalOk = Math.abs((Number(form.total) || 0) - docFiscal.valorTotal) < 0.02;
    const itensOk = Math.abs(somaItens - docFiscal.itens.reduce((s, i) => s + i.total, 0)) < 0.02;
    setConferido({ totalOk, itensOk });
  }

  async function salvar() {
    setSalvando(true);
    await setDoc(doc(db, "turmas", turmaId, "alunos", matricula, "digitacoesNFe", docSel), { ...form, atualizadoEm: serverTimestamp() });
    setSalvando(false);
    setSalvo(true);
  }

  return (
    <>
      <div className="screen-eyebrow">04 · digitação da nf-e</div>
      <h2 className="screen-title">Digitar nota fiscal</h2>
      <p className="screen-sub">Abra o PDF disponibilizado pelo professor e digite os dados da nota exatamente como emitidos. Esta digitação alimenta a análise fiscal e a classificação contábil seguintes.</p>
      <div className="panel">
        <div className="panel-head">
          <h3>Nota a digitar</h3>
          <select className="mono" style={{ padding: "6px 8px" }} value={docSel} onChange={(e) => setDocSel(e.target.value)}>
            {documentos.map((d) => <option key={d.id} value={d.id}>Nº {d.numero} — {d.direcao === "entrada" ? "Entrada" : "Saída"}</option>)}
          </select>
        </div>
        <div className="panel-body">
          <div className="helper-note">Os valores reais estão apenas no PDF que o professor disponibiliza fora do sistema. Aqui você digita o que enxerga no documento — o rascunho é salvo no Firestore assim que você clicar em salvar.</div>
          <div className="grid-2">
            <div className="field"><label>Número da nota</label><input className="mono" value={form.numero} onChange={(e) => setField("numero", e.target.value)} /></div>
            <div className="field"><label>Série</label><input className="mono" value={form.serie} onChange={(e) => setField("serie", e.target.value)} /></div>
          </div>
          <div className="field"><label>Natureza da operação</label><input value={form.natureza} onChange={(e) => setField("natureza", e.target.value)} /></div>
          <div className="grid-2">
            <div className="field"><label>CFOP</label><input className="mono" value={form.cfop} onChange={(e) => setField("cfop", e.target.value)} /></div>
            <div className="field"><label>Data de emissão</label><input type="date" className="mono" value={form.data} onChange={(e) => setField("data", e.target.value)} /></div>
          </div>
          <div className="grid-2">
            <div>
              <div className="field"><label>Emitente — nome</label><input value={form.emitenteNome} onChange={(e) => setField("emitenteNome", e.target.value)} /></div>
              <div className="field"><label>Emitente — CNPJ/IE</label><input className="mono" value={form.emitenteDoc} onChange={(e) => setField("emitenteDoc", e.target.value)} /></div>
            </div>
            <div>
              <div className="field"><label>Destinatário — nome</label><input value={form.destinatarioNome} onChange={(e) => setField("destinatarioNome", e.target.value)} /></div>
              <div className="field"><label>Destinatário — CNPJ/IE</label><input className="mono" value={form.destinatarioDoc} onChange={(e) => setField("destinatarioDoc", e.target.value)} /></div>
            </div>
          </div>
          <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", color: "var(--ink-faint)" }}>Itens</label>
          <div style={{ marginTop: 8 }}>
            {form.itens.map((it, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 70px 70px 60px 70px 90px 24px", gap: 6, marginBottom: 6 }}>
                <input placeholder="Descrição" value={it.descricao} onChange={(e) => setItemField(i, "descricao", e.target.value)} />
                <input className="mono" placeholder="NCM" value={it.ncm} onChange={(e) => setItemField(i, "ncm", e.target.value)} />
                <input className="mono" placeholder="CST" value={it.cst} onChange={(e) => setItemField(i, "cst", e.target.value)} />
                <input className="mono" placeholder="CFOP" value={it.cfop} onChange={(e) => setItemField(i, "cfop", e.target.value)} />
                <input placeholder="Un." value={it.unidade} onChange={(e) => setItemField(i, "unidade", e.target.value)} />
                <input className="mono" placeholder="Qtd." type="number" value={it.qtd} onChange={(e) => setItemField(i, "qtd", e.target.value)} />
                <input className="mono" placeholder="V. unit." type="number" value={it.valorUnit} onChange={(e) => setItemField(i, "valorUnit", e.target.value)} />
                <button className="remove-partida" onClick={() => removeItem(i)}>×</button>
              </div>
            ))}
          </div>
          <button className="btn secondary" style={{ marginTop: 2 }} onClick={addItem}>+ adicionar item</button>

          <label style={{ display: "block", marginTop: 18, fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", color: "var(--ink-faint)" }}>Impostos</label>
          <div className="grid-2" style={{ marginTop: 8 }}>
            <div>
              <div className="field"><label>ICMS — valor (contabilizado)</label><input className="mono" type="number" value={form.icmsValor} onChange={(e) => setField("icmsValor", e.target.value)} /></div>
              <div className="field"><label>PIS — valor (contabilizado)</label><input className="mono" type="number" value={form.pisValor} onChange={(e) => setField("pisValor", e.target.value)} /></div>
              <div className="field"><label>COFINS — valor (contabilizado)</label><input className="mono" type="number" value={form.cofinsValor} onChange={(e) => setField("cofinsValor", e.target.value)} /></div>
            </div>
            <div>
              <div className="field"><label>IPI — valor (contabilizado)</label><input className="mono" type="number" value={form.ipiValor} onChange={(e) => setField("ipiValor", e.target.value)} /></div>
              <div className="field"><label>CBS — valor (informativo, transição 2026)</label><input className="mono" type="number" value={form.cbsValor} onChange={(e) => setField("cbsValor", e.target.value)} /></div>
              <div className="field"><label>IBS — valor (informativo, transição 2026)</label><input className="mono" type="number" value={form.ibsValor} onChange={(e) => setField("ibsValor", e.target.value)} /></div>
            </div>
          </div>

          <label style={{ display: "block", marginTop: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", color: "var(--ink-faint)" }}>Totais</label>
          <div className="grid-2" style={{ marginTop: 8 }}>
            <div>
              <div className="field"><label>Total dos produtos</label><input className="mono" type="number" value={form.totalProdutos} onChange={(e) => setField("totalProdutos", e.target.value)} /></div>
              <div className="field"><label>Desconto</label><input className="mono" type="number" value={form.desconto} onChange={(e) => setField("desconto", e.target.value)} /></div>
            </div>
            <div>
              <div className="field"><label>Frete + seguro + outras</label><input className="mono" type="number" value={form.frete} onChange={(e) => setField("frete", e.target.value)} /></div>
              <div className="field"><label>Valor total da nota</label><input className="mono" type="number" value={form.total} onChange={(e) => setField("total", e.target.value)} /></div>
            </div>
          </div>

          <div className="btn-row">
            <button className="btn secondary" onClick={conferir}>Conferir digitação</button>
            <button className="btn" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar digitação"}</button>
          </div>
          {salvo && <div className="balance-check ok" style={{ marginTop: 10 }}>✓ digitação salva</div>}
          {conferido && (
            <div className={"balance-check " + (conferido.totalOk && conferido.itensOk ? "ok" : "bad")}>
              {conferido.itensOk ? "✓" : "✗"} soma dos itens · {conferido.totalOk ? "✓" : "✗"} valor total da nota
            </div>
          )}
        </div>
      </div>
    </>
  );
}
