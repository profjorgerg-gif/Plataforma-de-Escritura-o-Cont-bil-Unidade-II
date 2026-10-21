// Conferência fiscal da nota recebida em XML (Laboratório 2027.1, fases 2 e 3). Funções puras: não leem nem gravam no banco.
// lerXml: transforma o arquivo em nota; camposDaNota: monta a lista de campos a conferir; avaliar: compara a conferência do aluno com o gabarito.
import { REGRAS, validarChave } from "./orgaoFiscal.js";

const r2 = (v) => Math.round((Number(v) + 1e-9) * 100) / 100;
const brl = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function analisar(texto, parse) {
  const p = parse ? parse(texto) : new DOMParser().parseFromString(texto, "application/xml");
  if (p.getElementsByTagName("parsererror").length) throw new Error("XML mal formado");
  return p;
}
const t = (el, tag) => { const x = el && el.getElementsByTagName(tag)[0]; return x ? (x.textContent || "").trim() : ""; };
const n = (v) => Number(String(v).replace(",", ".")) || 0;

export function ehEvento(texto) { return /<evento[\s>]/.test(texto) && !/<NFe[\s>]/.test(texto); }

export function lerEvento(texto, parse) {
  const p = analisar(texto, parse);
  const chave = t(p, "chNFe");
  if (!chave) throw new Error("Evento sem chave de acesso");
  return { chave, tipo: t(p, "tpEvento"), em: t(p, "dhEvento"), protocolo: t(p, "nProt"), justificativa: t(p, "xJust") };
}

export function lerXml(texto, parse) {
  const p = analisar(texto, parse);
  const inf = p.getElementsByTagName("infNFe")[0];
  if (!inf) throw new Error("Não é uma NF-e (falta infNFe)");
  const id = inf.getAttribute("Id") || "";
  const chave = id.replace(/^NFe/, "");
  const emit = inf.getElementsByTagName("emit")[0], dest = inf.getElementsByTagName("dest")[0], tot = inf.getElementsByTagName("ICMSTot")[0];
  if (!emit || !dest || !tot) throw new Error("NF-e incompleta (emitente, destinatário ou totais)");
  const itens = Array.from(inf.getElementsByTagName("det")).map((d) => ({
    codigo: t(d, "cProd"), descricao: t(d, "xProd"), ncm: t(d, "NCM"), cfop: t(d, "CFOP"), unidade: t(d, "uCom"),
    qtd: n(t(d, "qCom")), valorUnit: n(t(d, "vUnCom")), total: n(t(d, "vProd")),
  }));
  if (!itens.length) throw new Error("NF-e sem itens");
  return {
    numero: t(inf, "nNF"), serie: t(inf, "serie"), natureza: t(inf, "natOp"), emissao: t(inf, "dhEmi"), direcao: t(inf, "tpNF") === "0" ? "entrada" : "saida",
    chave, protocolo: t(p, "nProt"),
    emitente: { cnpj: t(emit, "CNPJ"), nome: t(emit, "xNome") }, destinatario: { cnpj: t(dest, "CNPJ"), nome: t(dest, "xNome") },
    itens, base: n(t(tot, "vBC")), icms: n(t(tot, "vICMS")), produtos: n(t(tot, "vProd")), pis: n(t(tot, "vPIS")), cofins: n(t(tot, "vCOFINS")), total: n(t(tot, "vNF")),
  };
}

const fmtCnpj = (c) => String(c).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

