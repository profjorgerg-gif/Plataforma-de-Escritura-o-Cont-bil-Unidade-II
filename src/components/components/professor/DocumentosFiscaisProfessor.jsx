import { useState } from "react";
import JSZip from "jszip";
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useCatalogoDocumentos } from "../../hooks/useCatalogoDocumentos.js";
import { fmt } from "../../lib/contabil.js";

function blankItemDoc() { return { codigo: "", descricao: "", ncm: "", cst: "", cfop: "", unidade: "UN", qtd: "", valorUnit: "" }; }

// GABARITO POR IA — mesmo princípio já usado na Fila de correção: sem Cloud
// Function, sem custo, sem chave secreta. O sistema não lê o PDF sozinho —
// ele monta um prompt, o professor cola numa IA de sua própria conta
// (Claude.ai, ChatGPT etc.), anexando o PDF que já tem no computador, e cola
// o JSON de volta aqui. Os campos vêm todos editáveis antes de salvar, então
// um eventual erro de leitura da IA é sempre revisado por você antes de virar
// gabarito de verdade.
function montarPromptGabaritoIA(numero, direcao, arquivoNome) {
  return `Você vai extrair os dados de uma Nota Fiscal (NF-e) didática em PDF para eu usar como gabarito num sistema de ensino de Contabilidade Intermediária.

Anexe a este prompt o arquivo "${arquivoNome}" (NF-e nº ${numero}, ${direcao === "entrada" ? "entrada" : "saída"}) e devolva SOMENTE um JSON válido — sem texto antes ou depois, sem bloco de código — no formato exato abaixo. Preencha com os dados reais da nota, usando ponto como separador decimal (nunca vírgula):

{
  "serie": "1",
  "natureza": "texto da natureza da operação, exatamente como aparece na nota",
  "cfop": "0000",
  "data": "AAAA-MM-DD",
  "emitenteNome": "nome de quem emitiu a nota",
  "destinatarioNome": "nome de quem recebeu a nota",
  "itens": [
    { "descricao": "...", "ncm": "........", "cst": "..", "cfop": "0000", "unidade": "UN", "qtd": 0, "valorUnit": 0.00 }
  ],
  "impostos": { "icms": 0.00, "pis": 0.00, "cofins": 0.00, "cbs": 0.00, "ibs": 0.00 },
  "freteSeguroOutras": 0.00
}

Inclua um item em "itens" para cada produto da tabela "Dados dos produtos" da nota, na mesma ordem em que aparecem. Em "freteSeguroOutras", some frete + seguro + outras despesas mostrados nos totais da nota.`;
}

function aplicarJSONGabaritoIA(texto) {
  const limpo = texto.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const dados = JSON.parse(limpo);
  if (!Array.isArray(dados.itens) || dados.itens.length === 0) throw new Error("O JSON não trouxe nenhum item em \"itens\".");
  return dados;
}

// Modelos prontos para agilizar o cadastro de exercícios novos — só
// pré-preenchem natureza, CFOP e um item de exemplo (edite os NCM/CST/valores
// reais do exercício); o professor não precisa mais começar sempre do zero.
const MODELOS_DOCUMENTO = [
  {
    key: "venda", label: "Venda de mercadorias", direcao: "saida",
    natureza: "Venda de mercadorias", cfop: "5102",
    itens: [{ ...blankItemDoc(), descricao: "Mercadoria para revenda", cfop: "5102" }],
  },
  {
    key: "compra", label: "Compra de mercadorias", direcao: "entrada",
    natureza: "Compra de mercadorias para revenda", cfop: "1102",
    itens: [{ ...blankItemDoc(), descricao: "Mercadoria para revenda", cfop: "1102" }],
  },
  {
    key: "devolucao-venda", label: "Devolução de venda", direcao: "entrada",
    natureza: "Devolução de venda de mercadorias", cfop: "1202",
    itens: [{ ...blankItemDoc(), descricao: "Mercadoria devolvida pelo cliente", cfop: "1202" }],
  },
  {
    key: "devolucao-compra", label: "Devolução de compra", direcao: "saida",
    natureza: "Devolução de compra de mercadorias", cfop: "5202",
    itens: [{ ...blankItemDoc(), descricao: "Mercadoria devolvida ao fornecedor", cfop: "5202" }],
  },
];

