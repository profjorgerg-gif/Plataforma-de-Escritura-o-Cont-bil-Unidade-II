// Órgão fiscal didático — GERADOR DE NOTAS (fase 1 do projeto 2027.1, criado em 2026-10-20).
// Funções PURAS: não leem nem gravam nada no banco e ainda NÃO são usadas por nenhuma tela. O órgão é fictício e didático.
// O mesmo aluno (matrícula + semestre) sempre recebe as mesmas notas; outro aluno recebe outras.
// A nota gerada tem os mesmos campos do catálogo atual (documentosFiscais): numero, serie, direcao, natureza, cfop, data,
// emitente, destinatario, itens, impostos, totais, valorTotal; e campos novos: chave, protocolo, autorizadoEm, lote, problema, eventos, gabarito.
// Regras aprovadas pelo professor em 20/10/2026: ICMS 17% (SC); PIS 1,65% e COFINS 7,6% sobre (produtos − ICMS), cada valor arredondado
// a centavos; empresa no regime não cumulativo (PIS/COFINS das compras são crédito); CFOP 1102 (compra) e 5102 (venda); sem ST, IPI, frete ou desconto.

export const REGRAS = {
  uf: "SC", cUF: "42", icms: 0.17, pis: 0.0165, cofins: 0.076,
  cfopEntrada: "1102", cfopSaida: "5102",
  naturezaEntrada: "COMPRA PARA COMERCIALIZAÇÃO — INTERNA",
  naturezaSaida: "VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS — INTERNA",
};

// Seis produtos por perfil (NCM a validar pelo professor). min/max/passo = faixa do preço unitário de compra.
export const PERFIS = {
  papelaria: { nome: "Papelaria e material de escritório", produtos: [
    { codigo: "PAP001", descricao: "Caneta esferográfica (cx)", ncm: "96081000", unidade: "CX", min: 60, max: 110, passo: 5, qtd: [4, 20] },
    { codigo: "PAP002", descricao: "Papel A4 (resma)", ncm: "48025610", unidade: "RM", min: 20, max: 30, passo: 0.1, qtd: [10, 60] },
    { codigo: "PAP003", descricao: "Caderno universitário", ncm: "48202000", unidade: "UN", min: 12, max: 22, passo: 0.5, qtd: [20, 80] },
    { codigo: "PAP004", descricao: "Lápis preto (cx)", ncm: "96091000", unidade: "CX", min: 15, max: 35, passo: 0.5, qtd: [10, 40] },
    { codigo: "PAP005", descricao: "Pasta arquivo", ncm: "48203000", unidade: "UN", min: 4, max: 9, passo: 0.25, qtd: [30, 120] },
    { codigo: "PAP006", descricao: "Envelope (cx)", ncm: "48171000", unidade: "CX", min: 18, max: 40, passo: 0.5, qtd: [10, 40] },
  ] },
  informatica: { nome: "Informática", produtos: [
    { codigo: "INF001", descricao: "Mouse óptico", ncm: "84716053", unidade: "UN", min: 25, max: 55, passo: 0.5, qtd: [10, 50] },
    { codigo: "INF002", descricao: "Teclado USB", ncm: "84716052", unidade: "UN", min: 45, max: 95, passo: 0.5, qtd: [10, 40] },
    { codigo: "INF003", descricao: "Monitor 21\"", ncm: "85285220", unidade: "UN", min: 650, max: 950, passo: 10, qtd: [2, 10] },
    { codigo: "INF004", descricao: "Pen drive 64 GB", ncm: "85235110", unidade: "UN", min: 28, max: 60, passo: 0.5, qtd: [10, 60] },
    { codigo: "INF005", descricao: "Cabo HDMI", ncm: "85444200", unidade: "UN", min: 12, max: 30, passo: 0.5, qtd: [10, 60] },
    { codigo: "INF006", descricao: "Fonte para PC", ncm: "85044090", unidade: "UN", min: 120, max: 260, passo: 1, qtd: [4, 20] },
  ] },
  alimentos: { nome: "Alimentos e mercearia", produtos: [
    // Só itens com tributação normal: itens da cesta básica têm PIS/COFINS com alíquota zero e ICMS reduzido (versão futura).
    { codigo: "ALI001", descricao: "Açúcar cristal (fardo)", ncm: "17019900", unidade: "FD", min: 85, max: 130, passo: 1, qtd: [5, 30] },
    { codigo: "ALI002", descricao: "Café torrado (cx)", ncm: "09012100", unidade: "CX", min: 140, max: 240, passo: 1, qtd: [4, 20] },
    { codigo: "ALI003", descricao: "Biscoito (cx)", ncm: "19053100", unidade: "CX", min: 45, max: 90, passo: 0.5, qtd: [6, 40] },
    { codigo: "ALI004", descricao: "Macarrão (fardo)", ncm: "19021900", unidade: "FD", min: 38, max: 70, passo: 0.5, qtd: [6, 40] },
    { codigo: "ALI005", descricao: "Molho de tomate (cx)", ncm: "21032010", unidade: "CX", min: 40, max: 75, passo: 0.5, qtd: [6, 40] },
    { codigo: "ALI006", descricao: "Achocolatado (cx)", ncm: "18061000", unidade: "CX", min: 70, max: 130, passo: 0.5, qtd: [4, 30] },
  ] },
  vestuario: { nome: "Vestuário e calçados", produtos: [
    { codigo: "VES001", descricao: "Camiseta de malha", ncm: "61091000", unidade: "UN", min: 18, max: 45, passo: 0.5, qtd: [20, 100] },
    { codigo: "VES002", descricao: "Calça jeans", ncm: "62034200", unidade: "UN", min: 70, max: 150, passo: 0.5, qtd: [10, 50] },
    { codigo: "VES003", descricao: "Meia (dúzia)", ncm: "61159500", unidade: "DZ", min: 25, max: 55, passo: 0.5, qtd: [10, 50] },
    { codigo: "VES004", descricao: "Tênis", ncm: "64041900", unidade: "PR", min: 90, max: 220, passo: 1, qtd: [6, 30] },
    { codigo: "VES005", descricao: "Jaqueta", ncm: "62019300", unidade: "UN", min: 110, max: 260, passo: 1, qtd: [4, 20] },
    { codigo: "VES006", descricao: "Boné", ncm: "65050020", unidade: "UN", min: 15, max: 40, passo: 0.5, qtd: [10, 60] },
  ] },
};

