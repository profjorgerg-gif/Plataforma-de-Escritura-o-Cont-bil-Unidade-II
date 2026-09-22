import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { calcularRazao, calcularDRE, calcularBP } from "../lib/contabil.js";
import { usePlanoContas } from "./usePlanoContas.js";

// Um único listener de lançamentos + os mesmos cálculos puros do protótipo,
// reaproveitado por Diário, Razão, Balancete, ARE, DRE e Balanço Patrimonial
// — nenhuma dessas telas precisa recalcular nada por conta própria.
export function useEscrituracao(turmaId, matricula) {
  const contas = usePlanoContas();
  const [lancamentos, setLancamentos] = useState(null); // null = carregando

  useEffect(() => {
    if (!turmaId || !matricula) return;
    const ref = collection(db, "turmas", turmaId, "alunos", matricula, "lancamentos");
    const unsub = onSnapshot(ref, (snap) => {
      setLancamentos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [turmaId, matricula]);

  const razao = useMemo(() => {
    if (!contas || !lancamentos) return null;
    return calcularRazao(lancamentos, contas);
  }, [contas, lancamentos]);

  const dre = useMemo(() => (razao ? calcularDRE(razao) : null), [razao]);
  const bp = useMemo(() => (razao && dre ? calcularBP(razao, dre.resultadoExercicio) : null), [razao, dre]);

  return {
    carregando: !contas || !lancamentos,
    contas, lancamentos, razao, dre, bp,
  };
}
