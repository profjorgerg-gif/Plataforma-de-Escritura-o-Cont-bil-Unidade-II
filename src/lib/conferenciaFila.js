// Conferência automática dos lançamentos da Fila (só sugere; quem decide é o professor).
// Regras conservadoras: só marca ✅ ou ❌ quando há certeza pelo gabarito da nota.
// O que não dá para conferir fica "sem" (⚪) e não entra nos botões em bloco.
const ICMS = ["2.1.8.04", "4.2.01", "1.1.2.11", "1.1.2.12"];
const PIS = ["2.1.8.05", "1.1.2.14", "2.1.8.07"];
const COFINS = ["2.1.8.06", "1.1.2.15", "2.1.8.08"];
const PISCOFINS_VENDA = ["4.2.02"];
const DESC_SAIDA = "4.2.04";
const DESC_ENTRADA = "4.3.03";
const iguais = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.02;
const brl = (v) => "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function gab(doc) {
  const imp = doc.impostos || {};
  const itens = (doc.itens || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
  return {
    icms: Number(imp.icms?.valor) || 0, pis: Number(imp.pis?.valor) || 0, cofins: Number(imp.cofins?.valor) || 0,
    total: Number(doc.valorTotal) || 0, produtos: Number(doc.totais?.produtos) || itens, itens,
    desconto: Number(doc.totais?.desconto) || 0, direcao: doc.direcao,
    ipi: Number(imp.ipi?.valor) || 0,
    texto: [doc.natureza, doc.naturezaOperacao, doc.descricao, doc.operacao].filter(Boolean).join(" "),
  };
}

// partidas -> tipos presentes (venda, icms, pis, cofins, pisCofins, desconto)
export function tiposDoLancamento(l) {
  const t = new Set();
  (l.partidas || []).forEach((p) => {
    const c = String(p.conta);
    if (c.startsWith("4.1.1.")) t.add("venda");
    else if (ICMS.includes(c)) t.add("icms");
    else if (PIS.includes(c)) t.add("pis");
    else if (COFINS.includes(c)) t.add("cofins");
    else if (PISCOFINS_VENDA.includes(c)) t.add("pisCofins");
    else if (c === DESC_SAIDA || c === DESC_ENTRADA) t.add("desconto");
    // 2026-10-15 — compra principal: débito em estoque (1.1.3.*) ou crédito em Fornecedores/Duplicatas a Pagar (2.1.1.*)
    if ((p.tipo === "D" && c.startsWith("1.1.3.")) || (p.tipo === "C" && c.startsWith("2.1.1."))) t.add("compra");
  });
  return [...t].sort();
}

// pontuação para escolher qual duplicata fica: 0 = bate com o total da nota
function pontoVenda(l, g) {
  const v = (l.partidas || []).filter((p) => String(p.conta).startsWith("4.1.1.")).reduce((s, p) => s + (Number(p.valor) || 0), 0);
  if (iguais(v, g.total)) return 0;
  if (iguais(v, g.produtos) || iguais(v, g.itens)) return 1;
  return 2;
}

function valorDaConta(l, contas) {
  // um lançamento tem débito e crédito do mesmo valor (ex.: D ICMS sobre Vendas / C ICMS a recolher):
  // conta-se UM lado só (o maior), senão o valor sai dobrado.
  const ps = (l.partidas || []).filter((p) => contas.includes(String(p.conta)));
  const d = ps.filter((p) => p.tipo === "D").reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const c = ps.filter((p) => p.tipo === "C").reduce((s, p) => s + (Number(p.valor) || 0), 0);
  return Math.max(d, c);
}

// Confere UM lançamento. `doc` = nota do catálogo. `duplicadoDe` = true se outro igual já "vale".
const CAM_EDIT = " Caminho: Etapa 1 · Escrituração → Livro diário → ✏️ Editar.";
const CAM_EXC = " Caminho: Etapa 1 · Escrituração → Livro diário → 🗑️ Excluir este lançamento.";
function comCaminho(r) {
  if (r.estado !== "no" || !r.acao) return r;
  let a = r.acao;
  const ed = /orrija|refaça/.test(a), ex = /xclua|xclusão/.test(a);
  if (ed && ex) a += " Caminho: Etapa 1 · Escrituração → Livro diário → ✏️ Editar ou 🗑️ Excluir este lançamento.";
  else if (ed) a += CAM_EDIT; else if (ex) a += CAM_EXC;
  return { ...r, acao: a };
}


