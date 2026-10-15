// Fluxo por etapas com envio e aprovação (semestre 2027.1) — Fase 1: só a configuração do professor.
// Documento: turmas/{turmaId}/roteiro/lotes  (o professor escreve; os alunos só leem)
//   { fluxoAtivo: false, lotes: [{ id, nome, documentos: [docId], liberado: false, prazo: "" }] }
// Enquanto fluxoAtivo for false (padrão), NADA muda para os alunos. Nesta fase as telas do aluno
// ainda não leem este documento.
export const PASSOS_FLUXO = [
  { key: "digitacao", rotulo: "1 · Digitação da NF-e" },
  { key: "analise", rotulo: "2 · Análise fiscal" },
  { key: "classificacao", rotulo: "3 · Classificação contábil" },
];

export const FLUXO_VAZIO = { fluxoAtivo: false, lotes: [] };

export function normalizarFluxo(d) {
  const lotes = Array.isArray(d?.lotes) ? d.lotes : [];
  return {
    fluxoAtivo: d?.fluxoAtivo === true,
    lotes: lotes.map((l, i) => ({
      id: l.id || "L" + (i + 1),
      nome: l.nome || "Lote " + (i + 1),
      documentos: Array.isArray(l.documentos) ? l.documentos : [],
      liberado: l.liberado === true,
      prazo: l.prazo || "",
    })),
  };
}

export function proximoIdLote(lotes) {
  let n = lotes.length + 1;
  while (lotes.some((l) => l.id === "L" + n)) n++;
  return "L" + n;
}

// Documentos da turma que ainda não estão em nenhum lote.
export function documentosSemLote(documentos, lotes) {
  const usados = new Set(lotes.flatMap((l) => l.documentos));
  return (documentos || []).filter((d) => !usados.has(d.id));
}

// ---------- Fase 2: situação do aluno no fluxo ----------
export const idFluxo = (loteId, passo) => loteId + "_" + passo;

// cfg = documento roteiro/lotes normalizado; docs = { [idFluxo]: {status, orientacao, ...} } do aluno.
// Retorna null quando o fluxo não está ligado (tudo funciona como sempre).
export function estadoFluxo(cfg, docs) {
  if (!cfg || !cfg.fluxoAtivo) return null;
  const st = (loteId, passo) => (docs && docs[idFluxo(loteId, passo)]) || null;
  const aprovado = (loteId, passo) => st(loteId, passo)?.status === "aprovado";
  // lote atual = o primeiro lote liberado cuja classificação ainda não foi aprovada
  const liberados = cfg.lotes.filter((l) => l.liberado && l.documentos.length > 0);
  const lote = liberados.find((l) => !aprovado(l.id, "classificacao")) || null;
  const concluidos = liberados.filter((l) => aprovado(l.id, "classificacao")).length;
  if (!lote) return { ativo: true, lote: null, concluidos, totalLiberados: liberados.length, passos: {} };
  const situacao = (passo, liberado) => {
    const d = st(lote.id, passo);
    return { liberado, status: !liberado ? "bloqueada" : (d?.status || "andamento"), orientacao: d?.orientacao || "", registro: d };
  };
  const dOk = aprovado(lote.id, "digitacao");
  const aOk = aprovado(lote.id, "analise");
  return {
    ativo: true, lote, concluidos, totalLiberados: liberados.length,
    passos: {
      digitacao: situacao("digitacao", true),
      analise: situacao("analise", dOk),
      classificacao: situacao("classificacao", dOk && aOk),
    },
  };
}
export const passoEditavel = (p) => !!p && p.liberado && (p.status === "andamento" || p.status === "devolvido");
