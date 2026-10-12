import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";

// Fase 2 (CA) — Rescisão. Dado NOVO, em documento novo da coleção já existente:
//   turmas/{t}/ca/rescisao  → { nome, admissao, desligamento, modalidade, salario, periodosVencidos, saldoFgts, provFerias, prov13 }  (professor escreve)
// A liberação fica em turmas/{t}/ca/config → { rescisaoLiberada } (professor escreve).
// O trabalho do aluno fica em turmas/{t}/alunos/{m}/ca/trabalho, em seções novas (rcaso, rcalc, rinc, rlanc, rdoc, rparecer),
// gravado pelo mesmo useTrabalhoCa da folha — nada do que o aluno já digitou na folha é tocado.
export function useRescisaoTurma(turmaId) {
  const [caso, setCaso] = useState(undefined); // undefined = carregando; null = não cadastrado
  useEffect(() => {
    if (!turmaId) return;
    return onSnapshot(doc(db, "turmas", turmaId, "ca", "rescisao"), (s) => setCaso(s.exists() ? s.data() : null), () => setCaso(null));
  }, [turmaId]);
  return { caso };
}
export async function salvarCasoRescisao(turmaId, dados) { await setDoc(doc(db, "turmas", turmaId, "ca", "rescisao"), dados); }
