import { useState } from "react";
import JSZip from "jszip";
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useCatalogoDocumentos } from "../../hooks/useCatalogoDocumentos.js";
import { fmt } from "../../lib/contabil.js";

function blankItemDoc() { return { codigo: "", descricao: "", ncm: "", cst: "", cfop: "", unidade: "UN", qtd: "", valorUnit: "" }; }

function NovoDocumentoForm({ onCriar, onCancelar, idsExistentes, inicial }) {
  const [numero, setNumero] = useState(inicial?.numero || "");
  const [serie, setSerie] = useState("1");
  const [direcao, setDirecao] = useState(inicial?.direcao || "saida");
  const [natureza, setNatureza] = useState("");
  const [cfop, setCfop] = useState("");
  const [data, setData] = useState("");
  const [emitenteNome, setEmitenteNome] = useState("");
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [itens, setItens] = useState([blankItemDoc()]);
  const [icmsValor, setIcmsValor] = useState("");
  const [pisValor, setPisValor] = useState("");
  const [cofinsValor, setCofinsValor] = useState("");
  const [cbsValor, setCbsValor] = useState("");
  const [ibsValor, setIbsValor] = useState("");
  const [freteSeguroOutras, setFreteSeguroOutras] = useState("0");
  const [erro, setErro] = useState("");
  const editando = !!inicial?.idExistente;

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
            : "O PDF em si não é anexado aqui — o que você digita abaixo vira o gabarito contra o qual a digitação do aluno é conferida."}
        </div>
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
  const [editandoDoc, setEditandoDoc] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resumoImportacao, setResumoImportacao] = useState(null);

  async function toggleLiberado(docId, liberado) {
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
      <p className="screen-sub">Catálogo de NF-e didáticas. Cadastre um documento (ou importe vários via ZIP) e libere para a turma {turma.nome}.</p>

      {!criando && !editandoDoc && (
        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button className="btn" onClick={() => setCriando(true)}>+ Novo documento</button>
          <label className="btn secondary" style={{ cursor: "pointer" }}>
            {importando ? "Importando…" : "Importar ZIP de PDFs"}
            <input type="file" accept=".zip" style={{ display: "none" }} disabled={importando}
              onChange={(e) => { if (e.target.files[0]) importarZip(e.target.files[0]); e.target.value = ""; }} />
          </label>
        </div>
      )}

      {resumoImportacao && (
        <div className={"balance-check " + (resumoImportacao.erro ? "bad" : "ok")}>
          {resumoImportacao.erro || `${resumoImportacao.importados} documento(s) importado(s) como rascunho de ${resumoImportacao.total} PDF(s) no ZIP${resumoImportacao.ignorados ? " · " + resumoImportacao.ignorados + " ignorado(s)" : ""}. Complete os dados de cada um antes de liberar.`}
        </div>
      )}

      {criando && <NovoDocumentoForm idsExistentes={catalogo.map((d) => d.id)} onCancelar={() => setCriando(false)} onCriar={async (novo) => { await salvarDocumento(novo); setCriando(false); }} />}
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
              <thead><tr><th>Nota</th><th>Direção</th><th>Emitente/Destinatário</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {catalogo.map((d) => {
                  const liberado = (turma.documentosIds || []).includes(d.id);
                  return (
                    <tr key={d.id}>
                      <td className="mono">{d.numero ? "Nº " + d.numero : (d.arquivoNome || d.id)}</td>
                      <td>{d.direcao === "entrada" ? "Entrada" : "Saída"}</td>
                      <td>{(d.direcao === "entrada" ? d.emitente?.nome : d.destinatario?.nome) || "—"}</td>
                      <td>{!d.completo ? <span className="status enviado">aguardando dados</span> : <span className={"status " + (liberado ? "aprovado" : "rascunho")}>{liberado ? "liberado" : "não liberado"}</span>}</td>
                      <td>
                        {d.completo ? (
                          <button className={liberado ? "btn red" : "btn green"} onClick={() => toggleLiberado(d.id, liberado)}>{liberado ? "remover da turma" : "liberar para a turma"}</button>
                        ) : (
                          <button className="btn" onClick={() => setEditandoDoc(d)}>completar dados</button>
                        )}
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
