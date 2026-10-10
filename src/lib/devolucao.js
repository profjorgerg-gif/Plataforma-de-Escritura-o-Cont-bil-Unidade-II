import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../firebase.js";
import { criarChamadoNumerado } from "./chamados.js";

// Devolução de nota ao aluno (2026-10-09). O professor devolve uma ou mais
// etapas de UMA nota, com orientação; o aluno refaz. Nada é substituído:
// - Digitação: o aluno já pode reeditar (só entra no registro + orientação).
// - Análise fiscal: volta para "rascunho" (a Classificação fica bloqueada até reenviar).
// - Classificação: copiada para a lixeira de segurança e removida (o aluno
//   não consegue editar uma classificação pronta).
// - Lançamento: status "correcao" + observação (mesmo caminho da Fila de correção).
// Tudo é registrado como mensagem do chamado (base do "Registro do processo").

export const ETAPAS_DEVOLUCAO = [
  { key: "digitacao", rotulo: "1 · Digitação da NF-e" },
  { key: "analise", rotulo: "2 · Análise fiscal" },
  { key: "classificacao", rotulo: "3 · Classificação contábil" },
  { key: "lancamento", rotulo: "4 · Lançamento no diário" },
];

export const MODELO_ORIENTACAO =
  "Revise a nota e refaça a(s) etapa(s) indicada(s), na ordem. Confira o total impresso na nota (produtos − desconto + frete/seguro/outras) com o que você digitou. Ao terminar, responda este chamado.";

export async function devolverNota({ turmaId, matricula, alunoNome, docId, docNumero, etapas, orientacao, chamado }) {
  const base = ["turmas", turmaId, "alunos", matricula];
  const agora = new Date().toISOString();
  const feitos = [];

  if (etapas.includes("analise")) {
    const ref = doc(db, ...base, "analisesFiscais", docId);
    const s = await getDoc(ref);
    if (s.exists()) { await updateDoc(ref, { status: "rascunho", devolucao: { orientacao, em: agora } }); feitos.push("análise fiscal reaberta"); }
  }
  if (etapas.includes("classificacao")) {
    const s = await getDocs(query(collection(db, ...base, "classificacoes"), where("documento", "==", docId)));
    // copia tudo antes de apagar; se uma cópia falhar, nada é apagado
    for (const d of s.docs) {
      await addDoc(collection(db, ...base, "lixeira"), {
        tipo: "classificacao", colecao: "classificacoes", origemId: d.id, documento: docId, documentoNumero: docNumero || null,
        dados: d.data(), excluidoEm: serverTimestamp(), excluidoPor: auth.currentUser?.email || "", motivo: "devolução ao aluno",
      });
    }
    for (const d of s.docs) await deleteDoc(d.ref);
    if (s.size) feitos.push(s.size + " classificação(ões) devolvida(s)");
  }
  if (etapas.includes("lancamento")) {
    const s = await getDocs(query(collection(db, ...base, "lancamentos"), where("documento", "==", docId)));
    for (const d of s.docs) {
      const atual = d.data().historicoCorrecoes || [];
      await updateDoc(d.ref, { status: "correcao", obsCorrecao: orientacao, historicoCorrecoes: [...atual, { obs: orientacao, em: agora }] });
    }
    if (s.size) feitos.push(s.size + " lançamento(s) devolvido(s) para correção");
  }

  const mensagem = { autor: "professor", tipo: "devolucao", etapas, texto: orientacao, em: agora, documentoNumero: docNumero || null, resultado: feitos };
  if (chamado) {
    await updateDoc(doc(db, "turmas", turmaId, "chamados", chamado.id), {
      mensagens: arrayUnion(mensagem), status: "respondido", naoLidoAluno: true, atualizadoEm: serverTimestamp(),
      documentoId: chamado.documentoId || docId, documentoNumero: chamado.documentoNumero || docNumero || null,
    });
  } else {
    // sem chamado aberto: cria um já numerado (se o contador não estiver liberado, cria sem número)
    await criarChamadoNumerado(turmaId, {
      matricula, alunoNome: alunoNome || "", assunto: "Nota devolvida para refazer", documentoId: docId, documentoNumero: docNumero || null,
      status: "respondido", iniciadoPor: "professor", mensagens: [mensagem], naoLidoProfessor: false, naoLidoAluno: true,
      criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    });
  }
  return feitos;
}
