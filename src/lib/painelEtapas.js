// Painel da turma por etapa (2026-10-16). Só LEITURA: conta o que o aluno já gravou em cada parte.
// Etapa 1 continua como sempre (notas, fila de correção). Etapas 2–6: "campos preenchidos" por passo.
import { EXERCICIOS } from "./agbExercicios.js";

// Quantos campos com conteúdo existem dentro de um valor gravado (texto, número, objeto ou lista).
export function contarPreenchidos(v) {
  if (v == null) return 0;
  if (typeof v === "string") return v.trim() ? 1 : 0;
  if (typeof v === "number") return Number.isFinite(v) ? 1 : 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (Array.isArray(v)) return v.reduce((t, x) => t + contarPreenchidos(x), 0);
  if (typeof v === "object") return Object.values(v).reduce((t, x) => t + contarPreenchidos(x), 0);
  return 0;
}
const secao = (t, nome) => contarPreenchidos(t && t[nome]);
const comPrefixo = (obj, pre) => contarPreenchidos(Object.entries(obj || {}).filter(([k]) => k.startsWith(pre)).map(([, v]) => v));
const IDS_EX = EXERCICIOS.map((e) => e.id);

// fonte: "ca" (trabalho da folha/rescisão) ou "agb"; cada passo diz como contar.
export const ETAPAS_PAINEL = [
  { id: "geral", rot: "Visão geral", sub: "as 6 etapas" },
  { id: "f1", n: 1, rot: "Escrituração", sub: "CI" },
  { id: "fp", n: 2, rot: "Folha de pagamento", sub: "CA", lib: "ca", passos: [["Elaborar a folha", "ca", (t) => secao(t, "fp")]] },
  { id: "ca", n: 3, rot: "Folha, provisões e contabilização", sub: "CA", lib: "ca", passos: [
    ["Folha do mês", "ca", (t) => secao(t, "folha")], ["Provisões e encargos", "ca", (t) => secao(t, "prov")],
    ["Contabilização", "ca", (t) => secao(t, "lanc")], ["Efeitos nas demonstrações", "ca", (t) => secao(t, "efeitos")],
    ["Parecer técnico", "ca", (t) => secao(t, "parecer")] ] },
  { id: "resc", n: 4, rot: "Rescisão trabalhista", sub: "CA", lib: "resc", passos: [
    ["Caso e direitos", "ca", (t) => secao(t, "rcaso")], ["Cálculo das verbas", "ca", (t) => secao(t, "rcalc")],
    ["Incidências", "ca", (t) => secao(t, "rinc")], ["Contabilização", "ca", (t) => secao(t, "rlanc")],
    ["Documentos e prazos", "ca", (t) => secao(t, "rdoc")], ["Conferência final", "ca", (t) => secao(t, "rparecer")] ] },
  { id: "agb", n: 5, rot: "Análise gerencial de balanços", sub: "AGB", lib: "agb", passos: [
    ["Análise vertical e horizontal", "agb", (t) => secao(t, "av") + secao(t, "ah")],
    ["Indicadores", "agb", (t) => comPrefixo(t && t.calculos, "ind_") + comPrefixo(t && t.interpretacoes, "ind_") + secao(t, "config")],
    ["Capital de giro", "agb", (t) => comPrefixo(t && t.calculos, "giro_") + contarPreenchidos(t && t.interpretacoes && t.interpretacoes.giro)],
    ["Parecer e relatório final", "agb", (t) => secao(t, "parecer")] ] },
  { id: "comp", n: 6, rot: "Análise comparativa", sub: "AGB", lib: "agb", passos: [
    ["Exercícios comparativos", "agb", (t) => IDS_EX.reduce((s, id) => s + secao(t, id), 0)],
    ["Comparativo entre empresas", "agb", (t) => secao(t, "comp")] ] },
];
export const etapaPorId = (id) => ETAPAS_PAINEL.find((e) => e.id === id) || ETAPAS_PAINEL[1];

// Quantidade preenchida por passo, para um aluno. `dadosAluno` = { caTrab, agbTrab }.
export function contagemDoAluno(etapa, dadosAluno) {
  const d = dadosAluno || {};
  return (etapa.passos || []).map(([, fonte, f]) => f(fonte === "ca" ? d.caTrab : d.agbTrab) || 0);
}
