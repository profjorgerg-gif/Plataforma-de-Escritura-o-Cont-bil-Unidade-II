// Fase 2 (CA) — Rescisão trabalhista. Funções puras, sem Firestore.
// Critério de arredondamento: cada parcela é arredondada a centavos e depois somada (igual à folha).
// Base legal usada no gabarito (conferir sempre com a legislação vigente):
//   CLT arts. 477, 478, 484-A, 487 §1º, 146; Lei 12.506/2011 (aviso proporcional); Lei 4.090/62 (13º);
//   Lei 8.036/90 (FGTS); Súmulas TST 171, 305 e 371; Súmulas STJ 125 e 215.
import { PARAMETROS_PADRAO, r2, conferirLancamento } from "./folha.js";

export { conferirLancamento };

export const MODALIDADES = [
  { id: "sjc", nome: "Dispensa sem justa causa", iniciativa: "Iniciativa do empregador, sem falta grave do empregado." },
  { id: "ped", nome: "Pedido de demissão", iniciativa: "Iniciativa do empregado." },
  { id: "jc", nome: "Dispensa por justa causa", iniciativa: "Iniciativa do empregador, por falta grave do empregado." },
  { id: "aco", nome: "Acordo entre as partes (art. 484-A)", iniciativa: "Iniciativa de comum acordo entre empregador e empregado." },
  { id: "ter", nome: "Término de contrato a prazo", iniciativa: "O contrato por prazo determinado chegou ao fim." },
];
export const nomeModalidade = (id) => (MODALIDADES.find((m) => m.id === id) || {}).nome || "";

// ---------- datas (sem fuso: tudo em UTC) ----------
export function parseData(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const o = { a: +m[1], m: +m[2], d: +m[3] };
  const t = new Date(Date.UTC(o.a, o.m - 1, o.d));
  return t.getUTCFullYear() === o.a && t.getUTCMonth() === o.m - 1 && t.getUTCDate() === o.d ? o : null;
}
const dim = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();
const iso = (o) => `${o.a}-${String(o.m).padStart(2, "0")}-${String(o.d).padStart(2, "0")}`;
const utc = (o) => Date.UTC(o.a, o.m - 1, o.d);
export function somarDias(s, n) {
  const o = parseData(s); if (!o) return "";
  const t = new Date(utc(o) + n * 86400000);
  return iso({ a: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() });
}
export function diasEntre(a, b) { // b - a
  const x = parseData(a), y = parseData(b);
  return x && y ? Math.round((utc(y) - utc(x)) / 86400000) : null;
}
export const fmtData = (s) => { const o = parseData(s); return o ? `${String(o.d).padStart(2, "0")}/${String(o.m).padStart(2, "0")}/${o.a}` : "—"; };
function somarMeses(o, n) {
  const total = o.a * 12 + (o.m - 1) + n;
  const a = Math.floor(total / 12), m = (total % 12) + 1;
  return { a, m, d: Math.min(o.d, dim(a, m)) };
}
const antesOuIgual = (x, y) => utc(x) <= utc(y);

export function anosCompletos(adm, ref) {
  const a = parseData(adm), r = parseData(ref);
  if (!a || !r) return 0;
  let n = r.a - a.a;
  if (r.m < a.m || (r.m === a.m && r.d < a.d)) n -= 1;
  return Math.max(0, n);
}
export const diasDeAviso = (anos) => Math.min(90, 30 + 3 * anos); // Lei 12.506/2011

// Dias de projeção do aviso prévio indenizado (CLT art. 487 §1º; Súmula 371 do TST).
// Dispensa sem justa causa: aviso inteiro. Acordo (art. 484-A): aviso pela metade, projeção proporcional (critério adotado, ver observação).
// Pedido de demissão e término de contrato: sem aviso indenizado ao empregado. Justa causa: sem aviso.
export function diasProjecao(modalidade, avisoDias) {
  if (modalidade === "sjc") return avisoDias;
  if (modalidade === "aco") return Math.floor(avisoDias / 2);
  return 0;
}

