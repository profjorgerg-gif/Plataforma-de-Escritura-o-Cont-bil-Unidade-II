import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

// Lê um único documento turmas/{turmaId} em tempo real. Usado do lado do
// aluno para recalcular o desconto por atraso do mesmo jeito que o Painel do
// Professor faz (precisa de prazoUnidadeII/penalidadeAtrasoFixa/
// descontoPorDiaAtraso, que vivem na turma, não no registro do aluno).
export function useTurma(turmaId) {
  const [turma, setTurma] = useState(null);

  useEffect(() => {
    if (!turmaId) return;
    const unsub = onSnapshot(doc(db, "turmas", turmaId), (snap) => setTurma(snap.exists() ? { id: snap.id, ...snap.data() } : null));
    return unsub;
  }, [turmaId]);

  return turma;
}
