import { useAlunosDaTurma } from "./useAlunosDaTurma.js";
import { useCaTurma, useTrabalhosCaDaTurma } from "./useCa.js";
import { useAgbTurma, useTrabalhosAgbDaTurma } from "./useAgb.js";
import { useRescisaoTurma } from "./useRescisao.js";
import { usePlanoContas } from "./usePlanoContas.js";
import { useLancamentosDaTurma } from "./useRoteiro.js";
import { resumoAtividade } from "../lib/folhaAtividade.js";
import { casoDoEmpregado, opcoesDoEmpregado } from "../lib/enunciadosCA.js";
import { folhaEmUso } from "../lib/folha.js";
import { folhaDoAluno } from "../lib/folhaAluno.js";
import { sugestaoEtapa } from "../lib/notasAuto.js";

// Notas sugeridas pelo sistema (as mesmas da Avaliação das etapas) para qualquer aluno e etapa. SÓ LEITURA.
export function useSugestoesAvaliacao(tid, alunosEntrada) {
  const alunosProprios = useAlunosDaTurma(alunosEntrada ? null : tid);
  const alunos = alunosEntrada || alunosProprios;
  const ca = useCaTurma(tid);
  const agb = useAgbTurma(tid);
  const resc = useRescisaoTurma(tid);
  const { contas } = usePlanoContas();
  const { mapa: trabCa } = useTrabalhosCaDaTurma(tid, alunos);
  const { mapa: trabAgb } = useTrabalhosAgbDaTurma(tid, alunos);
  const lancs = useLancamentosDaTurma(tid, alunos, true);
  const pronto = !!(alunos && trabCa && trabAgb && lancs && contas && ca.config !== undefined && agb.anterior !== undefined);
  function sugestoes(a, etapaId) {
    if (!pronto || etapaId === "f1") return {};
    if (etapaId === "fp") {
      const ids = ((ca.config && ca.config.empregados) || []).map((e) => e.id);
      const { competencia: comp, parametros: parFolha } = folhaEmUso(ca.folha);
      const r = resumoAtividade(((trabCa || {})[a.matricula] || {}).fp || {}, ids, ids.length, (id) => casoDoEmpregado(a.matricula, id, comp, opcoesDoEmpregado(ca.config, id)), parFolha);
      return { calculos: r.notaCalculos, quantidade: r.notaQuantidade };
    }
    return sugestaoEtapa(etapaId, {
      trabCa: (trabCa || {})[a.matricula], trabAgb: (trabAgb || {})[a.matricula], folhaCfg: folhaDoAluno(ca.folha, ca.config, a.matricula), folhaTurma: ca.folha, casoCfg: resc.caso,
      lancamentos: (lancs || {})[a.matricula] || [], contas, anterior: agb.anterior, liberados: (agb.config && agb.config.exerciciosLiberados) || [],
    });
  }
  return { pronto, sugestoes };
}