// 2026-10-15 — Conferência das CONTAS do plano de contas (além dos valores).
// Só marca erro quando a conta é claramente de outro tipo; o que pode ter motivo (à vista, ICMS-ST, nota que não é de revenda) vira "confira".
// 2026-10-17 — Etapa 1: TODAS as compras e vendas são a PRAZO (decisão do professor). Caixa/Banco numa compra ou venda é erro.
const GUIA = " Dúvida? Consulte o Guia de lançamentos: compras e vendas (menu Organização → Guia de lançamentos, ou o botão 📘 no Livro Diário).";
const REC = { icms: "1.1.2.11", pis: "1.1.2.14", cofins: "1.1.2.15" };
const RECUPERAR = ["1.1.2.11", "1.1.2.12", "1.1.2.14", "1.1.2.15"];
const RECOLHER_VENDA = ["2.1.8.04", "2.1.8.05", "2.1.8.06", "4.2.01", "4.2.02"];
const NOME = { "1.1.3.01": "Mercadorias para Revenda", "1.1.2.11": "ICMS a Recuperar", "1.1.2.14": "PIS a Recuperar", "1.1.2.15": "COFINS a Recuperar" };
const rot = (c) => c + (NOME[c] ? " " + NOME[c] : "");
function conferirContas(l, g, tipos) {
  const ruins = [], duvidas = [], acoes = [];
  const ps = l.partidas || [];
  const D = ps.filter((p) => p.tipo === "D").map((p) => String(p.conta));
  const C = ps.filter((p) => p.tipo === "C").map((p) => String(p.conta));
  const entrada = g.direcao === "entrada", saida = g.direcao === "saida";
  if (!entrada && !saida) return { ruins, duvidas, acoes };
  const ehCompra = tipos.includes("compra");
  const revenda = entrada && /comercializ|revenda/i.test(g.texto || "");
  const ruim = (m, a) => { ruins.push(m); acoes.push(a + GUIA); };
  if (entrada) {
    if (C.some((c) => c.startsWith("1.1.1.")))
      ruim("compra lançada à vista (Caixa/Banco), mas as compras desta etapa são a prazo", "Corrija a conta de crédito: na compra a prazo o crédito é 2.1.1.01 Duplicatas a Pagar (ou 2.1.1.02 Fornecedores Diversos), não Caixa/Banco.");
    if (C.some((c) => c.startsWith("4.1.1.")) || D.some((c) => c === "1.1.2.01" || c === "1.1.2.02"))
      ruim("nota de compra com contas de venda (Clientes/Receita)", "Corrija as contas: na compra o débito é Mercadorias para Revenda (1.1.3.01) e o crédito é Fornecedores/Duplicatas a Pagar.");
    if (D.some((c) => RECOLHER_VENDA.includes(c)) || C.some((c) => RECOLHER_VENDA.includes(c)))
      ruim("nota de compra com conta de imposto a recolher ou de dedução de vendas", "Corrija as contas: na compra o imposto é a RECUPERAR (ICMS 1.1.2.11, PIS 1.1.2.14, COFINS 1.1.2.15), não a recolher.");
    if (ehCompra) {
      const dEst = D.filter((c) => c.startsWith("1.1.3."));
      if (dEst.some((c) => c !== "1.1.3.01")) {
        if (revenda) ruim("compra para revenda com débito em " + dEst.find((c) => c !== "1.1.3.01") + " (deveria ser 1.1.3.01 Mercadorias para Revenda)", "Corrija a conta de débito para 1.1.3.01 Mercadorias para Revenda e reenvie.");
        else duvidas.push("débito em " + dEst.find((c) => c !== "1.1.3.01") + ": confira se é a conta certa para esta nota");
      } else if (dEst.length === 0) {
        if (revenda) ruim("compra para revenda sem débito em 1.1.3.01 Mercadorias para Revenda", "Corrija a conta de débito para 1.1.3.01 Mercadorias para Revenda e reenvie.");
        else duvidas.push("compra sem débito em estoque: confira a conta");
      }
      const cForn = C.filter((c) => c.startsWith("2.1.1."));
      if (cForn.length === 0) {
        if (C.some((c) => c.startsWith("1.1.1."))) { /* à vista: já tratado acima como erro */ }
        else if (!C.length || C.every((c) => c === "1.1.3.01")) { /* sem crédito de compra: nada a dizer */ }
        else duvidas.push("crédito da compra fora de Fornecedores: confira");
      }
    }
    // lançamento só de imposto na compra: débito no imposto a recuperar, crédito em Mercadorias
    if (!ehCompra) ["icms", "pis", "cofins"].forEach((t) => {
      if (!tipos.includes(t)) return;
      const rec = REC[t];
      if (D.some((c) => RECUPERAR.includes(c)) && !D.includes(rec) && !D.includes("1.1.2.12")) ruim(t.toUpperCase() + " da compra lançado em outra conta de tributo a recuperar", "Corrija a conta de débito para " + rot(rec) + " e reenvie.");
      else if (D.includes("1.1.2.12") && t === "icms") duvidas.push("ICMS-ST a Recuperar: confira se a nota tem substituição tributária");
      if (D.includes(rec) && C.length && !C.includes("1.1.3.01") && !C.some((c) => RECUPERAR.includes(c))) duvidas.push("crédito do " + t.toUpperCase() + " da compra fora de 1.1.3.01 Mercadorias para Revenda: confira");
    });
  }
  if (saida) {
    if (D.some((c) => c.startsWith("1.1.1.")))
      ruim("venda lançada à vista (Caixa/Banco), mas as vendas desta etapa são a prazo", "Corrija a conta de débito: na venda a prazo o débito é 1.1.2.01 Duplicatas a Receber (ou 1.1.2.02 Clientes), não Caixa/Banco.");
    if (C.some((c) => c.startsWith("2.1.1.")))
      ruim("nota de venda com conta de compra (Fornecedores)", "Corrija as contas: na venda o débito é Clientes/Duplicatas a Receber e o crédito é Receita de Vendas.");
    if (D.some((c) => RECUPERAR.includes(c)) || C.some((c) => RECUPERAR.includes(c)))
      ruim("nota de venda com imposto a recuperar", "Corrija as contas: na venda o imposto é a RECOLHER (ICMS 2.1.8.04, PIS 2.1.8.05, COFINS 2.1.8.06) e a dedução é 4.2.01 / 4.2.02.");
    if (tipos.includes("venda")) {
      const dv = D.filter((c) => !c.startsWith("4.2.") && !c.startsWith("2.1.8."));
      if (dv.length && !dv.some((c) => c === "1.1.2.01" || c === "1.1.2.02")) {
        if (dv.some((c) => c.startsWith("1.1.1."))) { /* à vista: já tratado acima como erro */ }
        else duvidas.push("débito da venda fora de Clientes/Duplicatas a Receber: confira");
      }
      const cr = C.filter((c) => c.startsWith("4.1.1."));
      if (cr.some((c) => c !== "4.1.1.01") && /mercadoria/i.test(g.texto || "")) duvidas.push("receita em " + cr.find((c) => c !== "4.1.1.01") + ": a nota é de mercadorias, confira (esperado 4.1.1.01)");
    }
  }
  return { ruins, duvidas, acoes };
}