// nota: resultado de lerXml; ctx: { cnpjEmpresa, evento, copiaDe } (evento = cancelamento recebido; copiaDe = arquivo original quando a chave já foi recebida)
export function camposDaNota(nota, ctx = {}) {
  const soma = r2(nota.itens.reduce((s, i) => s + i.total, 0));
  const icmsRef = r2(soma * REGRAS.icms), base = r2(soma - icmsRef);
  const pisRef = r2(base * REGRAS.pis), cofRef = r2(base * REGRAS.cofins);
  const empresa = ctx.cnpjEmpresa ? "sua empresa (CNPJ " + fmtCnpj(ctx.cnpjEmpresa) + ")" : "a sua empresa";
  const L = [];
  L.push({ key: "emitente", label: "Emitente", valor: nota.emitente.nome + " · " + fmtCnpj(nota.emitente.cnpj), ref: nota.direcao === "saida" ? "Emitente da venda deve ser " + empresa : "Fornecedor da operação" });
  L.push({ key: "destinatario", label: "Destinatário", valor: nota.destinatario.nome + " · " + fmtCnpj(nota.destinatario.cnpj), ref: nota.direcao === "entrada" ? "Destinatário da compra deve ser " + empresa : "Cliente da operação" });
  const dvOk = validarChave(nota.chave), cnpjChave = nota.chave.slice(6, 20);
  L.push({ key: "chave", label: "Chave e protocolo", valor: nota.chave.replace(/(\d{4})(?=\d)/g, "$1 ") + " · prot. " + nota.protocolo, ref: "44 dígitos · dígito verificador " + (dvOk ? "válido" : "INVÁLIDO") + " · CNPJ da chave " + (cnpjChave === nota.emitente.cnpj ? "igual ao do emitente" : "DIFERENTE do emitente") });
  L.push({ key: "natureza_cfop", label: "Natureza × CFOP", valor: nota.natureza + " · CFOP " + [...new Set(nota.itens.map((i) => i.cfop))].join("/"), ref: "Operação interna dentro de " + REGRAS.uf + ": CFOP " + REGRAS.cfopEmitente + " no arquivo (do emitente)" });
  nota.itens.forEach((i) => L.push({ key: "ncm:" + i.codigo, label: "NCM · " + i.descricao, valor: i.ncm, ref: "Confira na Consulta CFOP/NCM se corresponde ao produto" }));
  L.push({ key: "icms", label: "ICMS", valor: brl(nota.icms), ref: "17% de " + brl(soma) + " = " + brl(icmsRef) });
  L.push({ key: "pis", label: "PIS", valor: brl(nota.pis), ref: "1,65% de " + brl(base) + " = " + brl(pisRef) + " (base sem ICMS)" });
  L.push({ key: "cofins", label: "COFINS", valor: brl(nota.cofins), ref: "7,6% de " + brl(base) + " = " + brl(cofRef) + " (base sem ICMS)" });
  L.push({ key: "total", label: "Total da nota", valor: brl(nota.total), ref: "Soma dos itens = " + brl(soma) });
  if (ctx.evento) L.push({ key: "cancelamento", label: "Evento recebido", valor: "Cancelamento em " + String(ctx.evento.em).slice(0, 10).split("-").reverse().join("/") + " · " + ctx.evento.justificativa, ref: "Nota cancelada pelo emitente não se contabiliza" });
  if (ctx.copiaDe) L.push({ key: "duplicidade", label: "Chave repetida", valor: "Mesma chave do arquivo " + ctx.copiaDe, ref: "Cada chave de acesso entra uma vez só" });
  return L;
}

// marcas = { campo: "ok" | "div" }; gabarito = { decisao, divergencias[], cfopEntrada? }
export function avaliar(gab, marcas, decisao, cfopEntrada, direcao) {
  const dv = (gab && gab.divergencias) || [];
  const errados = [], falsos = [];
  Object.keys(marcas || {}).forEach((k) => {
    const marcouDiv = marcas[k] === "div", ehDiv = dv.includes(k);
    if (ehDiv && !marcouDiv) errados.push(k);
    if (!ehDiv && marcouDiv) falsos.push(k);
  });
  dv.forEach((k) => { if (!(k in (marcas || {})) && !errados.includes(k)) errados.push(k); });
  const decOk = !!gab && decisao === gab.decisao;
  const cfopOk = !(gab && decOk && decisao !== "rejeitar" && direcao === "entrada") || cfopEntrada === (gab.cfopEntrada || REGRAS.cfopEntrada);
  return { decOk, camposOk: !errados.length && !falsos.length, errados, falsos, cfopOk, ok: decOk && !errados.length && !falsos.length && cfopOk };
}