// Avos de férias: período aquisitivo corrente até a data de referência (já com projeção); fração a partir de 15 dias conta como mês.
export function avosFerias(adm, ref) {
  const a = parseData(adm), r = parseData(ref);
  if (!a || !r) return 0;
  let k = 0;
  while (antesOuIgual(somarMeses(a, 12 * (k + 1)), r)) k += 1;
  const ini = somarMeses(a, 12 * k);
  let m = 0;
  while (antesOuIgual(somarMeses(ini, m + 1), r)) m += 1;
  // dias da fração, contando o próprio dia final
  const base = somarMeses(ini, m);
  const frac = Math.round((utc(r) - utc(base)) / 86400000) + 1;
  return Math.min(12, m + (frac >= 15 ? 1 : 0));
}

// Avos de 13º: meses do ano da data de referência em que houve 15 dias ou mais de trabalho (Lei 4.090/62).
export function avos13(adm, ref) {
  const a = parseData(adm), r = parseData(ref);
  if (!a || !r) return 0;
  let n = 0;
  for (let m = 1; m <= r.m; m++) {
    const ini = a.a === r.a && a.m === m ? a.d : (a.a === r.a && m < a.m ? 99 : 1);
    if (ini === 99) continue;
    const fim = m === r.m ? r.d : dim(r.a, m);
    if (fim - ini + 1 >= 15) n += 1;
  }
  return n;
}

// ---------- direitos por modalidade (gabarito) ----------
// valores: "sim" | "nao" | "parcial"
export const VERBAS_DIREITO = [
  { key: "saldo", nome: "Saldo de salário" },
  { key: "aviso", nome: "Aviso prévio indenizado" },
  { key: "fv", nome: "Férias vencidas + 1/3" },
  { key: "fp", nome: "Férias proporcionais + 1/3" },
  { key: "d13", nome: "13º salário proporcional" },
  { key: "saque", nome: "Saque do FGTS" },
  { key: "multa", nome: "Multa rescisória do FGTS" },
  { key: "seguro", nome: "Seguro-desemprego (cumpridos os requisitos)" },
];
const DIREITOS = {
  sjc: { saldo: "sim", aviso: "sim", fv: "sim", fp: "sim", d13: "sim", saque: "sim", multa: "sim", seguro: "sim" },
  ped: { saldo: "sim", aviso: "nao", fv: "sim", fp: "sim", d13: "sim", saque: "nao", multa: "nao", seguro: "nao" },
  jc: { saldo: "sim", aviso: "nao", fv: "sim", fp: "nao", d13: "nao", saque: "nao", multa: "nao", seguro: "nao" },
  aco: { saldo: "sim", aviso: "parcial", fv: "sim", fp: "sim", d13: "sim", saque: "parcial", multa: "parcial", seguro: "nao" },
  ter: { saldo: "sim", aviso: "nao", fv: "sim", fp: "sim", d13: "sim", saque: "sim", multa: "nao", seguro: "nao" },
};
export const direitosDe = (mod) => DIREITOS[mod] || DIREITOS.sjc;
export const ROTULO_DIREITO = { sim: "Tem direito", nao: "Não tem direito", parcial: "Parcial (reduzido)" };

// ---------- caso ----------
export const CASO_PADRAO = {
  nome: "Empregado do caso (fictício)",
  admissao: "2023-03-01",
  desligamento: "2026-10-15",
  modalidade: "sjc",
  salario: 3000,
  periodosVencidos: 1, // 0 ou 1 período de férias vencido e não gozado, ainda dentro do prazo concessivo
  saldoFgts: 9800, // saldo da conta vinculada antes da rescisão
  provFerias: 6000, // saldo acumulado da provisão de férias + 1/3
  prov13: 2250, // saldo acumulado da provisão de 13º
};
export function casoEmUso(cfg) { return { ...CASO_PADRAO, ...(cfg || {}) }; }