export function conferirUm(l, doc, duplicado) { return comCaminho(conferirUm0(l, doc, duplicado)); }
function conferirUm0(l, doc, duplicado) {
  if (duplicado) return { estado: "no", motivo: "duplicado: já existe lançamento igual para esta nota", acao: "Este lançamento não deve existir. Exclua-o pelo botão no Livro Diário.", podeExcluir: true };
  let tipos = tiposDoLancamento(l);
  if (tipos.length === 0) {
    // 2026-10-17 — sem tipo reconhecido, mas com a nota em mãos ainda dá para pegar erro de CONTA (ex.: Caixa contra Mercadorias numa venda a prazo)
    if (doc && l.documento) {
      const cc = conferirContas(l, gab(doc), []);
      if (cc.ruins.length) return { estado: "no", motivo: cc.ruins.join("; "), acao: cc.acoes.join(" ") };
    }
    return { estado: "sem", motivo: "sem regra automática para este lançamento: confira" };
  }
  // desconto creditado em receita aumenta a receita em vez de reduzir o valor a receber
  const descNaReceita = (l.partidas || []).some((p) => p.tipo === "D" && String(p.conta) === DESC_SAIDA) &&
    (l.partidas || []).some((p) => p.tipo === "C" && String(p.conta).startsWith("4.1.1."));
  if (descNaReceita) return { estado: "no", motivo: "desconto creditado em Receita de Vendas: deveria reduzir Clientes (valor a receber)", acao: "Corrija a conta de crédito: troque Receita de Vendas por Clientes. Se o desconto já está na nota, não precisa de lançamento à parte: exclua este lançamento pelo botão no Livro Diário.", podeExcluir: true };
  if (tipos.includes("desconto")) tipos = tipos.filter((t) => t !== "venda");
  if (!l.documento) return { estado: "no", motivo: "sem nota de origem: o valor não corresponde a nenhuma nota", acao: "Confira a nota a que este valor pertence e refaça o lançamento vinculando a nota certa. Se foi lançado por engano, exclua este lançamento pelo botão no Livro Diário.", podeExcluir: true };
  if (!doc) return { estado: "sem", motivo: "nota sem gabarito: confira manualmente" };
  const g = gab(doc);
  const ruins = [], bons = [], duvidas = [], acoes = []; let podeExc = false;
  { const cc = conferirContas(l, g, tipos); ruins.push(...cc.ruins); duvidas.push(...cc.duvidas); acoes.push(...cc.acoes); if (!cc.ruins.length && !cc.duvidas.length && tipos.includes("compra") && g.direcao === "entrada") bons.push("contas da compra"); }
  tipos.forEach((t) => {
    if (t === "icms" || t === "pis" || t === "cofins") {
      const contas = t === "icms" ? ICMS : t === "pis" ? PIS : COFINS;
      const v = valorDaConta(l, contas);
      const esperado = g[t];
      const nome = t === "icms" ? "ICMS" : t.toUpperCase();
      if (!esperado) duvidas.push(nome + ": a nota não traz esse imposto no gabarito");
      else if (iguais(v, esperado)) bons.push(nome);
      else { ruins.push(nome + " diferente: a nota traz " + brl(esperado)); acoes.push("Corrija o valor do " + nome + " para " + brl(esperado) + " e reenvie."); }
    } else if (t === "pisCofins") {
      const v = valorDaConta(l, PISCOFINS_VENDA);
      if (!g.pis && !g.cofins) duvidas.push("PIS/COFINS: a nota não traz esses impostos no gabarito");
      else if (iguais(v, g.pis + g.cofins) || iguais(v, g.pis) || iguais(v, g.cofins)) bons.push("PIS/COFINS");
      else { ruins.push("PIS/COFINS diferente: a nota traz PIS " + brl(g.pis) + " e COFINS " + brl(g.cofins)); acoes.push("Corrija o valor conforme a nota e reenvie."); }
    } else if (t === "desconto") {
      const entrada = g.direcao === "entrada";
      const certa = entrada ? DESC_ENTRADA : DESC_SAIDA;
      const temErrada = (l.partidas || []).some((p) => String(p.conta) === (entrada ? DESC_SAIDA : DESC_ENTRADA));
      const v = valorDaConta(l, [DESC_SAIDA, DESC_ENTRADA]);
      if (temErrada) { ruins.push("desconto na conta errada: " + (entrada ? "nota de entrada usa descontos obtidos" : "nota de saída usa descontos incondicionais")); acoes.push("Troque para a conta de desconto correta e reenvie."); }
      else if (!g.desconto) { ruins.push("a nota não tem desconto"); acoes.push("Esta nota não tem desconto: exclua este lançamento pelo botão no Livro Diário."); podeExc = true; }
      else if (iguais(v, g.desconto)) bons.push("desconto");
      else { ruins.push("desconto diferente: a nota traz " + brl(g.desconto)); acoes.push("Corrija o valor do desconto para " + brl(g.desconto) + " e reenvie."); }
    } else if (t === "compra") {
      if (g.direcao !== "entrada") return;
      const ps = l.partidas || [];
      const soma = (f) => ps.filter(f).reduce((a, p) => a + (Number(p.valor) || 0), 0);
      const dMerc = soma((p) => p.tipo === "D" && String(p.conta).startsWith("1.1.3."));
      const cForn = soma((p) => p.tipo === "C" && String(p.conta).startsWith("2.1.1."));
      const imp = (tipos.includes("icms") ? g.icms : 0) + (tipos.includes("pis") ? g.pis : 0) + (tipos.includes("cofins") ? g.cofins : 0);
      const complexa = g.desconto > 0 || g.ipi > 0;
      const probs = [];
      if (cForn > 0 && !iguais(cForn, g.total)) probs.push("valor a pagar (Fornecedores/Duplicatas) diferente: a nota traz " + brl(g.total));
      if (dMerc > 0 && !iguais(dMerc, g.total - imp)) probs.push("valor em Mercadorias diferente: o esperado é " + brl(g.total - imp) + (imp ? " (total da nota menos os impostos lançados junto)" : " (total da nota)"));
      if (!probs.length) bons.push("valor da compra");
      else if (complexa) duvidas.push("compra: " + probs.join("; ") + ". A nota tem desconto/IPI: confira");
      else { ruins.push("compra: " + probs.join("; ")); acoes.push("Corrija o valor da compra conforme a nota e reenvie."); }
    } else if (t === "venda") {
      const v = valorDaConta(l, (l.partidas || []).filter((p) => String(p.conta).startsWith("4.1.1.")).map((p) => String(p.conta)));
      if (iguais(v, g.total) || iguais(v, g.produtos) || iguais(v, g.itens)) bons.push("venda");
      else duvidas.push("valor da venda difere do total da nota (" + brl(g.total) + "): confira");
    }
  });
  if (ruins.length) return { estado: "no", motivo: ruins.join("; ") + (duvidas.length ? ". Confira também: " + duvidas.join("; ") : ""), acao: acoes.join(" "), podeExcluir: podeExc };
  if (duvidas.length) return { estado: "sem", motivo: duvidas.join("; ") };
  return { estado: "ok", motivo: "confere com a nota (" + bons.join(", ") + ")" };
}

