import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

// Progresso do aluno por documento fiscal — alimenta o checklist guiado em
// "Meu progresso" (Digitação → Análise fiscal → Classificação → Livro
// diário). Três listeners simples, no mesmo padrão dos demais hooks do
// projeto (um por coleção, sem consulta composta).
export function useProgressoAluno(turmaId, matricula) {
  const [digitacoes, setDigitacoes] = useState(null); // { [documentoId]: dados }
  const [analises, setAnalises] = useState(null); // { [documentoId]: dados }
  const [classificacoes, setClassificacoes] = useState(null); // [ { id, documento, ... } ]

  useEffect(() => {
    if (!turmaId || !matricula) return;
    const unsub1 = onSnapshot(collection(db, "turmas", turmaId, "alunos", matricula, "digitacoesNFe"), (snap) =>
      setDigitacoes(Object.fromEntries(snap.docs.map((d) => [d.id, d.data()])))
    );
    const unsub2 = onSnapshot(collection(db, "turmas", turmaId, "alunos", matricula, "analisesFiscais"), (snap) =>
      setAnalises(Object.fromEntries(snap.docs.map((d) => [d.id, d.data()])))
    );
    const unsub3 = onSnapshot(collection(db, "turmas", turmaId, "alunos", matricula, "classificacoes"), (snap) =>
      setClassificacoes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [turmaId, matricula]);

  return { digitacoes, analises, classificacoes };
}