// Empresas fictícias (nomes inventados; não correspondem a empresas reais)
const FORNECEDORES = ["Distribuidora Aurora Ltda", "Comercial Vale Verde Ltda", "Importadora Horizonte S.A.", "Atacado Ponte Nova Ltda", "Distribuidora Campo Alto Ltda", "Comercial Lagoa Azul Ltda", "Atacadista Pedra Branca Ltda", "Distribuidora Monte Claro Ltda"];
const CLIENTES = ["Mercado Bom Preço Ltda", "Comércio Casa Nova Ltda", "Loja Central do Vale Ltda", "Empório Três Rios Ltda", "Comercial Praça Verde Ltda", "Rede Boa Compra Ltda", "Varejo Porto Seco Ltda", "Magazine Alto da Serra Ltda"];

export const TIPOS_PROBLEMA = ["cancelada", "duplicada", "cfop", "destinatario"];

// ---- utilidades ----------------------------------------------------------------------------------------------------------
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const r2 = (v) => Math.round((Number(v) + 1e-9) * 100) / 100;
const pad = (n, t) => String(n).padStart(t, "0");
const inteiro = (r, a, b) => a + Math.floor(r() * (b - a + 1));

// CNPJ válido (dígitos verificadores reais). base: 8 dígitos; filial 0001.
export function cnpjComDV(base12) {
  const calc = (d) => { const pesos = d.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const s = d.split("").reduce((a, c, i) => a + Number(c) * pesos[i], 0); const r = s % 11; return r < 2 ? 0 : 11 - r; };
  const d1 = calc(base12); const d2 = calc(base12 + d1);
  return base12 + d1 + d2;
}
const novoCnpj = (r) => cnpjComDV(pad(inteiro(r, 10000000, 99999999), 8) + "0001");
export const formatarCnpj = (c) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

