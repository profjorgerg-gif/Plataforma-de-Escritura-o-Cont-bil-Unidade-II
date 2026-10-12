// Fase 3 (AGB) — preenchimento automático do "Período anterior" a partir do exercício atual.
// Função pura. Regra didática e transparente (o professor revê e ajusta os números antes de salvar):
//  - DRE: cada linha do atual é "desfeita" pelo crescimento informado (valor anterior = atual ÷ (1 + crescimento));
//  - Balanço: mesma ideia por bloco (ativo circulante, ativo não circulante, passivo circulante, passivo não circulante);
//    capital social, reservas e prejuízos/tesouraria ficam iguais; o resultado do exercício anterior vem da DRE anterior;
//  - o Caixa é recalculado para o Balanço anterior fechar (Ativo = Passivo + PL).
import { LINHAS_BP, totaisBP, dreCompletaDeLinhas } from "./agb.js";

export const PARAMETROS_ANTERIOR = {
  receita: 12, // crescimento da receita bruta, %
  cmv: 11, // crescimento do CMV, %
  despesas: 8, // crescimento das despesas operacionais, %
  ac: 10, anc: 5, pc: 8, pnc: 0, // crescimento dos blocos do Balanço, %
};
const r2 = (v) => Math.round(v * 100) / 100;
const desfaz = (v, g) => r2((Number(v) || 0) / (1 + (Number(g) || 0) / 100));

export function gerarPeriodoAnterior(bpAtual, dreAtual, par = PARAMETROS_ANTERIOR) {
  const p = { ...PARAMETROS_ANTERIOR, ...par };
  const rb = desfaz(dreAtual.receitaBruta, p.receita);
  const propDed = dreAtual.receitaBruta ? (Number(dreAtual.deducoes) || 0) / dreAtual.receitaBruta : 0;
  const dre = {
    receitaBruta: rb,
    deducoes: r2(rb * propDed),
    cmv: desfaz(dreAtual.cmv, p.cmv),
    despesasOp: desfaz(dreAtual.despesasOp, p.despesas),
    // resultado financeiro: mesma proporção da receita (despesa continua despesa, receita continua receita)
    resultadoFinanceiro: r2((Number(dreAtual.resultadoFinanceiro) || 0) * (dreAtual.receitaBruta ? rb / dreAtual.receitaBruta : 1)),
  };
  const dreCalc = dreCompletaDeLinhas(dre);
  const g = { AC: p.ac, ANC: p.anc, PC: p.pc, PNC: p.pnc };
  const bp = {};
  LINHAS_BP.forEach((l) => {
    const v = Number(bpAtual[l.key]) || 0;
    if (l.bloco === "PL") bp[l.key] = l.key === "resultado" ? r2(dreCalc.resultadoExercicio) : r2(v);
    else bp[l.key] = desfaz(v, g[l.bloco]);
  });
  // O Caixa é o ajuste: se ficar negativo, o ajuste passa a ser feito em empréstimos de curto prazo.
  const t = totaisBP({ ...bp, caixa: 0 });
  let caixa = r2(t.passivoPL - t.ativo), ajuste = "caixa";
  if (caixa < 0) { bp.emprestimosCP = r2(bp.emprestimosCP + (-caixa)); const t2 = totaisBP({ ...bp, caixa: 0 }); caixa = r2(t2.passivoPL - t2.ativo); ajuste = "emprestimosCP"; }
  bp.caixa = caixa;
  return { bp, dre, dreCalc, ajuste };
}
