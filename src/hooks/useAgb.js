import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot, setDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase.js";

// Fase 3 (AGB) — dados NOVOS, em coleções novas. Não toca em nada da Fase 1.
//   turmas/{t}/agb/config              → { liberado: true|false }       (professor escreve)
//   turmas/{t}/agb/periodoAnterior     → { rotulo, atualRotulo, bp:{}, dre:{} } (professor escreve)
//   turmas/{t}/alunos/{m}/agb/trabalho → { calculos:{}, interpretacoes:{}, parecer:{}, ... } (aluno escreve)

// Config e período anterior da turma (leitura em tempo real). undefined = carregando.
export function useAgbTurma(turmaId) {
  const [config, setConfig] = useState(undefined);
  const [anterior, setAnterior] = useState(undefined);
  useEffect(() => {
    if (!turmaId) return;
    const u1 = onSnapshot(doc(db, "turmas", turmaId, "agb", "config"),
      (s) => setConfig(s.exists() ? s.data() : {}), () => setConfig({}));
    const u2 = onSnapshot(doc(db, "turmas", turmaId, "agb", "periodoAnterior"),
      (s) => setAnterior(s.exists() ? s.data() : null), () => setAnterior(null));
    return () => { u1(); u2(); };
  }, [turmaId]);
  return { config, anterior, liberado: !!(config && config.liberado) };
}

export async function salvarConfigAgb(turmaId, dados) {
  await setDoc(doc(db, "turmas", turmaId, "agb", "config"), dados, { merge: true });
}
export async function salvarPeriodoAnterior(turmaId, dados) {
  await setDoc(doc(db, "turmas", turmaId, "agb", "periodoAnterior"), dados);
}

// Trabalho do aluno. O que o aluno digita aparece na hora (estado local) e é gravado
// automaticamente ~1,2 s depois. O estado de gravação é SEMPRE mostrado na tela:
//   "salvo" só aparece depois que o Firestore confirmou; "erro" fica vermelho e permanece.
export function useTrabalhoAgb(turmaId, matricula) {
  const [dados, setDados] = useState(null); // null = carregando
  const [estado, setEstado] = useState("salvo"); // salvo | pendente | salvando | erro
  const [salvoEm, setSalvoEm] = useState(null);
  const [erroMsg, setErroMsg] = useState("");
  const pendente = useRef({}); // { secao: { chave: valor } } ainda não gravado
  const timer = useRef(null);
  const ref = turmaId && matricula ? doc(db, "turmas", turmaId, "alunos", matricula, "agb", "trabalho") : null;

  useEffect(() => {
    if (!turmaId || !matricula) return;
    const r = doc(db, "turmas", turmaId, "alunos", matricula, "agb", "trabalho");
    const unsub = onSnapshot(r, (s) => {
      const remoto = s.exists() ? s.data() : {};
      setDados((atual) => {
        // não sobrescreve o que o aluno acabou de digitar e ainda não foi gravado
        const base = { ...remoto };
        Object.entries(pendente.current).forEach(([secao, campos]) => {
          base[secao] = { ...(base[secao] || {}), ...campos };
        });
        return base;
      });
    }, (e) => { setDados((d) => d || {}); setEstado("erro"); setErroMsg(e.message || e.code || "erro"); });
    return unsub;
  }, [turmaId, matricula]);

  const gravar = useCallback(async () => {
    if (!ref) return;
    const lote = pendente.current;
    if (Object.keys(lote).length === 0) return;
    pendente.current = {};
    setEstado("salvando");
    try {
      await setDoc(ref, { ...lote, atualizadoEm: new Date().toISOString() }, { merge: true });
      if (Object.keys(pendente.current).length === 0) { setEstado("salvo"); setSalvoEm(new Date()); }
      else setEstado("pendente");
    } catch (e) {
      // devolve ao pendente para tentar de novo; o aluno vê o aviso vermelho
      Object.entries(lote).forEach(([secao, campos]) => {
        pendente.current[secao] = { ...campos, ...(pendente.current[secao] || {}) };
      });
      setEstado("erro"); setErroMsg(e.message || e.code || "erro");
    }
  }, [turmaId, matricula]); // eslint-disable-line

  const setCampo = useCallback((secao, chave, valor) => {
    setDados((d) => ({ ...(d || {}), [secao]: { ...((d || {})[secao] || {}), [chave]: valor } }));
    pendente.current[secao] = { ...(pendente.current[secao] || {}), [chave]: valor };
    setEstado("pendente");
    clearTimeout(timer.current);
    timer.current = setTimeout(gravar, 1200);
  }, [gravar]);

  const salvarAgora = useCallback(() => { clearTimeout(timer.current); return gravar(); }, [gravar]);

  // avisa se tentar fechar a aba com algo ainda não gravado
  useEffect(() => {
    const aviso = (e) => {
      if (Object.keys(pendente.current).length > 0) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, []);
  // ao sair da tela, grava o que faltar
  useEffect(() => () => { clearTimeout(timer.current); gravar(); }, [gravar]);

  return { dados, setCampo, salvarAgora, estado, salvoEm, erroMsg, carregando: dados === null };
}

// Professor: lê o trabalho AGB de todos os alunos da turma (leitura única, com botão de atualizar).
export function useTrabalhosAgbDaTurma(turmaId, alunos) {
  const [mapa, setMapa] = useState(null);
  const [tick, setTick] = useState(0);
  const chave = (alunos || []).map((a) => a.matricula).join(",");
  useEffect(() => {
    if (!turmaId || !alunos) return;
    let vivo = true;
    (async () => {
      const out = {};
      await Promise.all(alunos.map(async (a) => {
        try {
          const snap = await getDocs(collection(db, "turmas", turmaId, "alunos", a.matricula, "agb"));
          snap.docs.forEach((d) => { if (d.id === "trabalho") out[a.matricula] = d.data(); });
        } catch (e) { /* aluno sem permissão/dados: ignora */ }
      }));
      if (vivo) setMapa(out);
    })();
    return () => { vivo = false; };
  }, [turmaId, chave, tick]); // eslint-disable-line
  return { mapa, recarregar: () => setTick((t) => t + 1) };
}
