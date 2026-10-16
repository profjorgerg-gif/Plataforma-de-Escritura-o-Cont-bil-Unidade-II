import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

// Andamento ao vivo da turma para a Sala de aula (2026-10-16). Só LEITURA.
// Por aluno: digitações, análises fiscais, classificações, e o trabalho das etapas 2–4 (ca/trabalho) e 5–6 (agb/trabalho).
// Para não gastar leituras do Firestore ao ir e voltar entre telas, os dados ficam guardados em memória:
// ao sair da Sala de aula as escutas continuam por 10 minutos e, se você voltar nesse prazo, reaproveita tudo.
const SOBRA_MS = 10 * 60 * 1000;
let cache = null; // { chave, dados, ouvintes:Set, unsubs:[], timer }

function iniciar(turmaId, alunos, chave) {
  const c = { chave, dados: {}, ouvintes: new Set(), unsubs: [], timer: null };
  const set = (m, campo, valor) => {
    c.dados = { ...c.dados, [m]: { ...(c.dados[m] || {}), [campo]: valor } };
    c.ouvintes.forEach((f) => f(c.dados));
  };
  alunos.forEach((a) => {
    const base = ["turmas", turmaId, "alunos", a.matricula];
    const lista = (nome, campo) => c.unsubs.push(onSnapshot(collection(db, ...base, nome), (s) => set(a.matricula, campo, s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => set(a.matricula, campo, [])));
    lista("digitacoesNFe", "dig"); lista("analisesFiscais", "ana"); lista("classificacoes", "cla");
    const um = (col, campo) => c.unsubs.push(onSnapshot(doc(db, ...base, col, "trabalho"), (s) => set(a.matricula, campo, s.exists() ? s.data() : null), () => set(a.matricula, campo, null)));
    um("ca", "caTrab"); um("agb", "agbTrab");
  });
  return c;
}
function encerrar(c) { c.unsubs.forEach((u) => { try { u(); } catch (e) { /* já encerrada */ } }); c.unsubs = []; }

export function useAndamentoDaTurma(turmaId, alunos) {
  const [dados, setDados] = useState({});
  const chave = turmaId && alunos ? turmaId + "|" + alunos.map((a) => a.matricula).sort().join(",") : null;
  useEffect(() => {
    if (!chave) return;
    if (cache && cache.chave !== chave) { clearTimeout(cache.timer); encerrar(cache); cache = null; }
    if (!cache) cache = iniciar(turmaId, alunos, chave);
    const c = cache;
    clearTimeout(c.timer); c.timer = null;
    c.ouvintes.add(setDados); setDados(c.dados);
    return () => {
      c.ouvintes.delete(setDados);
      if (!c.ouvintes.size) c.timer = setTimeout(() => { encerrar(c); if (cache === c) cache = null; }, SOBRA_MS);
    };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  return dados;
}
