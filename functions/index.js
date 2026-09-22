// Cloud Functions da Unidade II.
//
// 1) criarPerfilNoPrimeiroLogin — substitui o que o App.jsx hoje assume
//    (que users/{uid} já existe). Sem esta função implantada, o login trava
//    em "Preparando seu acesso…", exatamente como o comentário em App.jsx
//    já avisa.
//
// 2) analisarLancamento — substitui a capacidade `sample` que a versão
//    publicada como Artifact usava (só existe dentro do Claude.ai). Chama a
//    API da Anthropic com uma chave própria da escola, guardada como secret.

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as functionsV1 from "firebase-functions/v1";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";

initializeApp();
const db = getFirestore();

// ============================================================
// 1) Criação do perfil no primeiro login
// ============================================================
//
// Decide o papel (aluno/professor/admin) a partir de uma coleção
// `professoresAutorizados/{email}` — cadastrada manualmente pelo Console
// Firebase (Firestore → professoresAutorizados → novo documento, id = o
// e-mail institucional em minúsculas, campo `papel`: "professor" ou
// "admin"). Quem não estiver lá entra como aluno, pendente de confirmar
// matrícula — exatamente o fluxo que TelaConfirmarMatricula espera.
//
// Usa o trigger clássico (v1) de Auth em vez de Blocking Functions (v2)
// para não exigir a migração do projeto para o Identity Platform — mais
// simples de operar para uma escola.

export const criarPerfilNoPrimeiroLogin = functionsV1.auth.user().onCreate(async (user) => {
  const email = (user.email || "").toLowerCase();
  const dadosBase = {
    nome: user.displayName || "",
    email,
    criadoEm: new Date().toISOString(),
  };

  const profSnap = await db.collection("professoresAutorizados").doc(email).get();

  if (profSnap.exists) {
    await db.collection("users").doc(user.uid).set({
      ...dadosBase,
      papel: profSnap.data().papel === "admin" ? "admin" : "professor",
      turmaId: null,
      matricula: null,
      matriculaConfirmada: true, // professor/admin não passa pela tela de matrícula
    });
  } else {
    await db.collection("users").doc(user.uid).set({
      ...dadosBase,
      papel: "aluno",
      turmaId: null,
      matricula: null,
      matriculaConfirmada: false,
    });
  }
});

// ============================================================
// 2) Análise assistida por IA de um lançamento
// ============================================================
//
// Callable HTTPS — chamado pelo app com httpsCallable(functions,
// "analisarLancamento")({ historico, partidas, documento }). Só professores
// podem chamar (conferido via users/{uid}.papel, não confiando em nada que
// o cliente diga sobre si mesmo).
//
// A chave da API fica como secret do Cloud Functions, nunca no código nem
// no .env do front-end:
//   firebase functions:secrets:set ANTHROPIC_API_KEY

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

// Verifique o nome do modelo vigente em docs.anthropic.com antes de
// implantar — nomes de modelo mudam com o tempo e este arquivo pode ficar
// desatualizado.
const MODELO_CLAUDE = "claude-sonnet-4-5";

export const analisarLancamento = onCall({ secrets: [anthropicApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Faça login para usar esta função.");
  }

  const perfilSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!perfilSnap.exists || perfilSnap.data().papel !== "professor") {
    throw new HttpsError("permission-denied", "Só professores podem pedir uma análise.");
  }

  const { historico, partidas, documento } = request.data || {};
  if (!historico || !Array.isArray(partidas) || partidas.length === 0) {
    throw new HttpsError("invalid-argument", "Envie histórico e partidas do lançamento.");
  }

  const partidasTexto = partidas
    .map((p) => `${p.tipo === "D" ? "Débito" : "Crédito"} — ${p.conta}${p.contaNome ? " " + p.contaNome : ""} — R$ ${p.valor}`)
    .join("\n");

  const docTexto = documento
    ? `Documento de origem: NF-e nº ${documento.numero}, ${documento.direcao === "entrada" ? "entrada" : "saída"}, natureza "${documento.natureza}", CFOP ${documento.cfop}.`
    : "Sem documento de origem vinculado.";

  const prompt = `Você é um professor de Contabilidade Intermediária revisando o lançamento de um aluno do ensino técnico, na Unidade II (Operações com Mercadorias e Operações Financeiras).

${docTexto}

Histórico informado pelo aluno: "${historico}"

Partidas do lançamento:
${partidasTexto}

Avalie se a classificação contábil (contas escolhidas, natureza débito/crédito, separação de efeitos quando aplicável — ex.: em vendas, receita e CMV devem ser lançados separadamente) está coerente com o fato descrito e com o documento de origem. Não é preciso que bata com uma única "resposta certa" — julgue como um professor experiente julgaria, aceitando soluções tecnicamente corretas ainda que diferentes da mais óbvia.

Responda em português, em JSON, exatamente neste formato:
{"status": "ok" ou "inconsistencias", "feedback": "texto para o aluno, direto e didático, sem revelar a conta certa caso haja erro — aponte o que reconsiderar, não a resposta"}

Se estiver tudo certo, "feedback" deve parabenizar o aluno e destacar em poucas palavras o que ele acertou. Se houver inconsistência, "feedback" deve orientar o que o aluno deve reexaminar, sem entregar a conta ou o lançamento corretos.`;

  const anthropic = new Anthropic({ apiKey: anthropicApiKey.value() });

  let resposta;
  try {
    resposta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    throw new HttpsError("unavailable", "Não foi possível falar com a IA agora. Tente de novo em instantes.");
  }

  const textoResposta = resposta.content.find((b) => b.type === "text")?.text || "";
  let parsed;
  try {
    parsed = JSON.parse(textoResposta.replace(/```json|```/g, "").trim());
  } catch (e) {
    throw new HttpsError("internal", "A IA respondeu em um formato inesperado. Tente de novo.");
  }

  if (!parsed.status || !parsed.feedback) {
    throw new HttpsError("internal", "Resposta da IA incompleta.");
  }

  return parsed;
});
