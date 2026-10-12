// Sugestão automática de nota (0,0 a 10,0) por critério. Funções PURAS: o professor sempre pode alterar o número.
// Cada função devolve { chaveDoCriterio: nota | null }. null = sem base para sugerir (o professor digita).
// "Acerto" = o valor digitado pelo aluno confere com o gabarito do sistema (mesma tolerância das telas).
import { folhaEmUso, lancamentosDaFolha, conferirLancamento, nomeDoMes } from "./folha.js";
import { calcularRescisao, direitosDe, VERBAS_DIREITO, INCIDENCIAS, DOCUMENTOS, TOTAL_DOCUMENTOS, lancamentosDaRescisao, prazoPagamento, diasEntre } from "./rescisao.js";
import { calcularRazao, calcularDRE, calcularBP } from "./contabil.js";
import { balancoPorLinhas, dreParaLinhas, calcularIndicadores, capitalDeGiro, linhasBalanco, linhasDre, av, ah, lerNumero, confere } from "./agb.js";
import { EXERCICIOS, INDICADORES_CHAVE } from "./agbExercicios.js";

const n10 = (ok, total) => (total > 0 ? Math.round((ok / total) * 100) / 10 : null);
const get = (trab, sec, k) => (((trab || {})[sec] || {})[k]);
const txt = (v) => String(v ?? "").trim();
const okNum = (v, esp, tol) => { const n = lerNumero(v); return n !== null && esp !== null && esp !== undefined && Math.abs(n - esp) <= tol; };
const linhasTexto = (t) => String(t || "").split("\n").reduce((s, l) => s + (l.trim() === "" ? 0 : Math.ceil(l.length / 100)), 0);

// Dados contábeis do aluno (lançamentos aprovados) → balanço por linhas e DRE por linhas; null se não houver
export function dadosAnaliseAluno(lancamentos, contas) {
  const aprovados = (lancamentos || []).filter((l) => l.status === "aprovado");
  if (!contas || aprovados.length === 0) return null;
  const razao = calcularRazao(lancamentos, contas);
  const dre = calcularDRE(razao);
  const bp = calcularBP(razao, dre.resultadoExercicio);
  return { bpv: balancoPorLinhas(bp).valores, dre: dreParaLinhas(dre) };
}

// ---------------- Fase 2 · Folha, provisões e contabilização ----------------
export function sugestaoCa(trabCa, folhaCfg, lancamentos) {
  const f = folhaEmUso(folhaCfg), pv = f.provisoes, p = f.parametros;
  const enc = (e) => e; // legibilidade
  const itens = [];
  const r2 = (v) => Math.round(v * 100) / 100;
  f.calc.linhas.forEach((l, i) => {
    [["adic", l.adicional], ["he", l.horasExtras], ["dsr", l.dsr], ["bruta", l.bruta]].forEach(([k, e]) => itens.push(["folha", "e" + i + "_" + k, e]));
  });
  const encF = { inss: r2(f.calc.total * p.inss / 100), fgts: r2(f.calc.total * p.fgts / 100) };
  itens.push(["folha", "t_total", r2(f.calc.total)], ["folha", "t_inss", encF.inss], ["folha", "t_fgts", encF.fgts], ["folha", "t_custo", r2(f.calc.total + encF.inss + encF.fgts)]);
  [["sal", pv.salarios], ["fer", pv.ferias], ["terco", pv.tercoFerias], ["ferT", pv.feriasTotal], ["dec", pv.decimo]].forEach(([k, e]) => itens.push(["prov", "p_" + k, e]));
  [["s", pv.encSalarios], ["f", pv.encFerias], ["d", pv.enc13]].forEach(([b, e]) => {
    [["fgts", e.fgts], ["inss", e.inss], ["rat", e.rat], ["terc", e.terceiros], ["tot", e.total]].forEach(([k, v]) => itens.push(["prov", "e" + b + "_" + k, v]));
  });
  [["emp", pv.obrigacoesEmpregados], ["enc", pv.encargosTotal], ["geral", pv.totalGeral]].forEach(([k, v]) => itens.push(["prov", "c_" + k, v]));
  const acertos = itens.filter(([s, k, e]) => okNum(get(trabCa, s, k), e, 0.02)).length;

  const esperados = lancamentosDaFolha(pv);
  const mes = nomeDoMes(f.competencia);
  let conf = 0, aprov = 0;
  esperados.forEach((l) => {
    const n = Number(get(trabCa, "lanc", l.key + "_n")) || 2;
    const ps = Array.from({ length: n }, (_, i) => ({
      conta: get(trabCa, "lanc", l.key + "_" + i + "_conta"),
      tipo: get(trabCa, "lanc", l.key + "_" + i + "_tipo") || (i === 0 ? "D" : "C"),
      valor: lerNumero(get(trabCa, "lanc", l.key + "_" + i + "_valor")) ?? "",
      valorTxt: get(trabCa, "lanc", l.key + "_" + i + "_valor"),
    }));
    if (conferirLancamento(ps, l.partidas).ok) conf++;
    const hist = "Folha " + mes + " · " + l.titulo;
    if ((lancamentos || []).some((x) => x.historico === hist && x.status === "aprovado")) aprov++;
  });
  const efeitos = ["a", "b", "c", "d", "e"].filter((k) => txt(get(trabCa, "efeitos", k)) !== "").length;
  return { calculos: n10(acertos, itens.length), lancamentos: n10(conf + aprov, esperados.length * 2), efeitos: n10(efeitos, 5), parecer: null };
}

