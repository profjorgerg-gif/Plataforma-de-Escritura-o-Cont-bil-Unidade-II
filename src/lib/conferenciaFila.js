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

export function conferirUm(l, doc, duplicado) { return comCaminho(conferirUm0(l, doc, duplicado)); }
function conferirUm0(l, doc, duplicado) {
  if (duplicado) return { estado: "no", motivo: "duplicado: já existe lançamento igual para esta nota", acao: "Este lançamento não deve existir. Exclua-o pelo botão no Livro Diário.", podeExcluir: true };
  let tipos = tiposDoLancamento(l);
  if (tipos.length === 0) return { estado: "sem", motivo: "sem regra automática para este lançamento: confira" };
  // desconto creditado em receita aumenta a receita em vez de reduzir o valor a receber
  const descNaReceita = (l.partidas || []).some((p) => p.tipo === "D" && String(p.conta) === DESC_SAIDA) &&
    (l.partidas || []).some((p) => p.tipo === "C" && String(p.conta).startsWith("4.1.1."));
  if (descNaReceita) return { estado: "no", motivo: "desconto creditado em Receita de Vendas: deveria reduzir Clientes (valor a receber)", acao: "Corrija a conta de crédito: troque Receita de Vendas por Clientes. Se o desconto já está na nota, não precisa de lançamento à parte: exclua este lançamento pelo botão no Livro Diário.", podeExcluir: true };
  if (tipos.includes("desconto")) tipos = tipos.filter((t) => t !== "venda");
  if (!l.documento) return { estado: "no", motivo: "sem nota de origem: o valor não corresponde a nenhuma nota", acao: "Confira a nota a que este valor pertence e refaça o lançamento vinculando a nota certa. Se foi lançado por engano, exclua este lançamento pelo botão no Livro Diário.", podeExcluir: true };
  if (!doc) return { estado: "sem", motivo: "nota sem gabarito: confira manualmente" };
  const g = gab(doc);
  const ruins = [], bons = [], duvidas = [], acoes = []; let podeExc = false;
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
    } else if (t === "venda") {
      const v = valorDaConta(l, (l.partidas || []).filter((p) => String(p.conta).startsWith("4.1.1.")).map((p) => String(p.conta)));
      if (iguais(v, g.total) || iguais(v, g.produtos) || iguais(v, g.itens)) bons.push("venda");
      else duvidas.push("valor da venda difere do total da nota (" + brl(g.total) + "): confira");
    }
  });
  if (ruins.length) return { estado: "no", motivo: ruins.join("; "), acao: acoes.join(" "), podeExcluir: podeExc };
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
