// Fase 2 — Contabilidade Avançada: folha de pagamento e provisões trabalhistas.
// Funções PURAS (sem banco). Critério de arredondamento = o do gabarito do material:
// cada parcela é arredondada para centavos e só depois somada.
export const r2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

export const PARAMETROS_PADRAO = {
  cargaHoraria: 220, adicionalNoturno: 0.2, diasUteisDSR: 24, diasDescansoDSR: 6,
  inss: 20, fgts: 8, rat: 2, terceiros: 5.8, // percentuais didáticos (patronais)
};

// Remuneração bruta de um empregado (Atividade 2 do material).
// emp: { nome, salario, he50, he100, hen50, hen100, adicional: {tipo:"AI"|"AP"|null, pct} }
export function calcularEmpregado(emp, p = PARAMETROS_PADRAO) {
  const salario = Number(emp.salario) || 0;
  const ad = emp.adicional || {};
  const pctAd = ad.tipo === "AP" ? 30 : ad.tipo === "AI" ? Number(ad.pct) || 0 : 0;
  const adicional = r2((salario * pctAd) / 100);
  const baseIntegrada = salario + adicional;
  const hti = baseIntegrada / p.cargaHoraria; // sem arredondar (como no gabarito)
  const he50 = r2(hti * 1.5 * (Number(emp.he50) || 0));
  const he100 = r2(hti * 2 * (Number(emp.he100) || 0));
  const hen50 = r2(hti * (1 + p.adicionalNoturno) * 1.5 * (Number(emp.hen50) || 0));
  const hen100 = r2(hti * (1 + p.adicionalNoturno) * 2 * (Number(emp.hen100) || 0));
  const horasExtras = r2(he50 + he100 + hen50 + hen100);
  const dsr = r2((horasExtras / p.diasUteisDSR) * p.diasDescansoDSR);
  const bruta = r2(salario + adicional + horasExtras + dsr);
  return { nome: emp.nome, salario, adicional, baseIntegrada, hti, he50, he100, hen50, hen100, horasExtras, dsr, bruta };
}

export function calcularFolha(empregados, p = PARAMETROS_PADRAO) {
  const linhas = empregados.map((e) => calcularEmpregado(e, p));
  const total = r2(linhas.reduce((s, l) => s + l.bruta, 0));
  return { linhas, total };
}

// Encargos patronais sobre uma base (cada encargo arredondado separadamente).
export function encargos(base, p = PARAMETROS_PADRAO) {
  const fgts = r2((base * p.fgts) / 100), inss = r2((base * p.inss) / 100);
  const rat = r2((base * p.rat) / 100), terceiros = r2((base * p.terceiros) / 100);
  return { base, fgts, inss, rat, terceiros, total: r2(fgts + inss + rat + terceiros) };
}

// Provisões a partir da remuneração do mês (Atividades 3, 4 e 5).
export function calcularProvisoes(remuneracao, p = PARAMETROS_PADRAO) {
  const salarios = r2(remuneracao);
  const ferias = r2(remuneracao / 12);
  const tercoFerias = r2(ferias / 3);
  const feriasTotal = r2(ferias + tercoFerias);
  const decimo = r2(remuneracao / 12);
  const encSalarios = encargos(salarios, p);
  const encFerias = encargos(feriasTotal, p);
  const enc13 = encargos(decimo, p);
  const encargosTotal = r2(encSalarios.total + encFerias.total + enc13.total);
  const obrigacoesEmpregados = r2(salarios + feriasTotal + decimo);
  const totalGeral = r2(obrigacoesEmpregados + encargosTotal);
  return { salarios, ferias, tercoFerias, feriasTotal, decimo, encSalarios, encFerias, enc13, encargosTotal, obrigacoesEmpregados, totalGeral };
}

// Contas usadas no gabarito de contabilização (plano oficial + contas novas sugeridas).
export const CONTAS_FOLHA = {
  despSalarios: "5.1.02", despEncargos: "5.1.03", despFerias: "5.1.09", despDecimo: "5.1.11",
  salariosPagar: "2.1.3.01", inssPagar: "2.1.4.01", fgtsPagar: "2.1.4.03", ratPagar: "2.1.4.04", terceirosPagar: "2.1.4.05",
  provFerias: "2.1.5.01", encFerias: "2.1.5.02", prov13: "2.1.6.01", enc13: "2.1.6.02",
};
export const CONTAS_NOVAS = [
  { codigo: "5.1.09", nome: "Despesa com Provisão de Férias e 1/3", grupo: 5, subgrupo: "Despesas Administrativas" },
  { codigo: "5.1.11", nome: "Despesa com Provisão de 13º Salário", grupo: 5, subgrupo: "Despesas Administrativas" },
  { codigo: "2.1.4.04", nome: "RAT a Recolher", grupo: 2, subgrupo: "Encargos Sociais" },
  { codigo: "2.1.4.05", nome: "Contribuições a Terceiros a Recolher", grupo: 2, subgrupo: "Encargos Sociais" },
];

