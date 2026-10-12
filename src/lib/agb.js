// Fase 3 — Análise Gerencial de Balanços (AGB).
// Funções PURAS: recebem o Razão/DRE/BP já calculados a partir dos lançamentos
// APROVADOS (mesma fonte das telas de Razão, DRE e Balanço) e só fazem contas.
// Nada aqui lê ou grava no banco, e nada altera o que os alunos já lançaram.
import { valorBP } from "./contabil.js";

// ---------------------------------------------------------------------------
// 1) Linhas do Balanço para análise (agrupa contas do plano oficial por código)
// ---------------------------------------------------------------------------
export const LINHAS_BP = [
  { key: "caixa", nome: "Caixa e equivalentes de caixa", bloco: "AC", teste: (c) => c.startsWith("1.1.1.") },
  { key: "clientes", nome: "Clientes e duplicatas a receber (líquido da PCLD)", bloco: "AC", teste: (c) => ["1.1.2.01", "1.1.2.02", "1.1.2.04", "1.1.2.05", "1.1.2.99"].includes(c) },
  { key: "outrosCreditos", nome: "Outros créditos e tributos a recuperar", bloco: "AC", teste: (c) => c.startsWith("1.1.2.") },
  { key: "estoques", nome: "Estoques", bloco: "AC", teste: (c) => c.startsWith("1.1.3.") },
  { key: "despAntecipadas", nome: "Despesas antecipadas", bloco: "AC", teste: (c) => c.startsWith("1.1.4.") },
  { key: "realizavelLP", nome: "Realizável a longo prazo", bloco: "ANC", teste: (c) => c.startsWith("1.2.1.") },
  { key: "investimentos", nome: "Investimentos", bloco: "ANC", teste: (c) => c.startsWith("1.2.2.") },
  { key: "imobilizado", nome: "Imobilizado (líquido da depreciação)", bloco: "ANC", teste: (c) => c.startsWith("1.2.3.") },
  { key: "intangivel", nome: "Intangível (líquido da amortização)", bloco: "ANC", teste: (c) => c.startsWith("1.2.4.") },
  { key: "fornecedores", nome: "Fornecedores", bloco: "PC", teste: (c) => c.startsWith("2.1.1.") },
  { key: "obrigTrabalhistas", nome: "Obrigações trabalhistas, encargos e provisões", bloco: "PC", teste: (c) => /^2\.1\.[3456]\./.test(c) },
  { key: "tributosRecolher", nome: "Tributos a recolher", bloco: "PC", teste: (c) => c.startsWith("2.1.8.") },
  { key: "emprestimosCP", nome: "Empréstimos, financiamentos e duplicatas descontadas", bloco: "PC", teste: (c) => c.startsWith("2.1.9.") || c.startsWith("2.1.10.") },
  { key: "outrasObrigacoes", nome: "Outras obrigações (contas a pagar, dividendos)", bloco: "PC", teste: (c) => c.startsWith("2.1.") },
  { key: "pnc", nome: "Passivo não circulante", bloco: "PNC", teste: (c) => c.startsWith("2.2.") },
  { key: "capital", nome: "Capital social", bloco: "PL", teste: (c) => c.startsWith("3.1.") },
  { key: "reservas", nome: "Reservas e ajustes de avaliação", bloco: "PL", teste: (c) => /^3\.[234]\./.test(c) },
  { key: "prejTesouraria", nome: "Prejuízos acumulados e ações em tesouraria", bloco: "PL", teste: (c) => c === "3.5" || c === "3.6" },
  { key: "resultado", nome: "Resultado do exercício", bloco: "PL", teste: (c) => c === "3.9" },
];

export const BLOCOS_BP = {
  AC: "ATIVO CIRCULANTE", ANC: "ATIVO NÃO CIRCULANTE",
  PC: "PASSIVO CIRCULANTE", PNC: "PASSIVO NÃO CIRCULANTE", PL: "PATRIMÔNIO LÍQUIDO",
};

function linhaDaConta(codigo) {
  // a ordem importa: a primeira regra que casar vence (regras mais específicas vêm antes das genéricas)
  return LINHAS_BP.find((l) => l.teste(codigo)) || null;
}

// Retorna { valores: {chave: número}, totais: {...} } para o Balanço atual.
export function balancoPorLinhas(bp) {
  const valores = {};
  LINHAS_BP.forEach((l) => { valores[l.key] = 0; });
  [...bp.ativos, ...bp.passivos, ...bp.pl].forEach((b) => {
    const l = linhaDaConta(b.conta.codigo);
    if (l) valores[l.key] += valorBP(b);
  });
  // O resultado do exercício apurado (DRE) entra no PL
  valores.resultado += bp.resultadoExercicio || 0;
  return { valores, totais: totaisBP(valores) };
}

