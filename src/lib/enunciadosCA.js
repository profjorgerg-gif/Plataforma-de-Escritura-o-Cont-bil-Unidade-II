// Enunciados automáticos das etapas 2 e 3 (2026-10-15). Funções PURAS: não leem nem gravam nada no banco.
// Etapa 2: caso do empregado, diferente para cada aluno e empregado, sempre o mesmo para o mesmo par (sem sorteio novo a cada clique).
// Etapa 3: enunciado dos 6 lançamentos da contabilização, montado com a folha da turma. Não traz contas nem valores calculados.
import { fmt } from "./contabil.js";
import { folhaEmUso, nomeDoMes, ultimoDiaDoMes } from "./folha.js";

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const brNum = (v) => Number(v).toFixed(2).replace(".", ",");
const pct = (v) => String(v).replace(".", ",");
const listaE = (a) => (a.length > 1 ? a.slice(0, -1).join(", ") + " e " + a[a.length - 1] : a[0]);

// Campos no mesmo formato que a atividade usa (todos texto): salario, adTipo, adPct, he50, he100, hen50, hen100, faltas, sem, dep, filhos, vt, vtCusto
// 2026-10-17 — opc (opcional) = escolhas do professor para ESTE empregado (config.fpProventos[empId]):
// { ad: "auto"|"nenhum"|"AI10"|"AI20"|"AI40"|"AP", he50, he100, hen50, hen100, faltas: "auto"|"sim"|"nao" }; "auto" ou campo ausente = automático (como antes).
// Sem opc o resultado é idêntico ao de antes. Valores (salário, horas, dias), dependentes e vale-transporte continuam automáticos.
export function opcoesDoEmpregado(cfg, empId) { return ((cfg && cfg.fpProventos) || {})[empId] || null; }
export function casoDoEmpregado(matricula, empId, competencia, opc) {
  const r = rng(hash(String(matricula) + "|" + String(empId) + "|" + String(competencia || "")));
  const pick = (a) => a[Math.floor(r() * a.length)];
  const salario = 1800 + 50 * Math.floor(r() * 100); // 1.800 a 6.750
  const x = r();
  const adTipo = x < 0.4 ? "" : x < 0.75 ? "AI" : "AP";
  const adPct = adTipo === "AI" ? pick([10, 20, 40]) : "";
  const faltas = pick([0, 0, 0, 1, 1, 2]);
  const dep = pick([0, 0, 1, 2, 3]);
  const filhos = dep > 0 ? Math.min(dep, pick([0, 1, 1, 2])) : 0;
  const vt = r() < 0.5;
  const caso = {
    salario: brNum(salario), adTipo, adPct: adPct === "" ? "" : String(adPct),
    he50: String(pick([0, 4, 8, 10, 12, 16])), he100: String(pick([0, 0, 2, 4, 8])),
    hen50: String(pick([0, 0, 2, 4, 6])), hen100: String(pick([0, 0, 0, 2, 4])),
    faltas: String(faltas), sem: "", dep: String(dep), filhos: String(filhos),
    vt: vt ? "1" : "", vtCusto: vt ? brNum(150 + 10 * Math.floor(r() * 18)) : "",
  };
  if (!opc) return caso;
  // escolhas do professor (sorteio separado, para não alterar os demais dados do caso)
  const r2 = rng(hash("prov|" + String(matricula) + "|" + String(empId) + "|" + String(competencia || "")));
  const pick2 = (a) => a[Math.floor(r2() * a.length)];
  if (typeof opc.ad === "string" && opc.ad !== "auto") {
    if (opc.ad === "nenhum" || opc.ad === "") { caso.adTipo = ""; caso.adPct = ""; }
    else if (opc.ad === "AP") { caso.adTipo = "AP"; caso.adPct = ""; }
    else if (opc.ad.startsWith("AI")) { caso.adTipo = "AI"; caso.adPct = opc.ad.slice(2); }
  }
  [["he50", [4, 8, 10, 12, 16]], ["he100", [2, 4, 8]], ["hen50", [2, 4, 6]], ["hen100", [2, 4]]].forEach(([k, lista]) => {
    if (opc[k] === "nao") caso[k] = "0";
    else if (opc[k] === "sim" && !(Number(caso[k]) > 0)) caso[k] = String(pick2(lista));
  });
  if (opc.faltas === "nao") caso.faltas = "0";
  else if (opc.faltas === "sim" && !(Number(caso.faltas) > 0)) caso.faltas = String(pick2([1, 1, 2]));
  return caso;
}

