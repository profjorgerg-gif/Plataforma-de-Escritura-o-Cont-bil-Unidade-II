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
