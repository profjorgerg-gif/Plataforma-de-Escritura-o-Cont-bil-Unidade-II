import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../firebase.js";

// Roteiro por etapas e avaliações — dados NOVOS, em coleções novas (não mexem no que os alunos já fizeram).
//   turmas/{t}/roteiro/config                          → { etapas:[{id,prazo,descricao,entrega,ativa}] }   (professor escreve)
//   turmas/{t}/alunos/{m}/roteiro/estado               → { etapas:{id:{status,retorno,em}} }               (professor escreve)
//   turmas/{t}/alunos/{m}/roteiro/entregas             → { id: dataISO }                                    (aluno escreve)
//   turmas/{t}/alunos/{m}/avaliacoes/{etapaId}         → { criterios:{k:{nota,comentario}}, nota, comentario, liberada } (professor escreve)

export function useRoteiroTurma(turmaId) {
  const [config, setConfig] = useState(undefined);
  useEffect(() => {
    if (!turmaId) return;
    return onSnapshot(doc(db, "turmas", turmaId, "roteiro", "config"), (s) => setConfig(s.exists() ? s.data() : null), () => setConfig(null));
  }, [turmaId]);
  return config; // undefined = carregando; null = professor ainda não configurou
}
export async function salvarRoteiroConfig(turmaId, dados) {
  await setDoc(doc(db, "turmas", turmaId, "roteiro", "config"), { ...dados, atualizadoEm: new Date().toISOString() }, { merge: true });
}

// Estado do aluno (leitura em tempo real) + marcar "entregue"
export function useRoteiroAluno(turmaId, matricula) {
  const [estado, setEstado] = useState(undefined);
  const [entregas, setEntregas] = useState(undefined);
  useEffect(() => {
    if (!turmaId || !matricula) return;
    const b = ["turmas", turmaId, "alunos", matricula, "roteiro"];
    const u1 = onSnapshot(doc(db, ...b, "estado"), (s) => setEstado(s.exists() ? s.data() : {}), () => setEstado({}));
    const u2 = onSnapshot(doc(db, ...b, "entregas"), (s) => setEntregas(s.exists() ? s.data() : {}), () => setEntregas({}));
    return () => { u1(); u2(); };
  }, [turmaId, matricula]);
  async function marcarEntregue(etapaId) {
    // "p_<etapa>" guarda a PRIMEIRA entrega (vale para o prazo); "<etapa>" guarda a última (reenvios).
    const agora = new Date().toISOString();
    const dados = { [etapaId]: agora };
    if (!(entregas && entregas["p_" + etapaId])) dados["p_" + etapaId] = agora;
    await setDoc(doc(db, "turmas", turmaId, "alunos", matricula, "roteiro", "entregas"), dados, { merge: true });
  }
  return { estado, entregas, carregando: estado === undefined || entregas === undefined, marcarEntregue };
}

// Avaliações LIBERADAS do aluno (a regra do Firestore só deixa o aluno ler as liberadas)
export function useAvaliacoesAluno(turmaId, matricula) {
  const [lista, setLista] = useState(undefined);
  useEffect(() => {
    if (!turmaId || !matricula) return;
    const q = query(collection(db, "turmas", turmaId, "alunos", matricula, "avaliacoes"), where("liberada", "==", true));
    return onSnapshot(q, (snap) => setLista(snap.docs.map((d) => ({ etapaId: d.id, ...d.data() }))), () => setLista([]));
  }, [turmaId, matricula]);
  return lista;
}

// Professor: estado/entregas/avaliações de todos os alunos (leitura única, com botão de atualizar)
export function useRoteiroDosAlunos(turmaId, alunos) {
  const [mapa, setMapa] = useState(null);
  const [tick, setTick] = useState(0);
  const chave = (alunos || []).map((a) => a.matricula).join(",");
  useEffect(() => {
    if (!turmaId || !alunos) return;
    let vivo = true;
    (async () => {
      const out = {};
      await Promise.all(alunos.map(async (a) => {
        const r = { estado: {}, entregas: {}, avaliacoes: {} };
        try {
          const s = await getDocs(collection(db, "turmas", turmaId, "alunos", a.matricula, "roteiro"));
          s.docs.forEach((d) => { if (d.id === "estado") r.estado = d.data(); if (d.id === "entregas") r.entregas = d.data(); });
        } catch (e) { /* sem dados */ }
        try {
          const s = await getDocs(collection(db, "turmas", turmaId, "alunos", a.matricula, "avaliacoes"));
          s.docs.forEach((d) => { r.avaliacoes[d.id] = d.data(); });
        } catch (e) { /* sem dados */ }
        out[a.matricula] = r;
      }));
      if (vivo) setMapa(out);
    })();
    return () => { vivo = false; };
  }, [turmaId, chave, tick]); // eslint-disable-line
  return { mapa, recarregar: () => setTick((t) => t + 1) };
}

export async function salvarEstadoEtapa(turmaId, matricula, etapaId, dados) {
  await setDoc(doc(db, "turmas", turmaId, "alunos", matricula, "roteiro", "estado"),
    { etapas: { [etapaId]: { ...dados, em: new Date().toISOString() } } }, { merge: true });
}
export async function salvarAvaliacao(turmaId, matricula, etapaId, dados) {
  await setDoc(doc(db, "turmas", turmaId, "alunos", matricula, "avaliacoes", etapaId), { ...dados, atualizadoEm: new Date().toISOString() }, { merge: true });
}

// Professor: lançamentos de cada aluno (para a nota automática de contabilização). Só carrega quando "ativo" for true.
export function useLancamentosDaTurma(turmaId, alunos, ativo) {
  const [mapa, setMapa] = useState(null);
  const chave = (alunos || []).map((a) => a.matricula).join(",");
  useEffect(() => {
    if (!turmaId || !alunos || !ativo) return;
    let vivo = true;
    (async () => {
      const out = {};
      await Promise.all(alunos.map(async (a) => {
        try {
          const s = await getDocs(collection(db, "turmas", turmaId, "alunos", a.matricula, "lancamentos"));
          out[a.matricula] = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (e) { out[a.matricula] = []; }
      }));
      if (vivo) setMapa(out);
    })();
    return () => { vivo = false; };
  }, [turmaId, chave, ativo]); // eslint-disable-line
  return mapa;
}
