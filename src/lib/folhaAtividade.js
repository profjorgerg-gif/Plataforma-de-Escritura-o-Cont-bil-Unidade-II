// Atividade "Elaborar a folha de pagamento" — contracheque completo (proventos, descontos e salário líquido).
// Funções PURAS. Tabelas da legislação em UM só lugar (TABELAS_2026), para o professor atualizar todo ano.
// Fontes: Portaria Interministerial MPS/MF nº 13/2026 (INSS e salário-família); Lei 9.250/1995 com a Lei 15.270/2025
// (IRRF mensal: dedução por dependente, desconto simplificado e redução do imposto, art. 3º-A).
import { r2, calcularEmpregado, PARAMETROS_PADRAO } from "./folha.js";

export const TABELAS_2026 = {
  vigencia: "2026",
  inss: [ // faixas progressivas (cada parte do salário paga a sua alíquota)
    { ate: 1621.0, aliq: 0.075 }, { ate: 2902.84, aliq: 0.09 }, { ate: 4354.27, aliq: 0.12 }, { ate: 8475.55, aliq: 0.14 },
  ],
  irrf: [ // tabela progressiva mensal: imposto = base × alíquota − parcela a deduzir
    { ate: 2428.8, aliq: 0, ded: 0 }, { ate: 2826.65, aliq: 0.075, ded: 182.16 }, { ate: 3751.05, aliq: 0.15, ded: 394.16 },
    { ate: 4664.68, aliq: 0.225, ded: 675.49 }, { ate: Infinity, aliq: 0.275, ded: 908.73 },
  ],
  deducaoDependente: 189.59,
  descontoSimplificado: 607.2,
  reducao: { limiteIsento: 5000, limiteFim: 7350, a: 978.62, b: 0.133145 },
  salarioFamilia: { cota: 67.54, limite: 1980.38 },
  vtPercentual: 6, fgtsPercentual: 8,
};
const T = TABELAS_2026;
const arred = (v) => Math.round((Number(v) + 1e-9) * 100) / 100;
const trunc = (v) => Math.floor((Number(v) + 1e-9) * 100) / 100; // truncamento em 2 casas (como no eSocial)

// INSS: cada faixa é TRUNCADA em duas casas e depois somada (procedimento do eSocial, S-5001).
// A tolerância de R$ 0,02 na conferência do aluno é um critério PEDAGÓGICO (arredondamento), não autorização legal
// para divergência no recolhimento; ela não deve encobrir erro de base, alíquota, faixa ou teto.
export function calcularINSS(base, t = T) {
  const b = Math.min(Math.max(Number(base) || 0, 0), t.inss[t.inss.length - 1].ate);
  let ant = 0, soma = 0;
  for (const f of t.inss) { if (b > ant) soma += trunc((Math.min(b, f.ate) - ant) * f.aliq); ant = f.ate; }
  return arred(soma);
}
export function faixaIRRF(base, t = T) {
  const f = t.irrf.find((x) => base <= x.ate) || t.irrf[t.irrf.length - 1];
  return { aliq: f.aliq, ded: f.ded, imposto: Math.max(0, arred(base * f.aliq - f.ded)) };
}
export function reducaoIRRF(rendTributavel, imposto, t = T) {
  const r = t.reducao;
  if (rendTributavel <= r.limiteIsento) return imposto; // zera o imposto
  if (rendTributavel <= r.limiteFim) return Math.min(imposto, Math.max(0, arred(r.a - r.b * rendTributavel)));
  return 0;
}

