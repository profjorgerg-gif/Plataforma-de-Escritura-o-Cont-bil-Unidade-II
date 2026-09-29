import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { fmt } from "../../lib/contabil.js";

// NOTA DE FUSÃO (2026-09-28): esta tela nasceu da junção de "Digitação da
// NF-e" e "Análise fiscal do documento", que eram duas telas separadas no
// menu. Elas nunca trocaram dados entre si (a Análise sempre leu o
// documento cadastrado pelo professor, nunca o que o aluno digitou aqui) —
// a única coisa que as ligava era o mesmo PDF de referência e a mesma
// sequência de estudo. Juntar numa tela só evita abrir/reler o mesmo PDF
// duas vezes e deixa a relação entre as duas etapas mais clara para o
// aluno. Por baixo, continuam sendo duas gravações independentes no
// Firestore — digitacoesNFe/{doc} e analisesFiscais/{doc} — então nada no
// checklist de progresso, na rubrica de nota ou na Classificação Contábil
// (que lê analisesFiscais para o aviso de coerência) precisou mudar.

function blankItemDigitacao() { return { codigo: "", descricao: "", ncm: "", cst: "", cfop: "", unidade: "", qtd: "", valorUnit: "" }; }

function blankDigitacao(docFiscal) {
  return {
    numero: "", serie: "", natureza: "", cfop: "", data: "",
    emitenteNome: "", emitenteDoc: "", emitenteEndereco: "",
    destinatarioNome: "", destinatarioDoc: "", destinatarioEndereco: "",
    itens: docFiscal.itens.length > 0 ? docFiscal.itens.map(blankItemDigitacao) : [blankItemDigitacao()],
    icmsValor: "", ipiValor: "", pisValor: "", cofinsValor: "", cbsValor: "", ibsValor: "",
    totalProdutos: "", desconto: "", frete: "", seguro: "", outras: "", total: "",
  };
}

function blankAnalise() {
  return { cfopCorreto: "", cfopSugerido: "", ncmCorreto: "", cstCorreto: "", justificativa: "", status: "rascunho" };
}