// ---------------- Fase 2 · Rescisão ----------------
export function sugestaoResc(trabCa, casoCfg, lancamentos) {
  const r = calcularRescisao(casoCfg), c = r.caso, dir = direitosDe(c.modalidade);
  const val = { anos: r.anos, avisoDias: r.avisoDias, projDias: r.projDias, avF: r.avF, av13: r.av13, saldo: r.saldo, aviso: r.aviso, fv: r.fv, fv3: r.fv3, fp: r.fp, fp3: r.fp3, d13: r.d13, bruto: r.bruto, baseFgts: r.baseFgts, fgts8: r.fgts8, multa: r.multa, baseInss: r.baseInss, inss: r.inss, rat: r.rat, terceiros: r.terceiros };
  const chaves = Object.keys(val);
  let ok = chaves.filter((k) => okNum(get(trabCa, "rcalc", k), val[k], 0.02)).length;
  let total = chaves.length;
  total += 1 + VERBAS_DIREITO.length;
  if (get(trabCa, "rcaso", "modalidade") === c.modalidade) ok++;
  ok += VERBAS_DIREITO.filter((v) => get(trabCa, "rcaso", "d_" + v.key) === dir[v.key]).length;
  const incOk = INCIDENCIAS.reduce((s, v) => s + ["inss", "fgts", "irrf"].filter((t) => get(trabCa, "rinc", v.key + "_" + t) === v[t]).length, 0);
  const lancs = lancamentosDaRescisao(r);
  const aprov = lancs.filter((l) => (lancamentos || []).some((x) => x.historico === "Rescisão " + c.nome + " · " + l.titulo && x.status === "aprovado")).length;
  const marc = DOCUMENTOS.reduce((s, g, gi) => s + g.itens.filter((_, i) => get(trabCa, "rdoc", "i_" + gi + "_" + i) === "1").length, 0);
  const pg = get(trabCa, "rdoc", "pagamento");
  const noPrazo = pg ? diasEntre(prazoPagamento(c.desligamento), pg) <= 0 : false;
  const docs = ((marc / TOTAL_DOCUMENTOS) * 0.8 + (noPrazo ? 0.2 : 0)) * 10;
  return { calculo: n10(ok, total), incidencias: n10(incOk, INCIDENCIAS.length * 3), contab: n10(aprov, lancs.length), docs: Math.round(docs * 10) / 10, parecer: null };
}

