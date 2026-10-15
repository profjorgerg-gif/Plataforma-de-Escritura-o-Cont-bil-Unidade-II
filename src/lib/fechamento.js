// Fechamento por prazo (2026-10-15). Funções puras, sem Firestore.
// Regra: a etapa fecha ao fim do dia do prazo (23h59, horário de Brasília). O prazo vem de "Etapas e prazos" da turma;
// prorrogar o prazo reabre a etapa. Só vale quando o professor já configurou o roteiro da turma.
import { etapasEfetivas } from "./roteiro.js";

export const fimDoPrazo = (prazo) => (prazo ? new Date(prazo + "T23:59:59.999-03:00") : null);

// { fechada, prazo, limite } para uma etapa; config = roteiro/config da turma (null = não configurado = nunca fecha)
export function situacaoPrazo(etapaId, config, agora = new Date()) {
  if (!config) return { fechada: false, prazo: "", limite: null, configurado: false };
  const e = etapasEfetivas(config).find((x) => x.id === etapaId);
  if (!e || !e.prazo) return { fechada: false, prazo: "", limite: null, configurado: true };
  const limite = fimDoPrazo(e.prazo);
  return { fechada: agora.getTime() > limite.getTime(), prazo: e.prazo, limite, configurado: true };
}

// Limites por etapa, para gravar em roteiro/fechamento (as regras do Firestore leem este documento)
export function limitesDasEtapas(config) {
  const out = {};
  if (!config) return out;
  etapasEfetivas(config).forEach((e) => { if (e.prazo) out[e.id] = fimDoPrazo(e.prazo); });
  return out;
}
export const mesmosLimites = (atual, novos) => {
  const a = atual || {};
  const ks = Object.keys(novos);
  if (Object.keys(a).filter((k) => k !== "atualizadoEm").length !== ks.length) return false;
  return ks.every((k) => {
    const v = a[k] && a[k].toMillis ? a[k].toMillis() : a[k] instanceof Date ? a[k].getTime() : null;
    return v === novos[k].getTime();
  });
};

export const diasPara = (prazo, agora = new Date()) => {
  if (!prazo) return null;
  const lim = fimDoPrazo(prazo);
  return Math.ceil((lim.getTime() - agora.getTime()) / 86400000);
};

// Botões que gravam/alteram dados: bloqueados (na tela) em etapa fechada
export const RE_ACAO_QUE_GRAVA = /(salvar|enviar|reenviar|excluir|apagar|remover|editar|nova |novo |adicionar|incluir|gravar|limpar|usar no lan|usar estes|receber meu caso|marcar|confirmar|criar|lançar|lancar|conferir digita|importar|carregar exemplo|restaurar|zerar|refazer)/i;