const n0 = (v) => Number(v) || 0;
export function textoDoCaso(nome, caso, competencia, obs) {
  const mes = nomeDoMes(competencia) || "o mês da folha";
  const L = [];
  const ad = caso.adTipo === "AI" ? `adicional de insalubridade de ${caso.adPct}% (sobre o salário mínimo)` : caso.adTipo === "AP" ? "adicional de periculosidade de 30%" : "nenhum adicional";
  L.push(`${nome} trabalha na empresa em ${mes}, com salário-base de R$ ${fmt(n0(String(caso.salario).replace(",", ".")))} e ${ad}.`);
  const he = [];
  if (n0(caso.he50)) he.push(`${caso.he50} h extras a 50%`);
  if (n0(caso.he100)) he.push(`${caso.he100} h extras a 100%`);
  if (n0(caso.hen50)) he.push(`${caso.hen50} h extras noturnas a 50%`);
  if (n0(caso.hen100)) he.push(`${caso.hen100} h extras noturnas a 100%`);
  L.push(he.length ? `No mês fez ${listaE(he)}.` : "No mês não fez horas extras.");
  const f = n0(caso.faltas);
  // 2 ou mais faltas: o texto diz que foram em semanas diferentes (é o que o sistema considera quando o campo "semanas com falta" fica vazio)
  L.push(f ? `Teve ${f} falta${f > 1 ? "s" : ""} injustificada${f > 1 ? "s" : ""}${f > 1 && String(caso.sem ?? "").trim() === "" ? ", em semanas diferentes" : ""}.` : "Não teve faltas.");
  const d = n0(caso.dep), fi = n0(caso.filhos);
  L.push(`Tem ${d} dependente${d === 1 ? "" : "s"} para o IRRF${d ? ` (${fi} filho${fi === 1 ? "" : "s"} até 14 anos)` : ""}.`);
  L.push(caso.vt ? `Optou pelo vale-transporte (custo mensal de R$ ${caso.vtCusto}).` : "Não optou pelo vale-transporte.");
  L.push("Tarefa: calcule o contracheque completo, da remuneração bruta ao salário líquido, e confira no sistema.");
  if (obs && String(obs).trim()) L.push("Observação do professor: " + String(obs).trim());
  return L.join(" ");
}

// Enunciado dos 6 lançamentos da etapa 3 (mesma ordem e chaves de lancamentosDaFolha)
export function enunciadosLancamentos(folhaCfg, obs) {
  const f = folhaEmUso(folhaCfg);
  const data = ultimoDiaDoMes(f.competencia).split("-").reverse().join("/");
  const mes = nomeDoMes(f.competencia);
  const p = f.parametros;
  const o = obs && String(obs).trim() ? " Observação do professor: " + String(obs).trim() : "";
  const cab = `Em ${data}, `;
  return {
    salarios: cab + `a empresa apurou a folha de pagamento de ${mes}, com remuneração total de R$ ${fmt(f.remuneracao)} (a mesma da tela Folha do mês). Registre a apropriação, como despesa, dos salários e remunerações do mês, que ficam a pagar aos empregados.` + o,
    encSalarios: cab + `a empresa reconhece os encargos patronais sobre a remuneração de ${mes}: INSS (${pct(p.inss)}%), FGTS (${pct(p.fgts)}%), RAT (${pct(p.rat)}%) e contribuições a terceiros (${pct(p.terceiros)}%). Calcule cada encargo, registre a despesa de encargos e uma obrigação a recolher para cada um deles.` + o,
    ferias: cab + `a empresa provisiona as férias do mês: 1/12 da remuneração, acrescido de 1/3 constitucional. Registre a despesa da provisão contra a obrigação de férias no passivo.` + o,
    encFerias: cab + `a empresa provisiona também os encargos (INSS, FGTS, RAT e terceiros) incidentes sobre as férias e o 1/3 provisionados. Calcule o total dos encargos e registre a despesa contra a provisão de encargos sobre férias.` + o,
    decimo: cab + `a empresa provisiona o 13º salário do mês: 1/12 da remuneração. Registre a despesa da provisão contra a obrigação de 13º salário no passivo.` + o,
    enc13: cab + `a empresa provisiona os encargos (INSS, FGTS, RAT e terceiros) incidentes sobre a provisão do 13º salário. Calcule o total dos encargos e registre a despesa contra a provisão de encargos sobre o 13º.` + o,
  };
}