export function calcularRescisao(casoCfg, p = PARAMETROS_PADRAO) {
  const c = casoEmUso(casoCfg);
  const dir = direitosDe(c.modalidade);
  const sal = Number(c.salario) || 0;
  const des = parseData(c.desligamento);
  const anos = anosCompletos(c.admissao, c.desligamento);
  const avisoDias = diasDeAviso(anos);
  const projDias = diasProjecao(c.modalidade, avisoDias);
  const dataProjetada = somarDias(c.desligamento, projDias);
  const diasSaldo = des ? (des.d === dim(des.a, des.m) ? 30 : des.d) : 0;
  const avF = avosFerias(c.admissao, dataProjetada);
  const av13 = avos13(c.admissao, dataProjetada);

  const saldo = r2((sal / 30) * diasSaldo);
  const avisoInteiro = r2((sal / 30) * avisoDias);
  const aviso = dir.aviso === "sim" ? avisoInteiro : dir.aviso === "parcial" ? r2(avisoInteiro / 2) : 0;
  const fv = dir.fv !== "nao" && Number(c.periodosVencidos) > 0 ? r2(sal) : 0;
  const fv3 = r2(fv / 3);
  const fp = dir.fp !== "nao" ? r2((sal / 12) * avF) : 0;
  const fp3 = r2(fp / 3);
  const d13 = dir.d13 !== "nao" ? r2((sal / 12) * av13) : 0;
  const feriasTotal = r2(fv + fv3 + fp + fp3);
  const bruto = r2(saldo + aviso + feriasTotal + d13);

  const baseFgts = r2(saldo + aviso + d13); // Súmula 305 TST: FGTS incide sobre o aviso indenizado; férias indenizadas ficam de fora
  const fgts8 = r2((baseFgts * p.fgts) / 100);
  const percMulta = dir.multa === "sim" ? 40 : dir.multa === "parcial" ? 20 : 0;
  const multa = r2(((Number(c.saldoFgts) || 0) + fgts8) * percMulta / 100);

  const baseInss = r2(saldo + d13); // aviso indenizado e férias indenizadas não entram
  const inss = r2((baseInss * p.inss) / 100), rat = r2((baseInss * p.rat) / 100), terceiros = r2((baseInss * p.terceiros) / 100);
  const encargosPatronais = r2(inss + rat + terceiros);

  const provF = Number(c.provFerias) || 0, prov13 = Number(c.prov13) || 0;
  const baixaFerias = r2(Math.min(feriasTotal, provF)), despFerias = r2(feriasTotal - baixaFerias);
  const baixa13 = r2(Math.min(d13, prov13)), desp13 = r2(d13 - baixa13);

  return {
    caso: c, anos, avisoDias, projDias, dataProjetada, diasSaldo, avF, av13,
    saldo, avisoInteiro, aviso, fv, fv3, fp, fp3, d13, feriasTotal, bruto,
    baseFgts, fgts8, percMulta, multa, baseInss, inss, rat, terceiros, encargosPatronais,
    baixaFerias, despFerias, baixa13, desp13, p,
  };
}

// ---------- incidências (gabarito) ----------
export const OPCOES_INSS_FGTS = [["incide", "Incide"], ["nao", "Não incide"], ["natureza", "Depende da natureza"]];
export const OPCOES_IRRF = [["tributa", "Tributável"], ["isento", "Isento"], ["exclusivo", "Exclusivo na fonte"], ["natureza", "Depende da natureza"]];
export const INCIDENCIAS = [
  { key: "saldo", nome: "Saldo de salário", inss: "incide", fgts: "incide", irrf: "tributa" },
  { key: "avtrab", nome: "Aviso prévio trabalhado", inss: "incide", fgts: "incide", irrf: "tributa" },
  { key: "avind", nome: "Aviso prévio indenizado", inss: "nao", fgts: "incide", irrf: "isento" },
  { key: "fv", nome: "Férias vencidas indenizadas", inss: "nao", fgts: "nao", irrf: "isento" },
  { key: "fp", nome: "Férias proporcionais indenizadas", inss: "nao", fgts: "nao", irrf: "isento" },
  { key: "terco", nome: "1/3 constitucional sobre férias indenizadas", inss: "nao", fgts: "nao", irrf: "isento" },
  { key: "d13", nome: "13º salário proporcional", inss: "incide", fgts: "incide", irrf: "exclusivo" },
  { key: "he", nome: "Horas extras, adicional noturno e comissões", inss: "incide", fgts: "incide", irrf: "tributa" },
  { key: "grat", nome: "Gratificações e PLR", inss: "natureza", fgts: "natureza", irrf: "natureza" },
  { key: "multa", nome: "Multa de 40% (ou 20%) do FGTS", inss: "nao", fgts: "nao", irrf: "isento" },
  { key: "outras", nome: "Outras indenizações", inss: "natureza", fgts: "nao", irrf: "natureza" },
];