export function totaisBP(v) {
  const soma = (bloco) => LINHAS_BP.filter((l) => l.bloco === bloco).reduce((s, l) => s + (Number(v[l.key]) || 0), 0);
  const AC = soma("AC"), ANC = soma("ANC"), PC = soma("PC"), PNC = soma("PNC"), PL = soma("PL");
  return { AC, ANC, PC, PNC, PL, ativo: AC + ANC, passivoPL: PC + PNC + PL };
}

// ---------------------------------------------------------------------------
// 2) DRE por linhas
// ---------------------------------------------------------------------------
export const LINHAS_DRE = [
  { key: "receitaBruta", nome: "Receita bruta de vendas", tipo: "linha" },
  { key: "deducoes", nome: "(–) Deduções da receita", tipo: "linha" },
  { key: "receitaLiquida", nome: "Receita líquida", tipo: "total" },
  { key: "cmv", nome: "(–) Custo das vendas (CMV/CPV/CSV)", tipo: "linha" },
  { key: "resultadoBruto", nome: "Resultado bruto", tipo: "total" },
  { key: "despesasOp", nome: "(–) Despesas operacionais", tipo: "linha" },
  { key: "resultadoFinanceiro", nome: "Resultado financeiro", tipo: "linha" },
  { key: "resultadoExercicio", nome: "Resultado do exercício", tipo: "total" },
];

export function dreParaLinhas(dre) {
  return {
    receitaBruta: dre.receitaBruta, deducoes: dre.deducoes, receitaLiquida: dre.receitaLiquida,
    // custos de produção somam-se ao custo das vendas; outras receitas operacionais reduzem as despesas operacionais (líquidas),
    // para a DRE da análise ter as mesmas linhas de sempre e o mesmo resultado do exercício.
    cmv: dre.cmv + (dre.custosProducao || 0), resultadoBruto: dre.resultadoBruto, despesasOp: dre.despesasOp - (dre.outrasReceitas || 0),
    resultadoFinanceiro: dre.resultadoFinanceiro, resultadoExercicio: dre.resultadoExercicio,
  };
}

// Recalcula os totais da DRE a partir das linhas "simples" (usado no cadastro do período anterior)
export function dreCompletaDeLinhas(v) {
  const n = (k) => Number(v[k]) || 0;
  const receitaLiquida = n("receitaBruta") - n("deducoes");
  const resultadoBruto = receitaLiquida - n("cmv");
  const resultadoExercicio = resultadoBruto - n("despesasOp") + n("resultadoFinanceiro");
  return { ...v, receitaBruta: n("receitaBruta"), deducoes: n("deducoes"), cmv: n("cmv"), despesasOp: n("despesasOp"), resultadoFinanceiro: n("resultadoFinanceiro"), receitaLiquida, resultadoBruto, resultadoExercicio };
}

// ---------------------------------------------------------------------------
// 3) Análise vertical e horizontal
// ---------------------------------------------------------------------------
// AV = valor da linha ÷ base × 100. Base do Balanço: total do Ativo (também usado para Passivo+PL,
// pois os dois totais são iguais quando o balanço fecha). Base da DRE: receita líquida.
export function av(valor, base) {
  if (!base) return null;
  return (valor / base) * 100;
}
// AH = (atual ÷ anterior − 1) × 100. Sem período anterior (ou anterior = 0) não há como calcular.
export function ah(atual, anterior) {
  if (anterior === null || anterior === undefined || anterior === "" || Number(anterior) === 0) return null;
  return (atual / Number(anterior) - 1) * 100;
}

// ---------------------------------------------------------------------------
// 4) Indicadores
// ---------------------------------------------------------------------------
const div = (a, b) => (b ? a / b : null);