// Lançamentos esperados (gabarito). Cada partida: { conta, tipo: "D"|"C", valor }.
export function lancamentosDaFolha(pv) {
  const C = CONTAS_FOLHA;
  const enc = (e, contaAprop) => ([
    { conta: C.despEncargos, tipo: "D", valor: e.total },
    { conta: C.inssPagar, tipo: "C", valor: e.inss }, { conta: C.fgtsPagar, tipo: "C", valor: e.fgts },
    { conta: C.ratPagar, tipo: "C", valor: e.rat }, { conta: C.terceirosPagar, tipo: "C", valor: e.terceiros },
  ]);
  return [
    { key: "salarios", titulo: "Provisão de salários e remunerações", partidas: [
      { conta: C.despSalarios, tipo: "D", valor: pv.salarios }, { conta: C.salariosPagar, tipo: "C", valor: pv.salarios } ] },
    { key: "encSalarios", titulo: "Encargos sociais sobre salários", partidas: enc(pv.encSalarios) },
    { key: "ferias", titulo: "Provisão de férias + 1/3 constitucional", partidas: [
      { conta: C.despFerias, tipo: "D", valor: pv.feriasTotal }, { conta: C.provFerias, tipo: "C", valor: pv.feriasTotal } ] },
    { key: "encFerias", titulo: "Encargos sobre a provisão de férias", partidas: [
      { conta: C.despEncargos, tipo: "D", valor: pv.encFerias.total }, { conta: C.encFerias, tipo: "C", valor: pv.encFerias.total } ] },
    { key: "decimo", titulo: "Provisão do 13º salário", partidas: [
      { conta: C.despDecimo, tipo: "D", valor: pv.decimo }, { conta: C.prov13, tipo: "C", valor: pv.decimo } ] },
    { key: "enc13", titulo: "Encargos sobre a provisão do 13º salário", partidas: [
      { conta: C.despEncargos, tipo: "D", valor: pv.enc13.total }, { conta: C.enc13, tipo: "C", valor: pv.enc13.total } ] },
  ];
}

// Compara o lançamento do aluno com o esperado: ignora a ordem das partidas, tolera R$ 0,02 (arredondamento).
// Não entrega o gabarito: as dicas dizem O QUE está errado (conta, valor, equilíbrio), sem dizer qual conta ou valor.
export function conferirLancamento(partidasAluno, esperadas, tol = 0.02) {
  const preenchidas = partidasAluno.filter((p) => p.conta && Number(p.valor) > 0);
  const soma = (ps, t) => r2(ps.filter((p) => p.tipo === t).reduce((s, p) => s + (Number(p.valor) || 0), 0));
  const dicas = [];
  if (preenchidas.length === 0) return { ok: false, vazio: true, dicas: [] };
  if (Math.abs(soma(preenchidas, "D") - soma(preenchidas, "C")) > 0.005) dicas.push("Débitos e créditos não são iguais.");
  let faltaConta = false, valorErrado = false;
  esperadas.forEach((e) => {
    const ach = preenchidas.filter((p) => p.conta === e.conta && p.tipo === e.tipo);
    const v = r2(ach.reduce((s, p) => s + (Number(p.valor) || 0), 0));
    if (ach.length === 0) faltaConta = true;
    else if (Math.abs(v - e.valor) > tol) valorErrado = true;
  });
  const extras = preenchidas.some((p) => !esperadas.some((e) => e.conta === p.conta && e.tipo === p.tipo));
  if (faltaConta) dicas.push("Falta alguma conta (ou ela está do lado errado, débito/crédito).");
  if (extras) dicas.push("Há uma conta que não faz parte deste lançamento.");
  if (valorErrado) dicas.push("Algum valor não confere: refaça o cálculo na tela de Provisões.");
  return { ok: dicas.length === 0, vazio: false, dicas };
}

export function ultimoDiaDoMes(competencia) { // "2026-04" -> "2026-04-30"
  const [a, m] = String(competencia || "").split("-").map(Number);
  if (!a || !m) return "";
  return `${a}-${String(m).padStart(2, "0")}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
}
export function nomeDoMes(competencia) {
  const [a, m] = String(competencia || "").split("-").map(Number);
  const nomes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return a && m ? nomes[m - 1] + "/" + a : "";
}

// Folha em uso: a cadastrada pelo professor ou, se ainda não houver, a do material.
export function folhaEmUso(cfg) {
  const f = cfg || {};
  const parametros = { ...PARAMETROS_PADRAO, ...(f.parametros || {}) };
  const empregados = f.empregados && f.empregados.length ? f.empregados : EMPREGADOS_MATERIAL;
  const competencia = f.competencia || "2026-04";
  const calc = calcularFolha(empregados, parametros);
  const fixa = Number(f.remuneracaoFixa) > 0 ? Number(f.remuneracaoFixa) : null;
  const remuneracao = fixa !== null ? fixa : calc.total;
  return { parametros, empregados, competencia, calc, remuneracao, fixa, provisoes: calcularProvisoes(remuneracao, parametros) };
}

// Dados didáticos do material (4 empregados) — ponto de partida que o professor pode alterar.
export const EMPREGADOS_MATERIAL = [
  { nome: "João Martins", salario: 2800, he50: 16, he100: 8, hen50: 4, hen100: 4, adicional: { tipo: "AI", pct: 10 } },
  { nome: "Maria Oliveira", salario: 3600, he50: 16, he100: 8, hen50: 4, hen100: 4, adicional: { tipo: "AP" } },
  { nome: "Carlos Souza", salario: 4200, he50: 16, he100: 8, hen50: 4, hen100: 4, adicional: { tipo: "AI", pct: 20 } },
  { nome: "Ana Ferreira", salario: 5400, he50: 16, he100: 8, hen50: 4, hen100: 4, adicional: { tipo: "AI", pct: 20 } },
];