// Confere todos os lançamentos enviados de UM aluno. `todosDoAluno` = todos os lançamentos dele.
export function conferirAluno(enviados, todosDoAluno, catalogo) {
  const porId = (id) => (catalogo || []).find((d) => d.id === id);
  const chave = (l) => l.documento + "|" + tiposDoLancamento(l).join("+");
  const vistos = {}; // chave -> lançamento que "vale"
  const ocupa = (l) => l.status === "aprovado" || l.status === "enviado";
  // 1) quem já está aprovado vale primeiro
  todosDoAluno.filter((l) => l.status === "aprovado" && l.documento && tiposDoLancamento(l).length).forEach((l) => {
    const k = chave(l); if (!vistos[k]) vistos[k] = l.id;
  });
  // 2) entre os enviados, o que melhor bate com a nota fica; depois, o mais antigo
  const ms = (l) => (l.enviadoEm?.toMillis ? l.enviadoEm.toMillis() : l.criadoEm?.toMillis ? l.criadoEm.toMillis() : 0);
  const ord = [...enviados].filter(ocupa).sort((a, b) => {
    const da = porId(a.documento), db = porId(b.documento);
    const pa = da && tiposDoLancamento(a).includes("venda") ? pontoVenda(a, gab(da)) : 0;
    const pb = db && tiposDoLancamento(b).includes("venda") ? pontoVenda(b, gab(db)) : 0;
    return pa - pb || ms(a) - ms(b);
  });
  const res = {};
  ord.forEach((l) => {
    const k = chave(l);
    let dup = false;
    if (l.documento && tiposDoLancamento(l).length) {
      if (vistos[k] && vistos[k] !== l.id) dup = true; else vistos[k] = l.id;
    }
    res[l.id] = conferirUm(l, porId(l.documento), dup);
  });
  return res;
}

