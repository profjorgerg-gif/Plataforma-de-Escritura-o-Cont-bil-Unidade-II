import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase.js";

// Chamados de suporte (aluno <-> professor). Coleção própria:
// turmas/{turmaId}/chamados/{id} — não toca em nada do que o aluno já fez.
// - Com `matricula`: só os chamados daquele aluno (visão do aluno).
// - Sem `matricula`: todos os chamados da turma (visão do professor).
// Devolve { chamados, erro }: chamados === null enquanto carrega; `erro` vira
// true se o Firestore recusar (ex.: regras novas ainda não coladas no Console).
export function useChamados(turmaId, matricula) {
  const [estado, setEstado] = useState({ chamados: null, erro: false });
  useEffect(() => {
    if (!turmaId) { setEstado({ chamados: null, erro: false }); return; }
    const base = collection(db, "turmas", turmaId, "chamados");
    const q = matricula ? query(base, where("matricula", "==", matricula)) : base;
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (b.atualizadoEm?.toMillis?.() || 0) - (a.atualizadoEm?.toMillis?.() || 0));
        setEstado({ chamados: lista, erro: false });
      },
      () => setEstado({ chamados: [], erro: true })
    );
    return unsub;
  }, [turmaId, matricula]);
  return estado;
}