// bpv: valores por linha do Balanço; dre: objeto da DRE; dias: base de dias (360 ou 365)
export function calcularIndicadores(bpv, dre, dias = 360) {
  const t = totaisBP(bpv);
  const RLP = bpv.realizavelLP || 0;
  const permanente = (bpv.investimentos || 0) + (bpv.imobilizado || 0) + (bpv.intangivel || 0);
  const terceiros = t.PC + t.PNC;
  const lucro = dre.resultadoExercicio || 0;
  const rl = dre.receitaLiquida || 0;
  const resultadoOperacional = (dre.resultadoBruto || 0) - (dre.despesasOp || 0);

  const pme = div((bpv.estoques || 0) * dias, dre.cmv);
  const pmr = div((bpv.clientes || 0) * dias, dre.receitaBruta);
  const pmp = div((bpv.fornecedores || 0) * dias, dre.cmv); // simplificação: compras ≈ CMV
  const cicloOp = pme !== null && pmr !== null ? pme + pmr : null;
  const cicloFin = cicloOp !== null && pmp !== null ? cicloOp - pmp : null;

  const roi = div(lucro, t.ativo);
  const roe = div(lucro, t.PL);

  return {
    liquidezCorrente: div(t.AC, t.PC),
    liquidezSeca: div(t.AC - (bpv.estoques || 0) - (bpv.despAntecipadas || 0), t.PC),
    liquidezGeral: div(t.AC + RLP, terceiros),
    liquidezImediata: div(bpv.caixa || 0, t.PC),
    ccl: t.AC - t.PC,
    pme, pmr, pmp, cicloOperacional: cicloOp, cicloFinanceiro: cicloFin,
    participacaoCapTerceiros: div(terceiros, t.PL),
    composicaoEndividamento: div(t.PC, terceiros),
    imobilizacaoPL: div(permanente, t.PL),
    imobilizacaoRecNaoCorr: div(permanente, t.PL + t.PNC),
    margemBruta: div(dre.resultadoBruto || 0, rl),
    margemOperacional: div(resultadoOperacional, rl),
    margemLiquida: div(lucro, rl),
    giroAtivo: div(rl, t.ativo),
    roi, roe,
    alavancagem: roi && roe !== null ? div(roe, roi) : null,
  };
}

// ---------------------------------------------------------------------------
// 5) Capital de giro (modelo dinâmico, Fleuriet)
// ---------------------------------------------------------------------------
export function capitalDeGiro(bpv) {
  const t = totaisBP(bpv);
  const acf = bpv.caixa || 0; // financeiro: caixa e aplicações
  const aco = t.AC - acf; // operacional: clientes, estoques, créditos, despesas antecipadas
  const pcf = bpv.emprestimosCP || 0; // financeiro: empréstimos e descontos
  const pco = t.PC - pcf; // operacional: fornecedores, obrigações, tributos...
  const ncg = aco - pco;
  const cgl = (t.PL + t.PNC) - t.ANC; // capital de giro líquido (= AC − PC)
  const st = acf - pcf; // saldo de tesouraria (= CGL − NCG)
  return { acf, aco, pcf, pco, ncg, cgl, st, tipo: tipoFleuriet(cgl, ncg, st) };
}

export function tipoFleuriet(cgl, ncg, st) {
  const p = (x) => x >= 0;
  if (p(cgl) && !p(ncg) && p(st)) return { n: "I", nome: "Excelente", leitura: "A empresa financia a operação com folga e ainda sobra caixa." };
  if (p(cgl) && p(ncg) && p(st)) return { n: "II", nome: "Sólida", leitura: "O capital de giro cobre a necessidade de giro e ainda sobra saldo em tesouraria." };
  if (p(cgl) && p(ncg) && !p(st)) return { n: "III", nome: "Insatisfatória", leitura: "A necessidade de giro supera o capital de giro: a diferença é paga com dívida de curto prazo." };
  if (!p(cgl) && p(ncg) && !p(st)) return { n: "IV", nome: "Péssima", leitura: "Falta capital de giro e a operação ainda exige recursos: forte dependência de dívida de curto prazo." };
  if (!p(cgl) && !p(ncg) && !p(st)) return { n: "V", nome: "Muito ruim", leitura: "Falta capital de giro e a tesouraria está negativa, embora a operação libere recursos." };
  return { n: "VI", nome: "Alto risco", leitura: "Falta capital de giro; a tesouraria positiva depende de a operação continuar liberando recursos." };
}

// ---------------------------------------------------------------------------
// 6) Formatação
// ---------------------------------------------------------------------------
export function fmtPct(v, casas = 1) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return (v >= 0 ? "" : "–") + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%";
}
export function fmtPctAH(v) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return (v >= 0 ? "+" : "–") + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}
export function fmtNum(v, casas = 2) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// Conferência do "meu cálculo" do aluno: aceita vírgula ou ponto e uma tolerância pequena.
export function lerNumero(txt) {
  if (txt === null || txt === undefined) return null;
  const s = String(txt).trim().replace(/\s/g, "").replace("%", "").replace("x", "");
  if (s === "") return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return isFinite(n) ? n : null;
}
export function confere(txt, esperado, tolerancia = 0.15) {
  const n = lerNumero(txt);
  if (n === null || esperado === null || esperado === undefined) return null; // null = ainda não respondeu
  return Math.abs(n - esperado) <= tolerancia;
}
