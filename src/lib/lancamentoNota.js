// Lançamento da nota aprovada (Laboratório 2027.1, fase 4). Funções puras, sem banco. Regras = Guia de lançamentos da turma:
// compra e venda a prazo; imposto da compra a recuperar; imposto da venda como dedução em lançamento da mesma nota; sem CMV. Valores = os destacados no arquivo.
import { PLANO_CONTAS_OFICIAL } from "../data/planoContasOficial.js";

export const CONTAS_LANCAMENTO = ["1.1.3.01", "1.1.2.11", "1.1.2.14", "1.1.2.15", "2.1.1.01", "2.1.1.02", "1.1.2.01", "1.1.2.02", "4.1.1.01", "4.2.01", "4.2.02", "2.1.8.04", "2.1.8.05", "2.1.8.06", "1.1.1.01"];
export const nomeConta = (cod) => (PLANO_CONTAS_OFICIAL.find((c) => c.codigo === cod) || {}).nome || cod;
const r2 = (v) => Math.round((Number(v) + 1e-9) * 100) / 100;
const equivalente = (c) => (c === "2.1.1.02" ? "2.1.1.01" : c === "1.1.2.02" ? "1.1.2.01" : c);
export const numeroBr = (v) => { const s = String(v ?? "").trim(); if (!s) return 0; const x = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s; return Number(x) || 0; };

// nota = resultado de lerXml. Partidas esperadas: [conta, "D"|"C", valor]
export function partidasEsperadas(nota) {
  const t = nota.total, i = nota.icms, p = nota.pis, c = nota.cofins;
  if (nota.direcao === "entrada") return [["1.1.3.01", "D", r2(t - i - p - c)], ["1.1.2.11", "D", i], ["1.1.2.14", "D", p], ["1.1.2.15", "D", c], ["2.1.1.01", "C", t]].filter((x) => x[2]);
  return [["1.1.2.01", "D", t], ["4.1.1.01", "C", t], ["4.2.01", "D", i], ["2.1.8.04", "C", i], ["4.2.02", "D", r2(p + c)], ["2.1.8.05", "C", p], ["2.1.8.06", "C", c]].filter((x) => x[2]);
}

// linhas = [{ conta, tipo, valor(texto) }]. Devolve lista de mensagens (vazia = conferido). Não revela os valores certos.
export function conferirLancamento(nota, linhas) {
  const msg = [], ag = {};
  let deb = 0, cre = 0;
  (linhas || []).forEach((l) => {
    const v = numeroBr(l.valor);
    if (l.tipo === "D") deb += v; else cre += v;
    if (l.conta && v) { const k = equivalente(l.conta) + "|" + l.tipo; ag[k] = r2((ag[k] || 0) + v); }
  });
  if (!Object.keys(ag).length) return ["Preencha as linhas do lançamento."];
  if (Math.abs(deb - cre) > 0.009) msg.push("O total dos débitos é diferente do total dos créditos.");
  if ((linhas || []).some((l) => l.conta === "1.1.1.01" && numeroBr(l.valor))) msg.push("Compra e venda desta etapa são a prazo: não use Caixa.");
  const usados = new Set();
  partidasEsperadas(nota).forEach(([c, t, v]) => {
    const k = c + "|" + t; usados.add(k);
    const a = ag[k], lado = t === "D" ? "débito" : "crédito";
    if (a === undefined) msg.push("Falta " + nomeConta(c) + " no " + lado + ".");
    else if (Math.abs(a - v) > 0.02) msg.push("O valor de " + nomeConta(c) + " no " + lado + " não confere com a nota.");
  });
  Object.keys(ag).forEach((k) => { if (!usados.has(k)) { const [c, t] = k.split("|"); msg.push("Linha a mais: " + nomeConta(c) + " no " + (t === "D" ? "débito" : "crédito") + " não é esperada neste lançamento."); } });
  return msg;
}

export function saldosDoRazao(lancamentos) {
  const ac = {};
  (lancamentos || []).forEach((l) => (l.linhas || []).forEach((x) => { if (!x.conta) return; const a = ac[x.conta] || (ac[x.conta] = [0, 0]); a[x.tipo === "D" ? 0 : 1] += numeroBr(x.valor); }));
  return Object.keys(ac).sort().map((c) => ({ conta: c, nome: nomeConta(c), debitos: r2(ac[c][0]), creditos: r2(ac[c][1]), saldo: r2(ac[c][0] - ac[c][1]) }));
}
