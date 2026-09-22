import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

// Um listener por aluno da turma — cada um mantido vivo enquanto a tela
// estiver aberta. Para o tamanho de uma turma (dezenas de alunos, não
// milhares), isso é preferível a uma collectionGroup query com filtro por
// turma (que exigiria guardar turmaId redundante em cada lançamento só
// para essa consulta).
export function useLancamentosDaTurma(turmaId, alunos) {
  const [porMatricula, setPorMatricula] = useState({});

  useEffect(() => {
    if (!turmaId || !alunos) return;
    const unsubs = alunos.map((a) => {
      const ref = collection(db, "turmas", turmaId, "alunos", a.matricula, "lancamentos");
      return onSnapshot(ref, (snap) => {
        setPorMatricula((prev) => ({ ...prev, [a.matricula]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [turmaId, alunos]);

  const todos = (alunos || []).flatMap((a) => (porMatricula[a.matricula] || []).map((l) => ({ aluno: a, lancamento: l })));
  return { porMatricula, todos };
}
