// Roteiro por etapas — situação de cada etapa para um aluno.
// estado (professor escreve): { etapas: { [id]: { status: "liberada"|"aprovada"|"ajustar", retorno, em } } }
// entregas (aluno escreve):   { [id]: "2026-10-20T10:00:00Z" }
// Regra: a primeira etapa já nasce liberada; as demais só abrem quando o professor libera.
import { ETAPAS } from "./avaliacao.js";

export function etapasEfetivas(config) {
  const salvas = (config && config.etapas) || [];
  return ETAPAS.map((e) => {
    const s = salvas.find((x) => x.id === e.id) || {};
    return { ...e, prazo: s.prazo || "", descricao: s.descricao || e.descricao, entrega: s.entrega || e.entrega, ativa: s.ativa !== false };
  }).filter((e) => e.ativa);
}

export function situacaoEtapa(lista, i, estado, entregas) {
  const e = lista[i];
  const reg = ((estado && estado.etapas) || {})[e.id] || {};
  const entregue = !!(entregas && entregas[e.id]);
  if (reg.status === "aprovada") return { cod: "aprovada", rotulo: "Aprovada", classe: "ok", reg, entregue };
  if (reg.status === "ajustar") return { cod: "ajustar", rotulo: "Ajustar e reenviar", classe: "bad", reg, entregue };
  const liberada = reg.status === "liberada" || (i === 0 && !reg.status);
  if (!liberada) return { cod: "bloqueada", rotulo: "Bloqueada", classe: "gray", reg, entregue };
  if (entregue) return { cod: "entregue", rotulo: "Entregue, aguardando análise", classe: "info", reg, entregue };
  return { cod: "liberada", rotulo: "Liberada", classe: "warn", reg, entregue };
}
export const etapaAtual = (lista, estado, entregas) => {
  for (let i = 0; i < lista.length; i++) { const s = situacaoEtapa(lista, i, estado, entregas); if (s.cod !== "aprovada") return i; }
  return lista.length - 1;
};