// emp: { salario, adicional:{tipo:"AI"|"AP"|null,pct}, he50, he100, hen50, hen100, faltas, dependentes, filhos14, vt:boolean, vtCusto }
export function calcularContracheque(emp, t = T, p = PARAMETROS_PADRAO) {
  const e = calcularEmpregado(emp, p);
  const faltas = Number(emp.faltas) || 0;
  // Falta injustificada: perde o dia e, em cada SEMANA com falta, a remuneração do repouso semanal (Lei 605/1949, art. 6º).
  // Duas faltas na mesma semana = 2 dias + 1 repouso. Em semanas diferentes = 2 dias + 2 repousos.
  // emp.semanasComFalta (padrão = número de faltas, isto é, cada falta em uma semana) não pode passar de faltas.
  const semanas = Math.min(faltas, emp.semanasComFalta === undefined || emp.semanasComFalta === "" ? faltas : Number(emp.semanasComFalta) || 0);
  const descFaltas = arred((e.salario / 30) * (faltas + semanas));
  const remuneracao = arred(e.bruta - descFaltas); // base de INSS e rendimento tributável
  const inss = calcularINSS(remuneracao, t);
  const dep = Number(emp.dependentes) || 0;
  const deducaoLegal = arred(inss + dep * t.deducaoDependente);
  const usaSimplificado = t.descontoSimplificado > deducaoLegal;
  const deducao = usaSimplificado ? t.descontoSimplificado : deducaoLegal;
  const baseIR = Math.max(0, arred(remuneracao - deducao));
  const fx = faixaIRRF(baseIR, t);
  const reducao = arred(reducaoIRRF(remuneracao, fx.imposto, t));
  const irrf = arred(fx.imposto - reducao);
  const filhos = Number(emp.filhos14) || 0;
  const salFamilia = remuneracao <= t.salarioFamilia.limite ? arred(filhos * t.salarioFamilia.cota) : 0;
  const vt = emp.vt ? Math.min(arred(e.salario * t.vtPercentual / 100), Number(emp.vtCusto) > 0 ? arred(emp.vtCusto) : Infinity) : 0;
  const proventos = arred(e.bruta + salFamilia);
  const descontos = arred(descFaltas + inss + irrf + vt);
  const liquido = arred(proventos - descontos);
  const fgts = arred(remuneracao * t.fgtsPercentual / 100);
  return { ...e, descFaltas, remuneracao, inss, deducaoLegal, usaSimplificado, deducao, baseIR, aliqIR: fx.aliq, parcelaIR: fx.ded, impostoTabela: fx.imposto, reducao, irrf, salFamilia, vt, proventos, descontos, liquido, fgts };
}

// ---------------------------------------------------------------------------
// Atividade do aluno: passos do contracheque, conferência e resumo
// ---------------------------------------------------------------------------
export const TOLERANCIA_PEDAGOGICA = 0.02; // critério pedagógico (arredondamento); não vale para erro de base, alíquota, faixa ou teto
export const CAMPOS_EMPREGADO = ["salario", "adTipo", "adPct", "he50", "he100", "hen50", "hen100", "faltas", "sem", "dep", "filhos", "vt", "vtCusto"];

const num = (x) => { const s = String(x ?? "").trim().replace(/\s/g, "").replace("R$", ""); if (s === "") return null; const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s); return isFinite(n) ? n : null; };
export const lerValor = num;

// get(chave) devolve o texto digitado pelo aluno para o campo do empregado
export function empregadoDeCampos(get) {
  const n = (k) => num(get(k)) || 0;
  const tipo = get("adTipo");
  const sem = get("sem");
  return {
    salario: n("salario"), adicional: tipo ? { tipo, pct: n("adPct") } : null,
    he50: n("he50"), he100: n("he100"), hen50: n("hen50"), hen100: n("hen100"),
    faltas: n("faltas"), semanasComFalta: String(sem ?? "").trim() === "" ? undefined : n("sem"),
    dependentes: n("dep"), filhos14: n("filhos"), vt: get("vt") === "1", vtCusto: n("vtCusto"),
  };
}

export const PASSOS_CONTRACHEQUE = [
  { k: "rem", nome: "Remuneração bruta (salário + adicional + horas extras + DSR)", como: "Adicional: insalubridade (AI) = % × salário mínimo; periculosidade (AP) = 30% × salário-base. Hora integrada (HTI) = (salário + adicional) ÷ 220, usada nas horas extras. Some salário, adicional, horas extras e DSR.", v: (c) => c.bruta },
  { k: "falt", nome: "(−) Faltas injustificadas (dias + repousos perdidos)", como: "Salário ÷ 30 × (faltas + semanas com falta). Duas faltas na mesma semana: 2 dias + 1 repouso.", v: (c) => c.descFaltas },
  { k: "inss", nome: "(−) INSS do empregado", como: "Cada faixa é truncada em 2 casas (como no eSocial) e depois somada, até o teto.", v: (c) => c.inss },
  { k: "base", nome: "Base do IRRF (com a dedução mais vantajosa)", como: "Remuneração − (INSS + dependentes) ou − desconto simplificado, o que for maior.", v: (c) => c.baseIR },
  { k: "irrf", nome: "(−) IRRF, já com a redução da Lei 15.270/2025", como: "Imposto pela tabela (após deduções) − redução. A redução usa o rendimento tributável SEM descontar o INSS.", v: (c) => c.irrf },
  { k: "sf", nome: "(+) Salário-família", como: "Cota por filho até 14 anos, se a remuneração for até o limite.", v: (c) => c.salFamilia },
  { k: "vt", nome: "(−) Vale-transporte (6% do salário-base)", como: "Limitado ao custo do vale, se informado.", v: (c) => c.vt },
  { k: "prov", nome: "Total de proventos", como: "Remuneração bruta + salário-família.", v: (c) => c.proventos },
  { k: "desc", nome: "Total de descontos", como: "Faltas + INSS + IRRF + vale-transporte.", v: (c) => c.descontos },
  { k: "liq", nome: "SALÁRIO LÍQUIDO", como: "Proventos − descontos.", v: (c) => c.liquido },
];