// ---------------- Fase 3 · AGB ----------------
const IND_CAMPOS = [
  ["liquidezCorrente", "x"], ["liquidezSeca", "x"], ["liquidezGeral", "x"], ["liquidezImediata", "x"], ["ccl", "rs"],
  ["pme", "dias"], ["pmr", "dias"], ["pmp", "dias"], ["cicloOperacional", "dias"], ["cicloFinanceiro", "dias"],
  ["participacaoCapTerceiros", "pct"], ["composicaoEndividamento", "pct"], ["imobilizacaoPL", "pct"], ["imobilizacaoRecNaoCorr", "pct"],
  ["margemBruta", "pct"], ["margemOperacional", "pct"], ["margemLiquida", "pct"], ["giroAtivo", "x"], ["roi", "pct"], ["roe", "pct"], ["alavancagem", "x"],
];
const TOL_IND = { x: 0.015, pct: 0.15, dias: 0.6, rs: 0.6 };
export function sugestaoAgb(trabAgb, dados, anterior) {
  const interp = ["av", "ah", "ind_liquidez", "ind_prazos", "ind_estrutura", "ind_rentabilidade", "giro"].filter((k) => k !== "ah" || (anterior && anterior.bp));
  const feitas = interp.filter((k) => txt(get(trabAgb, "interpretacoes", k)) !== "").length;
  const secoes = ["liquidez", "estrutura", "rentabilidade", "recomendacoes"].filter((k) => txt(get(trabAgb, "parecer", k)) !== "").length;
  const out = { calculos: null, interpretacoes: n10(feitas, interp.length), parecer: n10(secoes, 4) };
  if (!dados) return out;
  let ok = 0, total = 0;
  const conta = (digitado, esp, tol) => { if (esp === null || esp === undefined || !isFinite(esp)) return; total++; if (confere(digitado, esp, tol)) ok++; };
  [["bp", linhasBalanco(dados.bpv, anterior && anterior.bp)], ["dre", linhasDre(dados.dre, anterior && anterior.dre)]].forEach(([aba, tab]) => {
    const temAnt = !!(anterior && (aba === "dre" ? anterior.dre : anterior.bp));
    tab.rows.forEach((r) => {
      if (r.tipo === "bloco") return;
      const ck = aba + "_" + r.key;
      conta(get(trabAgb, "av", ck), av(r.atual, tab.base), 0.15);
      if (temAnt) conta(get(trabAgb, "ah", ck), ah(r.atual, r.ant), 0.15);
    });
  });
  const ind = calcularIndicadores(dados.bpv, dados.dre, txt(get(trabAgb, "config", "dias")) === "365" ? 365 : 360);
  IND_CAMPOS.forEach(([k, tipo]) => conta(get(trabAgb, "calculos", "ind_" + k), ind[k] === null || ind[k] === undefined ? null : (tipo === "pct" ? ind[k] * 100 : ind[k]), TOL_IND[tipo]));
  const g = capitalDeGiro(dados.bpv);
  ["cgl", "ncg", "st"].forEach((k) => conta(get(trabAgb, "calculos", "giro_" + k), g[k], 0.6));
  out.calculos = n10(ok, total);
  return out;
}

// ---------------- Fase 3 · Comparativo ----------------
export function sugestaoComp(trabAgb, liberados) {
  const exs = EXERCICIOS.filter((e) => (liberados || []).includes(e.id));
  let ok = 0, total = 0;
  const TOL = { x: 0.015, pct: 0.15, dias: 0.6 };
  exs.forEach((e) => {
    const ind = calcularIndicadores(e.bp, e.dre, 360), g = capitalDeGiro(e.bp);
    INDICADORES_CHAVE.forEach((it) => { const v = ind[it.k]; if (v === null || v === undefined || !isFinite(v)) return; total++; if (confere(get(trabAgb, e.id, "ind_" + it.k), it.tipo === "pct" ? v * 100 : v, TOL[it.tipo])) ok++; });
    ["cgl", "ncg", "st"].forEach((k) => { total++; if (confere(get(trabAgb, e.id, "giro_" + k), g[k], 0.6)) ok++; });
  });
  const l = linhasTexto(get(trabAgb, "comp", "texto"));
  return { exercicios: n10(ok, total), parecer: txt(get(trabAgb, "comp", "texto")) ? Math.min(10, Math.round(l) ) : null };
}

export function sugestaoEtapa(etapaId, ctx) {
  try {
    if (etapaId === "ca") return sugestaoCa(ctx.trabCa, ctx.folhaCfg, ctx.lancamentos);
    if (etapaId === "resc") return sugestaoResc(ctx.trabCa, ctx.casoCfg, ctx.lancamentos);
    if (etapaId === "agb") return sugestaoAgb(ctx.trabAgb, dadosAnaliseAluno(ctx.lancamentos, ctx.contas), ctx.anterior);
    if (etapaId === "comp") return sugestaoComp(ctx.trabAgb, ctx.liberados);
  } catch (e) { /* sem sugestão */ }
  return {};
}
