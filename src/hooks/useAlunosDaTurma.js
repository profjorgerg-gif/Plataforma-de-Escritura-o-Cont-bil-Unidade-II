import { useEffect, useState } from "react";
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