// 2026-10-15 — Correção pelo professor (etapa fechada). Só propõe sozinho o caso SEGURO: lançamento de UM só tributo
// (ICMS, PIS, COFINS ou desconto) com 2 partidas (1 débito e 1 crédito) de mesmo valor. Aí troca os dois valores pelo da nota.
// Qualquer outro formato: auto=false, e a tela deixa o professor ajustar os valores à mão (débito = crédito).
export function sugerirCorrecao(l, doc) {
  const ps = l.partidas || [];
  if (!doc || ps.length !== 2) return { auto: false };
  const d = ps.filter((p) => p.tipo === "D"), c = ps.filter((p) => p.tipo === "C");
  if (d.length !== 1 || c.length !== 1 || !iguais(d[0].valor, c[0].valor)) return { auto: false };
  const tipos = tiposDoLancamento(l);
  if (tipos.length !== 1) return { auto: false };
  const g = gab(doc);
  const esperado = ["icms", "pis", "cofins"].includes(tipos[0]) ? g[tipos[0]] : tipos[0] === "desconto" ? g.desconto : 0;
  if (!(esperado > 0)) return { auto: false };
  const v = Math.round(esperado * 100) / 100;
  return { auto: true, esperado: v, partidas: ps.map((p) => ({ ...p, valor: v })) };
}
