import { useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { useRoteiroTurma } from "./useRoteiro.js";
import { limitesDasEtapas, mesmosLimites } from "../lib/fechamento.js";

// Só para o PROFESSOR com a turma aberta: mantém turmas/{t}/roteiro/fechamento igual aos prazos de "Etapas e prazos".
// As regras do Firestore leem esse documento para recusar gravação do aluno depois do prazo.
// Se o roteiro não foi configurado, não grava nada (e portanto nada fecha). Idempotente: só grava quando algo mudou.
export function useFechamentoSync(turmaId) {
  const cfg = useRoteiroTurma(turmaId || null);
  useEffect(() => {
    if (!turmaId || !cfg) return;
    const novos = limitesDasEtapas(cfg);
    if (!Object.keys(novos).length) return;
    let vivo = true;
    (async () => {
      try {
        const ref = doc(db, "turmas", turmaId, "roteiro", "fechamento");
        const s = await getDoc(ref);
        if (!vivo) return;
        if (s.exists() && mesmosLimites(s.data(), novos)) return;
        await setDoc(ref, { ...novos, atualizadoEm: new Date().toISOString() });
      } catch (e) { /* sem permissão ou offline: o bloqueio na tela continua valendo */ }
    })();
    return () => { vivo = false; };
  }, [turmaId, cfg]);
  return cfg;
}
