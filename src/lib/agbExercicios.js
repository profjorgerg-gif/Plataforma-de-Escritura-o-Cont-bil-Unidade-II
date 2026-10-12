// Fase 3 (AGB) — quatro exercícios comparativos com empresas FICTÍCIAS e distintas, no mesmo formato do exemplo
// (Balanço por linhas + DRE por linhas, com o período anterior). São dados fixos do sistema: nada é gravado aqui
// e nada se mistura com os lançamentos dos alunos. O "Caixa" de cada balanço é calculado para o Balanço fechar.
import { totaisBP, dreCompletaDeLinhas } from "./agb.js";

function fecharCaixa(bp) {
  const sem = { ...bp, caixa: 0 };
  const t = totaisBP(sem);
  return { ...bp, caixa: Math.round((t.passivoPL - t.ativo) * 100) / 100 };
}
function empresa(id, nome, perfil, ramo, atual, anterior) {
  const montar = (p) => ({ bp: fecharCaixa(p.bp), dre: dreCompletaDeLinhas(p.dre) });
  const a = montar(atual), b = montar(anterior);
  return { id, nome, ramo, perfil, bp: a.bp, dre: a.dre, anterior: { rotulo: "Exercício anterior — " + nome, bp: b.bp, dre: b.dre } };
}
const z = { realizavelLP: 0, investimentos: 0, intangivel: 0, prejTesouraria: 0, reservas: 0, despAntecipadas: 0, outrosCreditos: 0, estoques: 0, emprestimosCP: 0, pnc: 0 };

export const EXERCICIOS = [
  empresa("ex1", "Comercial Alfa Ltda", "Comércio varejista com boa liquidez e crescimento sustentado.", "Comércio de materiais de construção",
    { bp: { ...z, clientes: 130000, outrosCreditos: 9000, estoques: 110000, despAntecipadas: 3000, imobilizado: 188000,
        fornecedores: 74000, obrigTrabalhistas: 26000, tributosRecolher: 18000, emprestimosCP: 20000, outrasObrigacoes: 12000, pnc: 60000,
        capital: 200000, reservas: 20000, resultado: 70000 },
      dre: { receitaBruta: 800000, deducoes: 120000, cmv: 408000, despesasOp: 190000, resultadoFinanceiro: -12000 } },
    { bp: { ...z, clientes: 118000, outrosCreditos: 8000, estoques: 98000, despAntecipadas: 3000, imobilizado: 175000,
        fornecedores: 70000, obrigTrabalhistas: 24000, tributosRecolher: 16000, emprestimosCP: 30000, outrasObrigacoes: 10000, pnc: 59000,
        capital: 170000, reservas: 20000, resultado: 41000 },
      dre: { receitaBruta: 700000, deducoes: 105000, cmv: 364000, despesasOp: 175000, resultadoFinanceiro: -15000 } }),
  empresa("ex2", "Indústria Beta S/A", "Indústria com imobilizado pesado e endividamento elevado.", "Indústria metalúrgica",
    { bp: { ...z, clientes: 260000, outrosCreditos: 30000, estoques: 330000, despAntecipadas: 6000, realizavelLP: 25000, imobilizado: 1250000, intangivel: 40000,
        fornecedores: 190000, obrigTrabalhistas: 80000, tributosRecolher: 45000, emprestimosCP: 210000, outrasObrigacoes: 35000, pnc: 700000,
        capital: 600000, reservas: 90000, prejTesouraria: -30000, resultado: 67000 },
      dre: { receitaBruta: 1500000, deducoes: 255000, cmv: 810000, despesasOp: 290000, resultadoFinanceiro: -78000 } },
    { bp: { ...z, clientes: 235000, outrosCreditos: 28000, estoques: 305000, despAntecipadas: 5000, realizavelLP: 25000, imobilizado: 1190000, intangivel: 44000,
        fornecedores: 170000, obrigTrabalhistas: 72000, tributosRecolher: 38000, emprestimosCP: 190000, outrasObrigacoes: 30000, pnc: 740000,
        capital: 600000, reservas: 70000, prejTesouraria: -50000, resultado: 39600 },
      dre: { receitaBruta: 1320000, deducoes: 224400, cmv: 724000, despesasOp: 262000, resultadoFinanceiro: -70000 } }),
  empresa("ex3", "Gama Serviços de Tecnologia Ltda", "Prestadora de serviços, sem estoques, alta margem e muito caixa.", "Serviços de tecnologia da informação",
    { bp: { ...z, clientes: 210000, outrosCreditos: 14000, despAntecipadas: 9000, investimentos: 60000, imobilizado: 150000, intangivel: 120000,
        fornecedores: 48000, obrigTrabalhistas: 140000, tributosRecolher: 52000, outrasObrigacoes: 30000,
        capital: 300000, reservas: 80000, resultado: 152160 },
      dre: { receitaBruta: 960000, deducoes: 86400, cmv: 349440, despesasOp: 380000, resultadoFinanceiro: 8000 } },
    { bp: { ...z, clientes: 175000, outrosCreditos: 12000, despAntecipadas: 8000, investimentos: 60000, imobilizado: 140000, intangivel: 130000,
        fornecedores: 42000, obrigTrabalhistas: 120000, tributosRecolher: 41000, emprestimosCP: 25000, outrasObrigacoes: 22000,
        capital: 300000, reservas: 25000, resultado: 78800 },
      dre: { receitaBruta: 780000, deducoes: 70200, cmv: 304000, despesasOp: 330000, resultadoFinanceiro: 3000 } }),
  empresa("ex4", "Delta Distribuidora Ltda", "Atacadista com margem apertada, dívida de curto prazo e prejuízo.", "Distribuição atacadista de alimentos",
    { bp: { ...z, clientes: 650000, outrosCreditos: 40000, estoques: 700000, despAntecipadas: 4000, imobilizado: 280000,
        fornecedores: 640000, obrigTrabalhistas: 120000, tributosRecolher: 95000, emprestimosCP: 480000, outrasObrigacoes: 60000, pnc: 150000,
        capital: 400000, prejTesouraria: -90000, resultado: -127200 },
      dre: { receitaBruta: 2400000, deducoes: 408000, cmv: 1693200, despesasOp: 330000, resultadoFinanceiro: -96000 } },
    { bp: { ...z, clientes: 520000, outrosCreditos: 35000, estoques: 560000, despAntecipadas: 4000, imobilizado: 300000,
        fornecedores: 540000, obrigTrabalhistas: 105000, tributosRecolher: 82000, emprestimosCP: 330000, outrasObrigacoes: 50000, pnc: 150000,
        capital: 400000, prejTesouraria: -55500, resultado: -34500 },
      dre: { receitaBruta: 2150000, deducoes: 365500, cmv: 1463000, despesasOp: 296000, resultadoFinanceiro: -60000 } }),
];
export const exercicioPorId = (id) => EXERCICIOS.find((e) => e.id === id) || null;
