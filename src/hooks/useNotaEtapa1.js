import { useLancamentosDaTurma } from "./useLancamentosDaTurma.js";
import { useDocumentosDaTurma } from "./useDocumentosDaTurma.js";
import { useProgressoTurma } from "./useProgressoTurma.js";
import { usePlanoContas } from "./usePlanoContas.js";
import { completudeCiclo, autonomiaCorrecoes, notaFinalPonderada, qualidadeTecnicaAutomatica } from "../lib/contabil.js";

// Nota da Etapa 1 de cada aluno, calculada como na tela Notas (completude + qualidade técnica + autonomia − desconto). SÓ LEITURA.
// final = true quando o professor já digitou a qualidade técnica; senão usa a sugestão automática (nota parcial).
export function useNotaEtapa1(turma, alunos) {
  const { todos } = useLancamentosDaTurma(turma && turma.id, alunos);
  const documentos = useDocumentosDaTurma(turma && turma.id);
  const prog = useProgressoTurma(turma && turma.id, alunos);
  const { contas } = usePlanoContas();
  if (!alunos || !todos || !documentos || !prog) return null;
  const out = {};
  alunos.forEach((a) => {
    const lancs = todos.filter((t) => t.aluno.matricula === a.matricula).map((t) => t.lancamento);
    const comp = completudeCiclo(documentos, prog.digitacoesPorMatricula[a.matricula], prog.analisesPorMatricula[a.matricula], prog.classificacoesPorMatricula[a.matricula], lancs);
    const aut = autonomiaCorrecoes(lancs);
    const desc = a.descontoManual ? (Number(a.desconto) || 0) : 0; // sem desconto automático de atraso (decisão do professor, 13/11/2026); só o desconto lançado à mão
    const temNota = a.nota !== null && a.nota !== undefined && a.nota !== "";
    let q = temNota ? a.nota : null;
    if (!temNota) {
      const qa = qualidadeTecnicaAutomatica({ documentos, lancamentos: lancs, analises: prog.analisesPorMatricula[a.matricula], classificacoes: prog.classificacoesPorMatricula[a.matricula], contas: contas || [] });
      q = qa && qa.notaSugerida !== undefined ? qa.notaSugerida : null;
    }
    const v = notaFinalPonderada({ completudePct: comp, qualidadeNota: q, autonomiaPct: aut === null ? 0 : aut, // sem nenhum lançamento aprovado não há autonomia a creditar (antes dava 2,0 de graça) desconto: desc });
    out[a.matricula] = { v: v === null ? null : Math.round(v * 10) / 10, final: temNota, liberada: !!a.notaLiberada };
  });
  return out;
}
