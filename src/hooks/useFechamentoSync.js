import { useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { useRoteiroTurma } from "./useRoteiro.js";
import { limitesDasEtapas, mesmosLimites } from "../lib/fechamento.js";

// (25/11/2026) Agora LIMPA os limites antigos de turmas/{t}/roteiro/fechamento, para as regras do Firestore não recusarem mais nada por prazo.
// Só para o PROFESSOR com a turma aberta: mantinha turmas/{t}/roteiro/fechamento igual aos prazos de "Etapas e prazos".
// As regras do Firestore leem esse documento para recusar gravação do aluno depois do prazo.
// Se o roteiro não foi configurado, não grava nada (e portanto nada fecha). Idempotente: só grava quando algo mudou.
export function useFechamentoSync(turmaId) {
  const cfg = useRoteiroTurma(turmaId || null);
  useEffect(() => {
    if (!turmaId || !cfg) return;
    const novos = limitesDasEtapas(cfg); // vazio: o prazo não trava mais ninguém
    let vivo = true;
    (async () => {
      try {
        const ref = doc(db, "turmas", turmaId, "roteiro", "fechamento");
        const s = await getDoc(ref);
        if (!vivo) return;
        if (!s.exists() || mesmosLimites(s.data(), novos)) return; // nada a limpar
        await setDoc(ref, { ...novos, atualizadoEm: new Date().toISOString() }); // apaga os limites antigos
      } catch (e) { /* sem permissão ou offline: o bloqueio na tela continua valendo */ }
    })();
    return () => { vivo = false; };
  }, [turmaId, cfg]);
  return cfg;
}
