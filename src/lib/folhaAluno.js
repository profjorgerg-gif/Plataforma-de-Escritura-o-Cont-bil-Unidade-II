// Folha da etapa 3 PESSOAL: os empregados e os dados são os da ficha do caderno de cada aluno (mesmo caso da etapa 2).
// Os parâmetros (INSS, FGTS, RAT, DSR, feriados, salário mínimo) continuam sendo os da turma.
import { folhaEmUso, lancamentosDaFolha, conferirLancamento } from "./folha.js";
import { casoDoEmpregado, opcoesDoEmpregado } from "./enunciadosCA.js";
import { empregadoDeCampos } from "./folhaAtividade.js";

export function folhaDoAluno(folhaCfg, config, matricula) {
  const lista = (config && config.empregados) || [];
  if (!matricula || !lista.length) return folhaCfg;
  const comp = folhaEmUso(folhaCfg).competencia;
  const empregados = lista.map((e) => {
    const caso = casoDoEmpregado(String(matricula), e.id, comp, opcoesDoEmpregado(config, e.id));
    const x = empregadoDeCampos((k) => caso[k]);
    return { nome: e.nome, salario: x.salario, he50: x.he50, he100: x.he100, hen50: x.hen50, hen100: x.hen100, adicional: x.adicional || {} };
  });
  return { ...(folhaCfg || {}), empregados, remuneracaoFixa: 0 };
}

// chave da tela de Provisões → valor esperado
export function valoresProvisoes(pv) {
  const o = { p_sal: pv.salarios, p_fer: pv.ferias, p_terco: pv.tercoFerias, p_ferT: pv.feriasTotal, p_dec: pv.decimo, c_emp: pv.obrigacoesEmpregados, c_enc: pv.encargosTotal, c_geral: pv.totalGeral };
  [["s", pv.encSalarios], ["f", pv.encFerias], ["d", pv.enc13]].forEach(([b, e]) => {
    o["e" + b + "_fgts"] = e.fgts; o["e" + b + "_inss"] = e.inss; o["e" + b + "_rat"] = e.rat; o["e" + b + "_terc"] = e.terceiros; o["e" + b + "_tot"] = e.total;
  });
  return o;
}

// Lançamento confere com a folha pessoal OU com a antiga da turma (quem já digitou não perde o que fez).
export function conferirLancamentoDuplo(partidasAluno, esperadas, esperadasAlt) {
  const r = conferirLancamento(partidasAluno, esperadas);
  if (r.ok || r.vazio || !esperadasAlt) return r;
  const r2 = conferirLancamento(partidasAluno, esperadasAlt);
  return r2.ok ? r2 : r;
}
export const lancamentosAlt = (folhaTurma) => (folhaTurma ? lancamentosDaFolha(folhaEmUso(folhaTurma).provisoes) : null);
