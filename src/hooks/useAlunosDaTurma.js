import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

export function useAlunosDaTurma(turmaId) {
  const [alunos, setAlunos] = useState(null); // null = carregando
  useEffect(() => {
    if (!turmaId) return;
    const unsub = onSnapshot(collection(db, "turmas", turmaId, "alunos"), (snap) =>
      setAlunos(snap.docs.map((d) => ({ matricula: d.id, ...d.data() })))
    );
    return unsub;
  }, [turmaId]);
  return alunos;
}

// Só os alunos de verdade (sem as contas de teste do professor). Usado nos relatórios e estatísticas da turma,
// para que o teste do professor não entre em médias, contagens e notas.
export function useAlunosReaisDaTurma(turmaId) {
  const todos = useAlunosDaTurma(turmaId);
  return useMemo(() => (todos ? todos.filter((a) => !a.contaTeste) : todos), [todos]);
}
