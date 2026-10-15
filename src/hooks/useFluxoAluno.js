import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { normalizarFluxo } from "../lib/fluxoLotes.js";

// Fluxo por etapas (2027.1). Lê roteiro/lotes; SÓ se o fluxo estiver ligado na turma passa a ler
// a situação do aluno em alunos/{m}/fluxo. Com o fluxo desligado (padrão) isso é uma leitura só e nada muda.
export function useFluxoAluno(turmaId, matricula) {
  const [cfg, setCfg] = useState(null);
  const [docs, setDocs] = useState({});
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setCfg(null); setPronto(false);
    if (!turmaId || !matricula) return;
    return onSnapshot(doc(db, "turmas", turmaId, "roteiro", "lotes"),
      (snap) => { setCfg(snap.exists() ? normalizarFluxo(snap.data()) : null); setPronto(true); },
      () => { setCfg(null); setPronto(true); });
  }, [turmaId, matricula]);

  const ativo = !!(cfg && cfg.fluxoAtivo);
  useEffect(() => {
    setDocs({}); setErro("");
    if (!ativo || !turmaId || !matricula) return;
    return onSnapshot(collection(db, "turmas", turmaId, "alunos", matricula, "fluxo"),
      (snap) => setDocs(Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))),
      (e) => setErro("Não foi possível ler o andamento dos lotes: " + e.message));
  }, [ativo, turmaId, matricula]);

  return { cfg: ativo ? cfg : null, docs, erro, pronto };
}