// ---------- contas e lançamentos ----------
export const CONTAS_RESC = {
  despSalarios: "5.1.02", despEncargos: "5.1.03", despFerias: "5.1.09", despDecimo: "5.1.11",
  despAviso: "5.1.12", despMulta: "5.1.13",
  rescPagar: "2.1.3.03", inssPagar: "2.1.4.01", fgtsPagar: "2.1.4.03", ratPagar: "2.1.4.04", terceirosPagar: "2.1.4.05",
  provFerias: "2.1.5.01", prov13: "2.1.6.01", banco: "1.1.1.02.01",
};
export const CONTAS_NOVAS_RESC = [
  { codigo: "5.1.12", nome: "Aviso Prévio Indenizado", grupo: 5, subgrupo: "Despesas Administrativas" },
  { codigo: "5.1.13", nome: "Multa Rescisória do FGTS", grupo: 5, subgrupo: "Despesas Administrativas" },
  { codigo: "2.1.3.03", nome: "Rescisões a Pagar", grupo: 2, subgrupo: "Obrigações Trabalhistas" },
];

export function lancamentosDaRescisao(r) {
  const C = CONTAS_RESC;
  const D = (conta, valor) => ({ conta, tipo: "D", valor });
  const K = (conta, valor) => ({ conta, tipo: "C", valor });
  const nz = (ps) => ps.filter((p) => p.valor > 0);
  return [
    { key: "verbas", titulo: "Reconhecimento das verbas rescisórias", partidas: nz([
      D(C.despSalarios, r.saldo), D(C.despAviso, r.aviso),
      D(C.provFerias, r.baixaFerias), D(C.despFerias, r.despFerias),
      D(C.prov13, r.baixa13), D(C.despDecimo, r.desp13),
      K(C.rescPagar, r.bruto)]) },
    { key: "fgts", titulo: "FGTS rescisório e multa", partidas: nz([
      D(C.despEncargos, r.fgts8), D(C.despMulta, r.multa), K(C.fgtsPagar, r2(r.fgts8 + r.multa))]) },
    { key: "enc", titulo: "Encargos patronais sobre a rescisão", partidas: nz([
      D(C.despEncargos, r.encargosPatronais), K(C.inssPagar, r.inss), K(C.ratPagar, r.rat), K(C.terceirosPagar, r.terceiros)]) },
    { key: "pgto", titulo: "Pagamento das verbas rescisórias", partidas: nz([D(C.rescPagar, r.bruto), K(C.banco, r.bruto)]) },
  ].filter((l) => l.partidas.length > 0);
}

// ---------- documentos e prazos ----------
export const DOCUMENTOS = [
  { grupo: "Desligamento", itens: ["Carta de comunicação de dispensa", "TRCT (Termo de Rescisão do Contrato de Trabalho)", "Termo de devolução de equipamentos e materiais", "Comprovante de desativação de acessos e sistemas"] },
  { grupo: "Cálculo", itens: ["Memória de cálculo da rescisão", "Demonstrativo de verbas rescisórias", "Comprovante de pagamento das verbas", "Guia de recolhimento rescisório do FGTS"] },
  { grupo: "Obrigações", itens: ["Envio do evento S-2299 (desligamento) ao eSocial e retorno aceito", "Recolhimento do FGTS pelo FGTS Digital", "Guia da contribuição previdenciária", "Comprovante de quitação de multas (se houver)"] },
  { grupo: "Finalização", itens: ["Checklist de conferência final", "Declaração de quitação de verbas rescisórias", "Comprovante de entrega dos documentos ao empregado", "Protocolo de arquivamento (guardar por no mínimo 5 anos)"] },
];
export const TOTAL_DOCUMENTOS = DOCUMENTOS.reduce((s, g) => s + g.itens.length, 0);
// Prazo de pagamento: 10 dias corridos contados do término do contrato (CLT art. 477 §6º, redação da Lei 13.467/17).
export const PRAZO_PAGAMENTO_DIAS = 10;
export function prazoPagamento(desligamento) { return somarDias(desligamento, PRAZO_PAGAMENTO_DIAS); }