// Chave de acesso: cUF(2) AAMM(4) CNPJ(14) modelo(2) série(3) número(9) tpEmis(1) cNF(8) DV(1) = 44 dígitos
export function dvChave(c43) {
  let peso = 2, soma = 0;
  for (let i = c43.length - 1; i >= 0; i--) { soma += Number(c43[i]) * peso; peso = peso === 9 ? 2 : peso + 1; }
  const r = soma % 11; return r < 2 ? 0 : 11 - r;
}
export function montarChave({ cUF, data, cnpj, serie, numero, cNF }) {
  const aamm = data.slice(2, 4) + data.slice(5, 7);
  const c43 = cUF + aamm + cnpj + "55" + pad(serie, 3) + pad(numero, 9) + "1" + pad(cNF, 8);
  return c43 + dvChave(c43);
}
export function validarChave(chave) { return /^\d{44}$/.test(chave || "") && dvChave(chave.slice(0, 43)) === Number(chave[43]); }

function diasUteis(inicio, quantidade) {
  const out = []; const d = new Date(inicio + "T12:00:00Z");
  while (out.length < quantidade) { const w = d.getUTCDay(); if (w !== 0 && w !== 6) out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}
const somaDias = (data, n) => { const d = new Date(data + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ---- impostos de uma nota ------------------------------------------------------------------------------------------------
export function calcularTributos(totalProdutos) {
  const produtos = r2(totalProdutos);
  const icms = r2(produtos * REGRAS.icms);
  const base = r2(produtos - icms);
  return { produtos, icms, basePisCofins: base, pis: r2(base * REGRAS.pis), cofins: r2(base * REGRAS.cofins) };
}

function montarImpostos(t) {
  return {
    icms: { valor: t.icms, aliquota: REGRAS.icms * 100, base: t.produtos, contabilizado: true },
    ipi: { valor: 0, contabilizado: true },
    pis: { valor: t.pis, aliquota: REGRAS.pis * 100, base: t.basePisCofins, contabilizado: true },
    cofins: { valor: t.cofins, aliquota: REGRAS.cofins * 100, base: t.basePisCofins, contabilizado: true },
    cbs: { valor: 0, contabilizado: false }, ibs: { valor: 0, contabilizado: false },
  };
}

// ---- gerador do pacote ---------------------------------------------------------------------------------------------------
// opc: { nEntradas=12, nSaidas=12, nProblemas=4, inicio="2027-03-01", diasUteis=22, porLote=6, empresaNome, perfil }
export function gerarPacote(matricula, semestre = "2027.1", opc = {}) {
  const o = { nEntradas: 12, nSaidas: 12, nProblemas: 4, inicio: "2027-03-01", diasUteis: 22, porLote: 6, ...opc };
  const semente = String(matricula) + "|" + String(semestre);
  const r = rng(hash("orgao|" + semente));
  const chavesPerfil = Object.keys(PERFIS);
  const perfilKey = o.perfil && PERFIS[o.perfil] ? o.perfil : chavesPerfil[hash("perfil|" + semente) % chavesPerfil.length];
  const perfil = PERFIS[perfilKey];
  const empresa = { nome: o.empresaNome || "Empresa didática " + perfil.nome.split(" ")[0], cnpj: novoCnpj(rng(hash("cnpj|" + semente))), perfil: perfilKey, perfilNome: perfil.nome };

  const fornecedores = [0, 1, 2, 3].map(() => ({ nome: FORNECEDORES[inteiro(r, 0, FORNECEDORES.length - 1)], cnpj: novoCnpj(r) }));
  const clientes = [0, 1, 2, 3].map(() => ({ nome: CLIENTES[inteiro(r, 0, CLIENTES.length - 1)], cnpj: novoCnpj(r) }));

  // ordem das operações: entradas e saídas misturadas; nunca vende o que não tem em estoque
  const n = o.nEntradas + o.nSaidas;
  const tipos = [];
  for (let i = 0; i < o.nEntradas; i++) tipos.push("entrada");
  for (let i = 0; i < o.nSaidas; i++) tipos.push("saida");
  for (let i = tipos.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tipos[i], tipos[j]] = [tipos[j], tipos[i]]; }
  const prim = tipos.indexOf("entrada"); if (prim > 0) { [tipos[0], tipos[prim]] = [tipos[prim], tipos[0]]; }

  const datas = diasUteis(o.inicio, o.diasUteis);
  const picks = Array.from({ length: n }, () => datas[Math.floor(r() * datas.length)]).sort();
  const estoque = {}; const custo = {};
  const numeroBase = inteiro(r, 100000, 800000);
  const usados = new Set();
  const docs = [];

  for (let i = 0; i < n; i++) {
    let tipo = tipos[i];
    const disponiveis = perfil.produtos.filter((p) => (estoque[p.codigo] || 0) >= 2);
    if (tipo === "saida" && disponiveis.length === 0) { const j = tipos.indexOf("entrada", i + 1); if (j > i) { [tipos[i], tipos[j]] = [tipos[j], tipos[i]]; tipo = "entrada"; } }
    if (tipo === "saida" && disponiveis.length === 0) tipo = "entrada";
    const data = picks[i];
    const itens = [];
    const nItens = inteiro(r, 1, 3);
    const base = tipo === "entrada" ? perfil.produtos : disponiveis;
    const escolhidos = [...base].sort(() => r() - 0.5).slice(0, Math.min(nItens, base.length));
    for (const p of escolhidos) {
      let qtd, unit;
      if (tipo === "entrada") {
        const passos = Math.round((p.max - p.min) / p.passo);
        unit = r2(p.min + inteiro(r, 0, passos) * p.passo);
        qtd = inteiro(r, p.qtd[0], p.qtd[1]);
        estoque[p.codigo] = (estoque[p.codigo] || 0) + qtd; custo[p.codigo] = unit;
      } else {
        const disp = estoque[p.codigo]; qtd = Math.max(1, Math.min(disp, inteiro(r, 1, Math.max(1, Math.ceil(disp * 0.7)))));
        unit = r2((custo[p.codigo] || p.min) * (1.25 + Math.floor(r() * 36) / 100));
        estoque[p.codigo] = disp - qtd;
      }
      itens.push({ codigo: p.codigo, descricao: p.descricao, ncm: p.ncm, cst: "00", cfop: tipo === "entrada" ? REGRAS.cfopEntrada : REGRAS.cfopSaida, unidade: p.unidade, qtd, valorUnit: unit, total: r2(qtd * unit) });
    }
    const t = calcularTributos(itens.reduce((s, it) => s + it.total, 0));
    let numero = numeroBase + i * inteiro(r, 3, 40); while (usados.has(numero)) numero++; usados.add(numero);
    const parte = tipo === "entrada" ? fornecedores[inteiro(r, 0, 3)] : clientes[inteiro(r, 0, 3)];
    const emitente = tipo === "entrada" ? parte : empresa;
    const destinatario = tipo === "entrada" ? empresa : parte;
    const serie = "1";
    const chave = montarChave({ cUF: REGRAS.cUF, data, cnpj: emitente.cnpj, serie, numero, cNF: inteiro(r, 10000000, 99999999) });
    const hora = pad(inteiro(r, 8, 17), 2) + ":" + pad(inteiro(r, 0, 59), 2);
    docs.push({
      id: "og-" + String(semestre).replace(".", "") + "-" + String(matricula) + "-" + pad(i + 1, 2),
      origem: "orgao-fiscal", ordem: i + 1, lote: Math.floor(i / o.porLote) + 1,
      numero: String(numero), serie, tipo: "NF-e", direcao: tipo,
      natureza: tipo === "entrada" ? REGRAS.naturezaEntrada : REGRAS.naturezaSaida,
      cfop: tipo === "entrada" ? REGRAS.cfopEntrada : REGRAS.cfopSaida,
      data, chave, protocolo: "142" + data.slice(2, 4) + pad(hash("prot|" + semente + "|" + i) % 10000000000, 10), autorizadoEm: data + "T" + hora,
      emitente: { nome: emitente.nome, cnpj: emitente.cnpj }, destinatario: { nome: destinatario.nome, cnpj: destinatario.cnpj },
      itens, impostos: montarImpostos(t),
      totais: { produtos: t.produtos, desconto: 0, frete: 0, seguro: 0, outras: 0, total: t.produtos },
      valorTotal: t.produtos, completo: true,
      problema: null, eventos: [],
      gabarito: tipo === "entrada" ? { manifestacao: "confirmacao", contabilizar: true } : { manifestacao: null, contabilizar: true },
    });
  }

  // notas com problema (quantidade configurável; tipos sorteados sem repetir enquanto houver tipo livre)
  const extras = [];
  const livres = docs.map((d, i) => i).filter((i) => i > 0);
  const ordemTipos = [...TIPOS_PROBLEMA].sort(() => r() - 0.5);
  for (let k = 0; k < Math.min(o.nProblemas, livres.length); k++) {
    const tipoP = ordemTipos[k % ordemTipos.length];
    const candidatos = livres.filter((i) => tipoP === "destinatario" ? docs[i].direcao === "entrada" : true);
    if (candidatos.length === 0) continue;
    const idx = candidatos[Math.floor(r() * candidatos.length)];
    livres.splice(livres.indexOf(idx), 1);
    const d = docs[idx];
    if (tipoP === "cancelada") {
      d.problema = { tipo: "cancelada" };
      d.eventos = [{ tipo: "cancelamento", em: somaDias(d.data, 2), protocolo: "142" + d.data.slice(2, 4) + pad(hash("ev|" + semente + "|" + idx) % 10000000000, 10), justificativa: "Cancelamento por erro na emissão do documento." }];
      d.gabarito = { manifestacao: d.direcao === "entrada" ? "nao_realizada" : null, contabilizar: false };
    } else if (tipoP === "cfop") {
      const errado = d.direcao === "entrada" ? REGRAS.cfopSaida : REGRAS.cfopEntrada;
      const certo = d.cfop;
      d.problema = { tipo: "cfop", cfopCorreto: certo }; d.cfop = errado; d.itens = d.itens.map((it) => ({ ...it, cfop: errado }));
      d.gabarito = { manifestacao: d.direcao === "entrada" ? "ciencia" : null, contabilizar: true, observacao: "Registrar pela natureza real da operação e comunicar o emitente do CFOP incompatível." };
    } else if (tipoP === "destinatario") {
      const outro = { nome: CLIENTES[(hash("dest|" + semente + idx)) % CLIENTES.length], cnpj: novoCnpj(rng(hash("destcnpj|" + semente + idx))) };
      d.problema = { tipo: "destinatario" }; d.destinatario = outro;
      d.gabarito = { manifestacao: "desconhecimento", contabilizar: false };
    } else if (tipoP === "duplicada") {
      d.problema = { tipo: "duplicada", repetida: true };
      extras.push({ ...d, id: d.id + "-dup", ordem: docs.length + extras.length + 1, problema: { tipo: "duplicada", original: d.id }, eventos: [], gabarito: { manifestacao: null, contabilizar: false, observacao: "Documento já recebido: contabilizar uma vez só e justificar." } });
    }
  }
  const documentos = [...docs, ...extras];
  return { empresa, perfil: perfilKey, semestre, documentos, resumo: resumoDoPacote(documentos) };
}

export function resumoDoPacote(documentos) {
  const c = (f) => documentos.filter(f).length;
  return {
    total: documentos.length, entradas: c((d) => d.direcao === "entrada"), saidas: c((d) => d.direcao === "saida"),
    problemas: c((d) => d.problema && !d.problema.original), lotes: Math.max(0, ...documentos.map((d) => d.lote || 0)),
    valorEntradas: r2(documentos.filter((d) => d.direcao === "entrada" && !d.problema).reduce((s, d) => s + d.valorTotal, 0)),
    valorSaidas: r2(documentos.filter((d) => d.direcao === "saida" && !d.problema).reduce((s, d) => s + d.valorTotal, 0)),
  };
}

// ---- autoconferência: devolve a lista de inconsistências de uma nota gerada (vazia = tudo certo) --------------------------
export function conferirNota(d) {
  const e = [];
  const soma = r2(d.itens.reduce((s, it) => s + it.total, 0));
  if (Math.abs(soma - d.totais.produtos) > 0.001 || Math.abs(d.valorTotal - soma) > 0.001) e.push("total diferente da soma dos itens");
  d.itens.forEach((it) => { if (Math.abs(r2(it.qtd * it.valorUnit) - it.total) > 0.001) e.push("total do item " + it.codigo); });
  const t = calcularTributos(soma);
  if (Math.abs(t.icms - d.impostos.icms.valor) > 0.001) e.push("ICMS");
  if (Math.abs(t.pis - d.impostos.pis.valor) > 0.001) e.push("PIS");
  if (Math.abs(t.cofins - d.impostos.cofins.valor) > 0.001) e.push("COFINS");
  if (!validarChave(d.chave)) e.push("chave de acesso inválida");
  return e;
}

// ---- arquivo XML da nota (estilo NF-e, simplificado) e do evento ---------------------------------------------------------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => Number(v).toFixed(2);
export function nomeArquivo(d) { return "NFe_" + d.numero + ".xml"; }
export function gerarXml(d) {
  const itens = d.itens.map((it, i) => `    <det nItem="${i + 1}"><prod><cProd>${esc(it.codigo)}</cProd><xProd>${esc(it.descricao)}</xProd><NCM>${esc(it.ncm)}</NCM><CFOP>${esc(it.cfop)}</CFOP><uCom>${esc(it.unidade)}</uCom><qCom>${it.qtd}</qCom><vUnCom>${num(it.valorUnit)}</vUnCom><vProd>${num(it.total)}</vProd></prod></det>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe>
  <infNFe Id="NFe${d.chave}">
    <ide><nNF>${esc(d.numero)}</nNF><serie>${esc(d.serie)}</serie><natOp>${esc(d.natureza)}</natOp><dhEmi>${esc(d.autorizadoEm)}</dhEmi><tpNF>${d.direcao === "entrada" ? 0 : 1}</tpNF></ide>
    <emit><CNPJ>${esc(d.emitente.cnpj)}</CNPJ><xNome>${esc(d.emitente.nome)}</xNome></emit>
    <dest><CNPJ>${esc(d.destinatario.cnpj)}</CNPJ><xNome>${esc(d.destinatario.nome)}</xNome></dest>
${itens}
    <total><ICMSTot><vBC>${num(d.impostos.icms.base ?? d.totais.produtos)}</vBC><vICMS>${num(d.impostos.icms.valor)}</vICMS><vProd>${num(d.totais.produtos)}</vProd><vPIS>${num(d.impostos.pis.valor)}</vPIS><vCOFINS>${num(d.impostos.cofins.valor)}</vCOFINS><vNF>${num(d.valorTotal)}</vNF></ICMSTot></total>
  </infNFe>
  <protNFe><nProt>${esc(d.protocolo)}</nProt><dhRecbto>${esc(d.autorizadoEm)}</dhRecbto><cStat>100</cStat></protNFe>
</NFe>
`;
}
export function gerarXmlEvento(d, ev) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<evento>
  <chNFe>${esc(d.chave)}</chNFe>
  <tpEvento>${esc(ev.tipo)}</tpEvento>
  <dhEvento>${esc(ev.em)}</dhEvento>
  <nProt>${esc(ev.protocolo)}</nProt>
  <xJust>${esc(ev.justificativa)}</xJust>
</evento>
`;
}
