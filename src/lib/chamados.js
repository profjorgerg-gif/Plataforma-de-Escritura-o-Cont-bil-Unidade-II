import { collection, doc, getDoc, runTransaction, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "../firebase.js";

// Numeração e exportação dos chamados do Suporte (2026-10-09).
// - Número sequencial por turma, guardado em turmas/{t}/contadores/suporte.
// - Se o contador ainda não estiver liberado nas regras do Firestore, o
//   chamado é criado normalmente, sem número (nada deixa de funcionar).
// - Exportar/imprimir só LÊ: não grava nada.

export function fmtNumero(n) {
  return Number.isFinite(n) && n > 0 ? String(n).padStart(4, "0") : "—";
}

function dt(v) {
  const d = v?.toDate ? v.toDate() : (v ? new Date(v) : null);
  if (!d || isNaN(d)) return "";
  const dois = (x) => String(x).padStart(2, "0");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

// Cria o chamado já com número. Devolve { numero } (numero = null se caiu no plano B).
export async function criarChamadoNumerado(turmaId, dados) {
  const contRef = doc(db, "turmas", turmaId, "contadores", "suporte");
  const novoRef = doc(collection(db, "turmas", turmaId, "chamados"));
  try {
    const numero = await runTransaction(db, async (tx) => {
      const s = await tx.get(contRef);
      const n = (s.exists() && Number.isFinite(s.data().ultimo) ? s.data().ultimo : 0) + 1;
      tx.set(contRef, { ultimo: n });
      tx.set(novoRef, { ...dados, numero: n });
      return n;
    });
    return { numero };
  } catch (e) {
    // plano B: sem número (ex.: regra do contador ainda não publicada)
    await addDoc(collection(db, "turmas", turmaId, "chamados"), dados);
    return { numero: null };
  }
}

// Professor: dá número aos chamados antigos, na ordem em que foram abertos.
// Só acrescenta o campo "numero"; não mexe em mensagens, status nem notas.
export async function numerarChamadosAntigos(turmaId, chamados) {
  const sem = (chamados || []).filter((c) => !c.numero)
    .sort((a, b) => (a.criadoEm?.toMillis?.() || 0) - (b.criadoEm?.toMillis?.() || 0));
  const contRef = doc(db, "turmas", turmaId, "contadores", "suporte");
  let feitos = 0;
  for (const c of sem) {
    const chRef = doc(db, "turmas", turmaId, "chamados", c.id);
    await runTransaction(db, async (tx) => {
      const [s, ch] = await Promise.all([tx.get(contRef), tx.get(chRef)]);
      if (!ch.exists() || ch.data().numero) return;
      const n = (s.exists() && Number.isFinite(s.data().ultimo) ? s.data().ultimo : 0) + 1;
      tx.set(contRef, { ultimo: n });
      tx.update(chRef, { numero: n });
    });
    feitos++;
  }
  return feitos;
}

const ROTULO_ETAPA = { digitacao: "Digitação da NF-e", analise: "Análise fiscal", classificacao: "Classificação contábil", lancamento: "Lançamento no diário" };
const LINHA = "--------------------------------------------------------";

export function textoChamado(c, turma, geradoEm = new Date()) {
  const L = [];
  L.push(`CHAMADO ${c.numero ? "Nº " + fmtNumero(c.numero) + " " : ""}— ${c.assunto || ""}`);
  L.push(`Turma: ${turma?.nome || ""} · Aluno: ${c.alunoNome || ""} (matrícula ${c.matricula || ""})`);
  L.push(`Nota fiscal: ${c.documentoNumero ? "NF " + c.documentoNumero : "—"} · Situação: ${c.status || ""} · Iniciado por: ${c.iniciadoPor || ""}`);
  L.push(`Aberto em ${dt(c.criadoEm)} · Última atualização ${dt(c.atualizadoEm)} · Gerado em ${dt(geradoEm)}`);
  L.push(LINHA);
  for (const m of c.mensagens || []) {
    const quem = m.tipo === "sistema" ? "SISTEMA" : m.autor === "professor" ? "PROFESSOR" : "ALUNO";
    let t = `[${dt(m.em)}] ${quem}: `;
    if (m.tipo === "devolucao") t += `(DEVOLUÇÃO da NF ${m.documentoNumero || ""} — etapas: ${(m.etapas || []).map((e) => ROTULO_ETAPA[e] || e).join(", ")}) `;
    L.push(t + (m.texto || ""));
  }
  return L.join("\n");
}

export function textoVariosChamados(lista, turma) {
  const agora = new Date();
  const ord = [...lista].sort((a, b) => (a.numero || 1e9) - (b.numero || 1e9));
  return `CHAMADOS DO SUPORTE — Turma ${turma?.nome || ""} — ${ord.length} chamado(s) — gerado em ${dt(agora)}\n\n` +
    ord.map((c) => textoChamado(c, turma, agora)).join("\n\n========================================================\n\n");
}

export function nomeArquivo(base) {
  const d = new Date(); const dois = (x) => String(x).padStart(2, "0");
  return `${base} - ${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}_${dois(d.getHours())}h${dois(d.getMinutes())}`
    .replace(/[\\/:*?"<>|]/g, "");
}

export function baixarTxt(nome, texto) {
  const blob = new Blob(["﻿" + texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome + ".txt";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copiarTexto(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch {
    try {
      const ta = document.createElement("textarea"); ta.value = texto; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch { return false; }
  }
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// Imprime/salva em PDF usando um iframe invisível (sem janela pop-up).
export function imprimirTexto(titulo, texto) {
  const anterior = document.title;
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const d = f.contentWindow.document;
  d.open();
  d.write(`<html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>body{font:13px/1.5 Arial,sans-serif;margin:24px;color:#000}pre{white-space:pre-wrap;word-wrap:break-word;font:inherit}</style></head><body><pre>${esc(texto)}</pre></body></html>`);
  d.close();
  document.title = titulo;
  const limpar = () => { document.title = anterior; setTimeout(() => f.remove(), 500); window.removeEventListener("afterprint", limpar); };
  window.addEventListener("afterprint", limpar);
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { limpar(); } }, 250);
}
