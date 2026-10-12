import { useEffect, useState } from "react";

// Progresso do roteiro de testes: fica SÓ no navegador do professor (localStorage), por professor e por turma.
// Não lê nem grava nada no Firestore, então não há regras novas e nada dos alunos é tocado.
const chave = (uid, turmaId) => "roteiroTestes_v1_" + (uid || "x") + "_" + (turmaId || "x");

function ler(k) {
  try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch { return {}; }
}

export function useProgressoTestes(uid, turmaId) {
  const k = chave(uid, turmaId);
  const [feitos, setFeitos] = useState(() => ler(k));
  useEffect(() => { setFeitos(ler(k)); }, [k]);
  function gravar(novo) {
    setFeitos(novo);
    try { localStorage.setItem(k, JSON.stringify(novo)); } catch { /* sem armazenamento: o progresso vale só nesta sessão */ }
  }
  return {
    feitos,
    marcar: (id, valor) => gravar({ ...feitos, [id]: !!valor }),
    limpar: () => gravar({}),
  };
}
