import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

// Lê turmas/{turmaId}/alunos/{matricula} do PRÓPRIO aluno — nota, desconto,
// prazo, notaLiberada. Antes desta rubrica, nada no app lia esse documento
// do lado do aluno: a nota existia no Firestore, mas não havia nenhuma tela
// mostrando-a de volta para quem a recebeu.
export function useMeuRegistroDeAluno(turmaId, matricula) {
  const [registro, setRegistro] = useState(null); // null = carregando

  useEffect(() => {
    if (!turmaId || !matricula) return;
    const unsub = onSnapshot(doc(db, "turmas", turmaId, "alunos", matricula), (snap) => {
      setRegistro(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, [turmaId, matricula]);

  return registro;
}
