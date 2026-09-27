import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

// Mesma ideia do useProgressoAluno, mas para TODOS os alunos de uma turma de
// uma vez — um listener por coleção por aluno, no mesmo padrão do
// useLancamentosDaTurma. Alimenta o componente "Completude do ciclo" da
// rubrica de avaliação no Painel do Professor. Para o tamanho de uma turma
// (dezenas de alunos), isso é aceitável; não usa collectionGroup para não
// exigir campo de turma redundante em cada subcoleção.
export function useProgressoTurma(turmaId, alunos) {
  const [digitacoesPorMatricula, setDigitacoesPorMatricula] = useState({});
  const [analisesPorMatricula, setAnalisesPorMatricula] = useState({});
  const [classificacoesPorMatricula, setClassificacoesPorMatricula] = useState({});

  useEffect(() => {
    if (!turmaId || !alunos) return;
    const unsubs = [];
    alunos.forEach((a) => {
      unsubs.push(
        onSnapshot(collection(db, "turmas", turmaId, "alunos", a.matricula, "digitacoesNFe"), (snap) => {
          setDigitacoesPorMatricula((prev) => ({
            ...prev,
            [a.matricula]: Object.fromEntries(snap.docs.map((d) => [d.id, d.data()])),
          }));
        })
      );
      unsubs.push(
        onSnapshot(collection(db, "turmas", turmaId, "alunos", a.matricula, "analisesFiscais"), (snap) => {
          setAnalisesPorMatricula((prev) => ({
            ...prev,
            [a.matricula]: Object.fromEntries(snap.docs.map((d) => [d.id, d.data()])),
          }));
        })
      );
      unsubs.push(
        onSnapshot(collection(db, "turmas", turmaId, "alunos", a.matricula, "classificacoes"), (snap) => {
          setClassificacoesPorMatricula((prev) => ({
            ...prev,
            [a.matricula]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          }));
        })
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [turmaId, alunos]);

  return { digitacoesPorMatricula, analisesPorMatricula, classificacoesPorMatricula };
}