// Valor de um campo da ficha do empregado: o que o aluno digitou; se ele ainda não mexeu no campo (nunca gravado),
// vale o dado do enunciado (base). Assim os dados vêm preenchidos sem gravar nada no banco.
export function valorDoCampo(fp, id, campo, base) {
  const v = (fp || {})[id + "__" + campo];
  if (v !== undefined && v !== null) return v;
  return base && base[campo] !== undefined && base[campo] !== null ? base[campo] : "";
}

// Situação de um empregado: { iniciado, passos:[{k,ok,digitado}], acertos, concluido }
// base (opcional) = dados do enunciado do empregado (casoDoEmpregado), usados enquanto o aluno não alterar o campo.
export function situacaoEmpregado(fp, id, t = T, base = null) {
  const get = (c) => valorDoCampo(fp, id, c, base);
  const salario = num(get("salario"));
  const c = calcularContracheque(empregadoDeCampos(get), t);
  const passos = PASSOS_CONTRACHEQUE.map((p) => {
    const d = num(((fp || {})[id + "__m_" + p.k]) ?? "");
    return { k: p.k, digitado: d !== null, ok: d !== null && Math.abs(d - p.v(c)) <= TOLERANCIA_PEDAGOGICA };
  });
  const acertos = passos.filter((p) => p.ok).length;
  return { iniciado: salario !== null && salario > 0 && passos.some((p) => p.digitado), passos, acertos, concluido: salario !== null && salario > 0 && acertos === passos.length };
}

// Conferência detalhada (tela do professor): dados usados, valor correto e valor digitado de cada linha.
export function detalheEmpregado(fp, id, t = T, base = null) {
  const get = (c) => valorDoCampo(fp, id, c, base);
  const c = calcularContracheque(empregadoDeCampos(get), t);
  const linhas = PASSOS_CONTRACHEQUE.map((p) => {
    const d = num(((fp || {})[id + "__m_" + p.k]) ?? "");
    const esperado = p.v(c);
    return { k: p.k, nome: p.nome, esperado, digitado: d, ok: d !== null && Math.abs(d - esperado) <= TOLERANCIA_PEDAGOGICA };
  });
  const dados = Object.fromEntries(CAMPOS_EMPREGADO.map((k) => [k, get(k)]));
  return { dados, linhas, acertos: linhas.filter((l) => l.ok).length, ...situacaoEmpregado(fp, id, t, base) };
}

// Resumo da atividade do aluno: contracheques concluídos, aproveitamento dos cálculos e notas automáticas (0 a 10).
// O mínimo é automático: um contracheque por empregado da lista (= número de alunos da turma). baseDe(id) devolve o enunciado do empregado.
export function resumoAtividade(fp, ids, minimo, baseDe) {
  let concluidos = 0, tentados = 0, acertos = 0, total = 0;
  ids.forEach((id) => {
    const s = situacaoEmpregado(fp, id, T, baseDe ? baseDe(id) : null);
    if (s.iniciado) { tentados++; acertos += s.acertos; total += s.passos.length; }
    if (s.concluido) concluidos++;
  });
  const m = Math.max(1, ids.length || Number(minimo) || 1);
  return {
    concluidos, tentados, minimo: m, pronto: concluidos >= m,
    notaCalculos: total ? Math.round((acertos / total) * 100) / 10 : null,
    notaQuantidade: Math.round(Math.min(10, (concluidos / m) * 10) * 10) / 10,
  };
}