function NovoDocumentoForm({ onCriar, onCancelar, idsExistentes, inicial }) {
  const [numero, setNumero] = useState(inicial?.numero || "");
  const [serie, setSerie] = useState("1");
  const [direcao, setDirecao] = useState(inicial?.direcao || "saida");
  const [natureza, setNatureza] = useState(inicial?.natureza || "");
  const [cfop, setCfop] = useState(inicial?.cfop || "");
  const [data, setData] = useState("");
  const [emitenteNome, setEmitenteNome] = useState("");
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [itens, setItens] = useState(inicial?.itens?.length ? inicial.itens.map((it) => ({ ...it })) : [blankItemDoc()]);
  const [icmsValor, setIcmsValor] = useState("");
  const [pisValor, setPisValor] = useState("");
  const [cofinsValor, setCofinsValor] = useState("");
  const [cbsValor, setCbsValor] = useState("");
  const [ibsValor, setIbsValor] = useState("");
  const [freteSeguroOutras, setFreteSeguroOutras] = useState("0");
  const [erro, setErro] = useState("");
  const [jsonIA, setJsonIA] = useState("");
  const [erroIA, setErroIA] = useState("");
  const [copiadoIA, setCopiadoIA] = useState(false);
  const editando = !!inicial?.idExistente;

  async function copiarPromptIA() {
    const prompt = montarPromptGabaritoIA(inicial.numero, inicial.direcao, inicial.arquivoNome);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiadoIA(true);
      setTimeout(() => setCopiadoIA(false), 3000);
    } catch (e) {
      window.prompt("Não copiou automaticamente — selecione e copie manualmente (Ctrl+C):", prompt);
    }
  }

  function aplicarJSON() {
    setErroIA("");
    try {
      const dados = aplicarJSONGabaritoIA(jsonIA);
      if (dados.serie) setSerie(String(dados.serie));
      if (dados.natureza) setNatureza(dados.natureza);
      if (dados.cfop) setCfop(String(dados.cfop));
      if (dados.data) setData(dados.data);
      if (direcao === "entrada" && dados.emitenteNome) setEmitenteNome(dados.emitenteNome);
      if (direcao === "saida" && dados.destinatarioNome) setDestinatarioNome(dados.destinatarioNome);
      setItens(dados.itens.map((it) => ({
        codigo: "", descricao: it.descricao || "", ncm: it.ncm || "", cst: it.cst || "",
        cfop: it.cfop ? String(it.cfop) : "", unidade: it.unidade || "UN",
        qtd: it.qtd ?? "", valorUnit: it.valorUnit ?? "",
      })));
      if (dados.impostos?.icms !== undefined) setIcmsValor(String(dados.impostos.icms));
      if (dados.impostos?.pis !== undefined) setPisValor(String(dados.impostos.pis));
      if (dados.impostos?.cofins !== undefined) setCofinsValor(String(dados.impostos.cofins));
      if (dados.impostos?.cbs !== undefined) setCbsValor(String(dados.impostos.cbs));
      if (dados.impostos?.ibs !== undefined) setIbsValor(String(dados.impostos.ibs));
      if (dados.freteSeguroOutras !== undefined) setFreteSeguroOutras(String(dados.freteSeguroOutras));
    } catch (e) {
      setErroIA("Não consegui ler esse JSON (" + e.message + "). Confira se colou a resposta completa e sem texto extra.");
    }
  }

  function updateItem(i, field, val) { setItens(itens.map((it, idx) => (idx === i ? { ...it, [field]: val } : it))); }
  function addItem() { setItens([...itens, blankItemDoc()]); }
  function removeItem(i) { setItens(itens.filter((_, idx) => idx !== i)); }

  const totalProdutos = itens.reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valorUnit) || 0), 0);
  const valorTotal = totalProdutos + (Number(freteSeguroOutras) || 0);

  function criar() {
    if (!numero.trim() || !cfop.trim() || itens.length === 0) { setErro("Preencha ao menos número, CFOP e um item."); return; }
    const id = editando ? inicial.idExistente : "NF-" + numero.trim();
    if (!editando && idsExistentes.includes(id)) { setErro("Já existe um documento com esse número."); return; }
    const itensCalc = itens.map((it) => ({ ...it, qtd: Number(it.qtd) || 0, valorUnit: Number(it.valorUnit) || 0, total: (Number(it.qtd) || 0) * (Number(it.valorUnit) || 0) }));
    onCriar({
      id, numero: numero.trim(), serie, tipo: "NF-e", direcao, natureza, cfop: cfop.trim(), data,
      emitente: { nome: direcao === "entrada" ? emitenteNome : "Empresa didática (turma)" },
      destinatario: { nome: direcao === "saida" ? destinatarioNome : "Empresa didática (turma)" },
      itens: itensCalc,
      impostos: {
        icms: { valor: Number(icmsValor) || 0, contabilizado: true }, ipi: { valor: 0, contabilizado: true },
        pis: { valor: Number(pisValor) || 0, contabilizado: true }, cofins: { valor: Number(cofinsValor) || 0, contabilizado: true },
        cbs: { valor: Number(cbsValor) || 0, contabilizado: false }, ibs: { valor: Number(ibsValor) || 0, contabilizado: false },
      },
      totais: { produtos: totalProdutos, desconto: 0, frete: Number(freteSeguroOutras) || 0, seguro: 0, outras: 0, total: valorTotal },
      transportador: { nome: "", cnpj: "", placaUf: "", volumes: "", pesoBrutoLiquido: "", freteContaDe: "" },
      valorTotal, completo: true, arquivoNome: inicial?.arquivoNome || null,
    });
  }

  return (
    <div className="panel">
      <div className="panel-head"><h3>{editando ? "Completar documento" : "Novo documento no catálogo"}</h3></div>
      <div className="panel-body">
        <div className="helper-note">
          {inicial?.arquivoNome
            ? "Importado do arquivo " + inicial.arquivoNome + " — o número e a direção vieram do nome do arquivo; confira e complete os demais campos olhando o PDF."
            : inicial?.natureza
              ? `Modelo "${inicial.natureza}" aplicado — natureza, CFOP e um item de exemplo já vieram preenchidos. Ajuste NCM/CST, quantidades e valores para o exercício real antes de salvar.`
              : "O PDF em si não é anexado aqui — o que você digita abaixo vira o gabarito contra o qual a digitação do aluno é conferida."}
        </div>

        {inicial?.arquivoNome && (
          <div className="panel" style={{ background: "var(--paper-deep)", marginBottom: 16 }}>
            <div className="panel-head"><h3>Gerar gabarito com IA (opcional)</h3></div>
            <div className="panel-body">
              <div className="helper-note">
                Copie o prompt, cole numa IA de sua própria conta (Claude.ai, ChatGPT etc.) e anexe o arquivo <b>{inicial.arquivoNome}</b> — o mesmo PDF que estava no ZIP. A IA devolve um JSON; cole a resposta abaixo e clique em "Aplicar". Todos os campos continuam editáveis para você revisar antes de salvar.
              </div>
              <div className="btn-row" style={{ marginTop: 10 }}>
                <button className="btn secondary" onClick={copiarPromptIA}>{copiadoIA ? "✓ copiado!" : "📋 Copiar prompt para IA"}</button>
                <a className="btn secondary" href="https://claude.ai" target="_blank" rel="noopener noreferrer">Abrir Claude.ai ↗</a>
                <a className="btn secondary" href="https://chatgpt.com" target="_blank" rel="noopener noreferrer">Abrir ChatGPT ↗</a>
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Colar aqui o JSON devolvido pela IA</label>
                <textarea rows={5} className="mono" value={jsonIA} onChange={(e) => setJsonIA(e.target.value)} placeholder='{"serie": "1", "natureza": "...", ...}' />
              </div>
              <div className="btn-row">
                <button className="btn" onClick={aplicarJSON} disabled={!jsonIA.trim()}>Aplicar dados extraídos</button>
              </div>
              {erroIA && <div className="balance-check bad" style={{ marginTop: 8 }}>{erroIA}</div>}
            </div>
          </div>
        )}

        <div className="grid-2">
          <div className="field"><label>Número</label><input className="mono" value={numero} onChange={(e) => setNumero(e.target.value)} disabled={editando} /></div>
          <div className="field"><label>Série</label><input className="mono" value={serie} onChange={(e) => setSerie(e.target.value)} /></div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Direção (do ponto de vista da empresa didática)</label>
            <select value={direcao} onChange={(e) => setDirecao(e.target.value)}><option value="entrada">Entrada</option><option value="saida">Saída</option></select>
          </div>
          <div className="field"><label>Data de emissão</label><input type="date" className="mono" value={data} onChange={(e) => setData(e.target.value)} /></div>
        </div>
        <div className="field"><label>Natureza da operação</label><input value={natureza} onChange={(e) => setNatureza(e.target.value)} /></div>
        <div className="field"><label>CFOP</label><input className="mono" value={cfop} onChange={(e) => setCfop(e.target.value)} /></div>
        {direcao === "entrada"
          ? <div className="field"><label>Emitente (fornecedor)</label><input value={emitenteNome} onChange={(e) => setEmitenteNome(e.target.value)} /></div>
          : <div className="field"><label>Destinatário (cliente)</label><input value={destinatarioNome} onChange={(e) => setDestinatarioNome(e.target.value)} /></div>}
        <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", color: "var(--ink-faint)" }}>Itens</label>
        <div style={{ marginTop: 8 }}>
          {itens.map((it, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 70px 70px 60px 70px 90px 24px", gap: 6, marginBottom: 6 }}>
              <input placeholder="Descrição" value={it.descricao} onChange={(e) => updateItem(i, "descricao", e.target.value)} />
              <input className="mono" placeholder="NCM" value={it.ncm} onChange={(e) => updateItem(i, "ncm", e.target.value)} />
              <input className="mono" placeholder="CST" value={it.cst} onChange={(e) => updateItem(i, "cst", e.target.value)} />
              <input className="mono" placeholder="CFOP" value={it.cfop} onChange={(e) => updateItem(i, "cfop", e.target.value)} />
              <input placeholder="Un." value={it.unidade} onChange={(e) => updateItem(i, "unidade", e.target.value)} />
              <input className="mono" placeholder="Qtd." type="number" value={it.qtd} onChange={(e) => updateItem(i, "qtd", e.target.value)} />
              <input className="mono" placeholder="V. unit." type="number" value={it.valorUnit} onChange={(e) => updateItem(i, "valorUnit", e.target.value)} />
              {itens.length > 1 ? <button className="remove-partida" onClick={() => removeItem(i)}>×</button> : <span />}
            </div>
          ))}
        </div>
        <button className="btn secondary" onClick={addItem}>+ adicionar item</button>
        <label style={{ display: "block", marginTop: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", color: "var(--ink-faint)" }}>Impostos e totais</label>
        <div className="grid-2" style={{ marginTop: 8 }}>
          <div>
            <div className="field"><label>ICMS — valor</label><input className="mono" type="number" value={icmsValor} onChange={(e) => setIcmsValor(e.target.value)} /></div>
            <div className="field"><label>PIS — valor</label><input className="mono" type="number" value={pisValor} onChange={(e) => setPisValor(e.target.value)} /></div>
            <div className="field"><label>COFINS — valor</label><input className="mono" type="number" value={cofinsValor} onChange={(e) => setCofinsValor(e.target.value)} /></div>
          </div>
          <div>
            <div className="field"><label>CBS — valor (informativo)</label><input className="mono" type="number" value={cbsValor} onChange={(e) => setCbsValor(e.target.value)} /></div>
            <div className="field"><label>IBS — valor (informativo)</label><input className="mono" type="number" value={ibsValor} onChange={(e) => setIbsValor(e.target.value)} /></div>
            <div className="field"><label>Frete + seguro + outras</label><input className="mono" type="number" value={freteSeguroOutras} onChange={(e) => setFreteSeguroOutras(e.target.value)} /></div>
          </div>
        </div>
        <div className="balance-check ok">Total dos produtos: {fmt(totalProdutos)} · Valor total da nota: {fmt(valorTotal)}</div>
        {erro && <div className="balance-check bad">{erro}</div>}
        <div className="btn-row">
          <button className="btn" onClick={criar}>{editando ? "Salvar documento completo" : "Adicionar ao catálogo"}</button>
          <button className="btn secondary" onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentosFiscaisProfessor({ turma }) {
  const catalogo = useCatalogoDocumentos();
  const [criando, setCriando] = useState(false);
  const [modeloInicial, setModeloInicial] = useState(null);
  const [editandoDoc, setEditandoDoc] = useState(null);

  function iniciarDeModelo(modelo) {
    setModeloInicial(modelo ? { direcao: modelo.direcao, natureza: modelo.natureza, cfop: modelo.cfop, itens: modelo.itens.map((it) => ({ ...it })) } : null);
    setCriando(true);
  }
  function cancelarCriacao() {
    setCriando(false);
    setModeloInicial(null);
  }
  const [importando, setImportando] = useState(false);
  const [resumoImportacao, setResumoImportacao] = useState(null);

  async function toggleLiberado(docId, liberado, completo) {
    if (!liberado && !completo) return; // trava: não libera documento sem gabarito completo
    await updateDoc(doc(db, "turmas", turma.id), {
      documentosIds: liberado ? arrayRemove(docId) : arrayUnion(docId),
    });
  }

  async function salvarDocumento(novo) {
    await setDoc(doc(db, "documentosFiscais", novo.id), novo);
  }

  async function importarZip(file) {
    setImportando(true); setResumoImportacao(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const pdfEntries = Object.values(zip.files).filter((f) => !f.dir && /\.pdf$/i.test(f.name));
      const idsAtuais = (catalogo || []).map((d) => d.id);
      let importados = 0, ignorados = 0;
      for (const entry of pdfEntries) {
        const nomeArquivo = entry.name.split("/").pop();
        const m = nomeArquivo.match(/NF[_-]?(ENTRADA|SAIDA)[_-]?(\d+)/i);
        const direcao = m ? (m[1].toUpperCase() === "ENTRADA" ? "entrada" : "saida") : "";
        const numero = m ? m[2] : "";
        const id = numero ? "NF-" + numero : "NF-IMPORT-" + Math.random().toString(36).slice(2, 8);
        if (idsAtuais.includes(id)) { ignorados++; continue; }
        await setDoc(doc(db, "documentosFiscais", id), {
          id, numero, serie: "1", tipo: "NF-e", direcao: direcao || "saida", natureza: "", cfop: "", data: "",
          emitente: { nome: "" }, destinatario: { nome: "" }, itens: [],
          impostos: { icms: { valor: 0 }, ipi: { valor: 0 }, pis: { valor: 0 }, cofins: { valor: 0 }, cbs: { valor: 0 }, ibs: { valor: 0 } },
          totais: { produtos: 0, desconto: 0, frete: 0, seguro: 0, outras: 0, total: 0 }, transportador: {}, valorTotal: 0,
          completo: false, arquivoNome: nomeArquivo,
        });
        importados++;
      }
      setResumoImportacao({ total: pdfEntries.length, importados, ignorados });
    } catch (e) {
      setResumoImportacao({ erro: "Não foi possível ler o arquivo ZIP." });
    }
    setImportando(false);
  }

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (catalogo === null) return <div className="empty-state">Carregando catálogo…</div>;

  return (
    <>
      <div className="screen-eyebrow">documentos fiscais</div>
      <h2 className="screen-title">Documentos disponibilizados</h2>
      <p className="screen-sub">Catálogo de NF-e didáticas. Cadastre um documento (ou importe vários via ZIP) e complete o gabarito (CFOP, itens, NCM/CST, valores) antes de liberar para a turma {turma.nome} — o aluno digita os dados no seu próprio formulário, em "Digitação e análise fiscal", mas a conferência automática da digitação e toda a etapa de Análise fiscal (CFOP/NCM/CST/valor que ele julga) dependem do gabarito que você cadastra aqui. Um documento sem gabarito completo não pode ser liberado.</p>

      {!criando && !editandoDoc && (
        <div className="btn-row" style={{ marginBottom: 8 }}>
          <button className="btn" onClick={() => iniciarDeModelo(null)}>+ Novo documento (em branco)</button>
          <label className="btn secondary" style={{ cursor: "pointer" }}>
            {importando ? "Importando…" : "Importar ZIP de PDFs"}
            <input type="file" accept=".zip" style={{ display: "none" }} disabled={importando}
              onChange={(e) => { if (e.target.files[0]) importarZip(e.target.files[0]); e.target.value = ""; }} />
          </label>
        </div>
      )}
      {!criando && !editandoDoc && (
        <div className="btn-row" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", alignSelf: "center" }}>ou começar de um modelo:</span>
          {MODELOS_DOCUMENTO.map((m) => (
            <button key={m.key} className="btn secondary" onClick={() => iniciarDeModelo(m)}>📄 {m.label}</button>
          ))}
        </div>
      )}

      {resumoImportacao && (
        <div className={"balance-check " + (resumoImportacao.erro ? "bad" : "ok")}>
          {resumoImportacao.erro || `${resumoImportacao.importados} documento(s) importado(s) de ${resumoImportacao.total} PDF(s) no ZIP${resumoImportacao.ignorados ? " · " + resumoImportacao.ignorados + " ignorado(s)" : ""}. Eles chegam sem gabarito — abra "preencher gabarito" em cada um (ou use o botão de IA) antes de liberar para a turma.`}
        </div>
      )}

      {criando && (
        <NovoDocumentoForm
          idsExistentes={catalogo.map((d) => d.id)}
          inicial={modeloInicial}
          onCancelar={cancelarCriacao}
          onCriar={async (novo) => { await salvarDocumento(novo); cancelarCriacao(); }}
        />
      )}
      {editandoDoc && (
        <NovoDocumentoForm
          key={editandoDoc.id}
          idsExistentes={catalogo.map((d) => d.id)}
          inicial={{ numero: editandoDoc.numero, direcao: editandoDoc.direcao, arquivoNome: editandoDoc.arquivoNome, idExistente: editandoDoc.id }}
          onCancelar={() => setEditandoDoc(null)}
          onCriar={async (atualizado) => { await salvarDocumento(atualizado); setEditandoDoc(null); }}
        />
      )}

      <div className="panel">
        <div className="panel-head"><h3>Catálogo — liberar para {turma.nome}</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          {catalogo.length === 0 ? <div className="empty-state">Nenhum documento cadastrado ainda.</div> : (
            <table>
              <thead><tr><th>Nota</th><th>Direção</th><th>Emitente/Destinatário</th><th>Gabarito</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {catalogo.map((d) => {
                  const liberado = (turma.documentosIds || []).includes(d.id);
                  return (
                    <tr key={d.id}>
                      <td className="mono">{d.numero ? "Nº " + d.numero : (d.arquivoNome || d.id)}</td>
                      <td>{d.direcao === "entrada" ? "Entrada" : "Saída"}</td>
                      <td>{(d.direcao === "entrada" ? d.emitente?.nome : d.destinatario?.nome) || "—"}</td>
                      <td>{d.completo ? <span className="tag-pill">preenchido</span> : <span className="status rascunho">sem gabarito — preencha antes de liberar</span>}</td>
                      <td><span className={"status " + (liberado ? "aprovado" : "rascunho")}>{liberado ? "liberado" : "não liberado"}</span></td>
                      <td>
                        <button
                          className={liberado ? "btn red" : "btn green"}
                          style={{ marginRight: 8 }}
                          disabled={!liberado && !d.completo}
                          title={!liberado && !d.completo ? "Preencha o gabarito antes de liberar este documento" : undefined}
                          onClick={() => toggleLiberado(d.id, liberado, d.completo)}
                        >
                          {liberado ? "remover da turma" : "liberar para a turma"}
                        </button>
                        <button className="btn secondary" onClick={() => setEditandoDoc(d)}>{d.completo ? "editar" : "preencher gabarito"}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