export default function DigitacaoAnaliseFiscal({ turmaId, matricula, documentos }) {
  const [docSel, setDocSel] = useState(documentos[0]?.id || "");
  const docFiscal = documentos.find((d) => d.id === docSel);

  // --- 1. digitação ---
  const [form, setForm] = useState(docFiscal ? blankDigitacao(docFiscal) : null);
  const [conferido, setConferido] = useState(null);
  const [salvandoDigitacao, setSalvandoDigitacao] = useState(false);
  const [salvoDigitacao, setSalvoDigitacao] = useState(false);

  // --- 2. análise fiscal ---
  const [analise, setAnalise] = useState(blankAnalise());
  const [salvandoAnalise, setSalvandoAnalise] = useState(false);
  const [salvoAnalise, setSalvoAnalise] = useState("");

  useEffect(() => {
    if (!turmaId || !matricula || !docSel || !docFiscal) return;
    setConferido(null); setSalvoDigitacao(false);
    const unsub = onSnapshot(doc(db, "turmas", turmaId, "alunos", matricula, "digitacoesNFe", docSel), (snap) => {
      setForm(snap.exists() ? snap.data() : blankDigitacao(docFiscal));
    });
    return unsub;
  }, [turmaId, matricula, docSel]);

  useEffect(() => {
    if (!turmaId || !matricula || !docSel) return;
    setSalvoAnalise("");
    const unsub = onSnapshot(doc(db, "turmas", turmaId, "alunos", matricula, "analisesFiscais", docSel), (snap) => {
      setAnalise(snap.exists() ? snap.data() : blankAnalise());
    });
    return unsub;
  }, [turmaId, matricula, docSel]);

  if (!docFiscal || !form) {
    return (
      <>
        <div className="screen-eyebrow">04 · digitação e análise fiscal</div>
        <h2 className="screen-title">Digitar e analisar a nota fiscal</h2>
        <div className="empty-state">Nenhum documento liberado para esta turma ainda.</div>
      </>
    );
  }

  function setField(field, value) { setForm({ ...form, [field]: value }); }
  function setItemField(i, field, value) {
    setForm({ ...form, itens: form.itens.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)) });
  }
  function addItem() { setForm({ ...form, itens: [...form.itens, blankItemDigitacao()] }); }
  function removeItem(i) { setForm({ ...form, itens: form.itens.filter((_, idx) => idx !== i) }); }

  const semGabarito = docFiscal.itens.length === 0 && !docFiscal.valorTotal;

  function conferir() {
    if (semGabarito) { setConferido({ semGabarito: true }); return; }
    const somaItens = form.itens.reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valorUnit) || 0), 0);
    const totalOk = Math.abs((Number(form.total) || 0) - docFiscal.valorTotal) < 0.02;
    const itensOk = Math.abs(somaItens - docFiscal.itens.reduce((s, i) => s + i.total, 0)) < 0.02;
    setConferido({ totalOk, itensOk });
  }

  async function salvarDigitacao() {
    setSalvandoDigitacao(true);
    await setDoc(doc(db, "turmas", turmaId, "alunos", matricula, "digitacoesNFe", docSel), { ...form, atualizadoEm: serverTimestamp() });
    setSalvandoDigitacao(false);
    setSalvoDigitacao(true);
  }

  function setAnaliseField(field, value) { setAnalise({ ...analise, [field]: value }); }

  async function salvarAnalise(status) {
    setSalvandoAnalise(true);
    await setDoc(doc(db, "turmas", turmaId, "alunos", matricula, "analisesFiscais", docSel), {
      ...analise, status, atualizadoEm: serverTimestamp(),
    });
    setSalvandoAnalise(false);
    setSalvoAnalise(status === "enviado" ? "Análise enviada." : "Rascunho salvo.");
  }

  return (
    <>
      <div className="screen-eyebrow">04 · digitação e análise fiscal</div>
      <h2 className="screen-title">Digitar e analisar a nota fiscal</h2>
      <p className="screen-sub">Abra o PDF disponibilizado pelo professor. Primeiro digite os dados da nota exatamente como emitidos; depois julgue se CFOP, NCM e CST estão corretos para essa operação. O sistema não indica a resposta certa em nenhuma das duas etapas.</p>

      <div className="panel">
        <div className="panel-head">
          <h3>Nota a trabalhar</h3>
          <select className="mono" style={{ padding: "6px 8px" }} value={docSel} onChange={(e) => setDocSel(e.target.value)}>
            {documentos.map((d) => <option key={d.id} value={d.id}>Nº {d.numero} — {d.direcao === "entrada" ? "Entrada" : "Saída"}</option>)}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>1. Digitação da NF-e</h3></div>
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
            <button className="btn" disabled={salvandoDigitacao} onClick={salvarDigitacao}>{salvandoDigitacao ? "Salvando…" : "Salvar digitação"}</button>
          </div>
          {salvoDigitacao && <div className="balance-check ok" style={{ marginTop: 10 }}>✓ digitação salva</div>}
          {conferido && conferido.semGabarito && (
            <div className="helper-note" style={{ marginTop: 10 }}>
              O professor ainda não cadastrou um gabarito para este documento — a conferência automática não está disponível. Digite com atenção conforme o PDF; seu professor vai revisar na correção.
            </div>
          )}
          {conferido && !conferido.semGabarito && (
            <div className={"balance-check " + (conferido.totalOk && conferido.itensOk ? "ok" : "bad")}>
              {conferido.itensOk ? "✓" : "✗"} soma dos itens · {conferido.totalOk ? "✓" : "✗"} valor total da nota
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>2. Análise fiscal</h3></div>
        <div className="panel-body">
          <div className="helper-note">Estes dados vêm do documento cadastrado pelo professor (o gabarito) — não do que você digitou acima. Julgue se estão corretos para esta operação; pesquise se tiver dúvida.</div>
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
                <select value={analise.cfopCorreto} onChange={(e) => setAnaliseField("cfopCorreto", e.target.value)}>
                  <option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Não</option>
                </select>
              </div>
              <div className="field"><label>CFOP sugerido (se aplicável)</label><input className="mono" value={analise.cfopSugerido} onChange={(e) => setAnaliseField("cfopSugerido", e.target.value)} /></div>
            </div>
            <div>
              <div className="field">
                <label>NCM está correto?</label>
                <select value={analise.ncmCorreto} onChange={(e) => setAnaliseField("ncmCorreto", e.target.value)}>
                  <option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Não</option>
                </select>
              </div>
              <div className="field">
                <label>CST está correto?</label>
                <select value={analise.cstCorreto} onChange={(e) => setAnaliseField("cstCorreto", e.target.value)}>
                  <option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Não</option>
                </select>
              </div>
            </div>
          </div>
          <div className="field"><label>Justificativa / fonte utilizada na pesquisa</label><textarea value={analise.justificativa} onChange={(e) => setAnaliseField("justificativa", e.target.value)} /></div>
          <div className="btn-row">
            <button className="btn" disabled={salvandoAnalise} onClick={() => salvarAnalise("enviado")}>Enviar análise</button>
            <button className="btn secondary" disabled={salvandoAnalise} onClick={() => salvarAnalise("rascunho")}>Salvar rascunho</button>
          </div>
          {salvoAnalise && <div className="balance-check ok" style={{ marginTop: 10 }}>✓ {salvoAnalise}</div>}
        </div>
      </div>
    </>
  );
}
