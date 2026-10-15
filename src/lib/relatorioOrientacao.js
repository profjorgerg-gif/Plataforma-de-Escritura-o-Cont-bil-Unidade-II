// Relatório de orientação por aluno — regras fixas, calculadas no navegador
// (sem IA e sem Cloud Functions). Cada achado tem gravidade:
//   "erro"   = precisa ser corrigido pelo aluno
//   "atencao"= vale conferir
// Cada achado também traz a "etapa" (dig | ana | cla | lan | geral), usada
// só para colorir/filtrar a tela.
// Entrada: dados que a tela Histórico do aluno já carrega.

import { conferirUm, conferirAluno } from "./conferenciaFila.js";

const HISTORICO_GENERICO = /^(lan[cç]amento|teste|ok|x+|\.+|-+|compra|venda|a\s*prazo|\s*)$/i;

function nomeDoc(d) { return `Nº ${d.numero}`; }
function soma(partidas, tipo) { return (partidas || []).filter((p) => p.tipo === tipo).reduce((s, p) => s + (Number(p.valor) || 0), 0); }

function diasAteHoje(prazo) {
  if (!prazo) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  return Math.round((new Date(prazo + "T00:00:00") - new Date(hoje + "T00:00:00")) / 86400000);
}

export function gerarRelatorioOrientacao({ aluno, documentos, digitacoes, analises, classificacoes, lancamentos, prazo }) {
  const achados = [];
  const linhas = [];
  // "quem" = quem precisa agir: o aluno, ou o professor (ex.: o aluno não consegue excluir repetidos).
  const QUEM_PROFESSOR = /^(Lançamento duplicado|Duas classificações|Divergência no lançamento enviado)/;
  const add = (gravidade, documento, titulo, orientacao, onde = "", etapa = "geral") =>
    achados.some((x) => x.documento === documento && x.titulo === titulo) ? null : achados.push({ gravidade, documento, titulo, orientacao, onde, etapa, quem: QUEM_PROFESSOR.test(titulo) ? "professor" : "aluno" });

  // conta de receita mais usada pelo aluno nas vendas (para apontar quem usou outra)
  const contaReceita = {};
  for (const c of classificacoes) {
    const doc = documentos.find((x) => x.id === c.documento);
    if (doc && doc.direcao !== "entrada" && String(c.contaCredito || "").startsWith("4.1.1.")) contaReceita[c.contaCredito] = (contaReceita[c.contaCredito] || 0) + 1;
  }
  const recOrdenada = Object.entries(contaReceita).sort((a, b) => b[1] - a[1]);
  const recDominante = recOrdenada.length > 0 && recOrdenada[0][1] >= 2 ? recOrdenada[0][0] : null;
  const TRIB_RECUPERAR = ["1.1.2.11", "1.1.2.12", "1.1.2.14", "1.1.2.15"];

  let nOk = 0;
  for (const d of documentos) {
    const dig = digitacoes[d.id];
    const ana = analises[d.id];
    const clas = classificacoes.filter((c) => c.documento === d.id);
    const lans = lancamentos.filter((l) => l.documento === d.id);
    const rascunhos = lans.filter((l) => l.status === "rascunho");
    const enviados = lans.filter((l) => l.status === "enviado");
    const aprovados = lans.filter((l) => l.status === "aprovado");
    const devolvidos = lans.filter((l) => l.status === "correcao");

    const antes = achados.length;
    const emDia = aprovados.length > 0 && lans.length === aprovados.length && lans.length === 1;
    if (emDia) {
      nOk++;
      linhas.push({ documento: nomeDoc(d), dig: "ok", ana: "ok", cla: "ok", lan: "ok", situacao: "emdia", quem: [] });
      continue;
    }

    if (!dig) add("erro", nomeDoc(d), "Digitação não feita", "Digite os dados da NF-e e salve.", `Menu → Digitação e análise fiscal (etapa 3) → escolha o documento ${nomeDoc(d)} → seção Digitação → Salvar digitação`);
    else if (!ana || ana.status !== "enviado") add("erro", nomeDoc(d), "Análise fiscal não enviada", "Conclua a análise de CFOP, NCM e CST e clique em Enviar (rascunho não conta).", `Menu → Digitação e análise fiscal (etapa 3) → documento ${nomeDoc(d)} → seção Análise fiscal → Enviar análise`);

    // Novas verificações (somente leitura, comparam o que o aluno fez com o gabarito do documento)
    if (dig) {
      const totalDig = String(dig.total ?? "").trim();
      const itensDig = (dig.itens || []).length;
      if (totalDig === "" && itensDig === 0)
        add("erro", nomeDoc(d), "Digitação em branco (sem total e sem itens)", "A digitação foi salva vazia. Preencha os dados da NF-e e salve de novo.", `Menu → Digitação e análise fiscal (etapa 3) → documento ${nomeDoc(d)} → seção Digitação → Salvar digitação`);
      else if (totalDig !== "" && Number(d.valorTotal) > 0 && Math.abs((Number(dig.total) || 0) - Number(d.valorTotal)) >= 0.02)
        add("erro", nomeDoc(d), `Total digitado (${(Number(dig.total) || 0).toFixed(2)}) diferente do total da nota (${Number(d.valorTotal).toFixed(2)})`, "Confira o campo Total no PDF e use “Conferir digitação” antes de salvar.", `Menu → Digitação e análise fiscal (etapa 3) → documento ${nomeDoc(d)} → seção Digitação → Conferir digitação`);
    }

    if (clas.length > 1)
      add("atencao", nomeDoc(d), `Duas classificações para a mesma nota (${clas.length})`, "Confira qual das duas está certa e remova a repetida.", "Menu → Refazer nota do aluno → escolher o aluno e a NF → “Remover só este item”.", "cla");

    if (dig && ana?.status === "enviado" && clas.length === 0 && lans.length === 0)
      add("erro", nomeDoc(d), "Classificação contábil não feita", "Defina a conta de débito e a de crédito deste documento.", "Menu → Classificação contábil (etapa 4) → Nova classificação → Salvar classificação");

    if (clas.some((c) => c.status === "pendente") && lans.length > 0)
      add("atencao", nomeDoc(d), "Classificação ainda marcada como pendente", "O lançamento existe, mas a classificação não foi marcada como lançada. Clique em “marcar como lançada no Diário”.", "Menu → Classificação contábil (etapa 4) → tabela Classificações registradas → botão “marcar como lançada no Diário”");

    if (lans.length > 1)
      add("erro", nomeDoc(d), `Lançamento duplicado (${lans.length} lançamentos para o mesmo documento)`, "Devolva o repetido pela Fila de correção (conferência automática), marcando “Permitir que o aluno exclua”: ele mesmo exclui no Livro diário. Enquanto isso, o aluno não deve enviar outro lançamento desta nota.", "Menu → Livro diário (etapa 5) → tabela de lançamentos, linhas deste documento → coluna Ações → ✏️ Editar");

    if (rascunhos.length === 1 && lans.length === 1)
      add("erro", nomeDoc(d), "Lançamento parado em rascunho", "O professor não vê rascunho. Abra o lançamento e clique em Enviar.", "Menu → Livro diário (etapa 5) → linha do lançamento → ✏️ Editar → Enviar para análise do professor");

    if (devolvidos.length > 0)
      add("erro", nomeDoc(d), "Lançamento devolvido para correção", devolvidos.map((l) => l.obsCorrecao).filter(Boolean).join(" | ") || "Veja a observação do professor, corrija e reenvie.", "Menu → Livro diário (etapa 5) → linha devolvida → ✏️ Editar → Reenviar para análise do professor");

    for (const l of lans) {
      const dD = soma(l.partidas, "D"), dC = soma(l.partidas, "C");
      if (Math.abs(dD - dC) > 0.005) add("erro", nomeDoc(d), "Débito diferente de crédito", `Total de débitos (${dD.toFixed(2)}) e de créditos (${dC.toFixed(2)}) não fecham. Revise as partidas.`, "Menu → Livro diário (etapa 5) → linha do lançamento → ✏️ Editar → partidas (débito e crédito)");
      if (dD > 0 && Number(d.valorTotal) > 0 && l.status !== "aprovado" && Math.abs(dD - Number(d.valorTotal)) >= 0.02)
        add("atencao", nomeDoc(d), `Valor do lançamento (${dD.toFixed(2)}) diferente do total da nota (${Number(d.valorTotal).toFixed(2)})`, "Pode estar correto (lançamento com mais de uma linha), mas confira se o valor bate com o documento.", "Menu → Livro diário (etapa 5) → linha do lançamento → ✏️ Editar → valores das partidas", "lan");
      const h = (l.historico || "").trim();
      if (h.length < 8 || HISTORICO_GENERICO.test(h))
        add("atencao", nomeDoc(d), "Histórico muito genérico", "O histórico deve descrever a operação do documento (ex.: compra de mercadorias a prazo conforme NF-e nº " + d.numero + ").", "Menu → Livro diário (etapa 5) → linha do lançamento → ✏️ Editar → campo Histórico");
    }

    if (lans.length === 0 && clas.length > 0 && dig && ana?.status === "enviado")
      add("erro", nomeDoc(d), "Classificado, mas não lançado no Livro diário", "Lance a classificação no Diário e envie.", "Menu → Classificação contábil (etapa 4) → botão “usar no lançamento” → Livro diário (etapa 5) → Enviar para análise do professor");

    if (enviados.length > 0 && rascunhos.length === 0 && devolvidos.length === 0 && aprovados.length === 0 && lans.length === 1) {
      // aguardando o professor — não é problema do aluno
    }

    // 2026-10-15 — conferência com o gabarito da nota (mesma regra da conferência automática da Fila)
    const confEnviados = conferirAluno(enviados, lancamentos, documentos);
    for (const l of enviados) {
      const r = confEnviados[l.id];
      if (r && r.estado === "no")
        add("atencao", nomeDoc(d), "Divergência no lançamento enviado: " + r.motivo, "Confira e devolva este lançamento pela Fila de correção (conferência automática).", "Menu → Fila de correção → Abrir conferência automática por aluno", "lan");
    }
    for (const l of rascunhos) {
      const r = conferirUm(l, d, false);
      if (r.estado === "no")
        add("erro", nomeDoc(d), "Lançamento em rascunho com divergência: " + r.motivo, r.acao || "Corrija antes de enviar.", "Menu → Livro diário (etapa 5) → linha do lançamento → ✏️ Editar", "lan");
    }

    // 2026-10-15 — contas que não combinam com o tipo da nota (compra x venda)
    const entradaDoc = d.direcao === "entrada";
    const pares = [
      ...clas.map((c) => ({ deb: [c.contaDebito], cred: [c.contaCredito], de: "classificação" })),
      ...lans.filter((l) => l.status !== "aprovado").map((l) => ({
        deb: (l.partidas || []).filter((p) => p.tipo === "D").map((p) => p.conta),
        cred: (l.partidas || []).filter((p) => p.tipo === "C").map((p) => p.conta), de: "lançamento" })),
    ];
    for (const par of pares) {
      const cred = par.cred.map(String), deb = par.deb.map(String);
      if (entradaDoc && (cred.some((c) => c.startsWith("4.1.1.")) || deb.includes("1.1.2.02")))
        add("erro", nomeDoc(d), "Nota de compra com contas de venda", `Esta é uma nota de entrada (compra), mas a ${par.de} usa Clientes/Receita de Vendas. Na compra o débito é em Mercadorias para Revenda e o crédito em Fornecedores (ou na conta do pagamento).`, "Menu → Classificação contábil (etapa 4) → corrigir as contas", "cla");
      if (entradaDoc && cred.some((c) => TRIB_RECUPERAR.includes(c)))
        add("erro", nomeDoc(d), "Compra com crédito em tributo a recuperar", `Na ${par.de}, a contrapartida da compra está em ICMS/PIS/COFINS a Recuperar. Tributo a recuperar é débito, em partida separada. O crédito da compra é Fornecedores (ou a conta do pagamento).`, "Menu → Classificação contábil (etapa 4) → corrigir a conta de crédito", "cla");
      if (!entradaDoc && (deb.includes("1.1.3.01") || cred.some((c) => c.startsWith("2.1.1."))))
        add("erro", nomeDoc(d), "Nota de venda com contas de compra", `Esta é uma nota de saída (venda), mas a ${par.de} usa Mercadorias/Fornecedores. Na venda o débito é em Clientes e o crédito em Receita de Vendas.`, "Menu → Classificação contábil (etapa 4) → corrigir as contas", "cla");
      const rec = cred.find((c) => c.startsWith("4.1.1."));
      if (!entradaDoc && rec && recDominante && rec !== recDominante)
        add("atencao", nomeDoc(d), `Conta de receita diferente das outras vendas (${rec})`, `Nas outras vendas foi usada a conta ${recDominante}. Confira se esta nota realmente é de ${rec}.`, "Menu → Classificação contábil (etapa 4)", "cla");
    }

    // Situação por etapa deste documento (✓ feito e salvo, ✗ problema, ⏳ aguardando professor, – não chegou)
    const meus = achados.slice(antes);
    const digBranca = dig && String(dig.total ?? "").trim() === "" && (dig.itens || []).length === 0;
    const digDifere = dig && !digBranca && String(dig.total ?? "").trim() !== "" && Number(d.valorTotal) > 0 && Math.abs((Number(dig.total) || 0) - Number(d.valorTotal)) >= 0.02;
    const sDig = !dig || digBranca || digDifere ? "no" : "ok";
    const sAna = !dig ? "-" : ana?.status === "enviado" ? "ok" : "no";
    const sCla = clas.length > 0 || lans.length > 0 ? "ok" : (dig && ana?.status === "enviado" ? "no" : "-");
    let sLan = "-";
    if (aprovados.length > 0) sLan = "ok";
    else if (enviados.length > 0) sLan = "wa";
    else if (lans.length > 0) sLan = "no";
    else if (clas.length > 0) sLan = "no";
    const quem = [];
    if (meus.some((a) => a.quem === "aluno")) quem.push("aluno");
    if (meus.some((a) => a.quem === "professor") || (meus.length === 0 && enviados.length > 0)) quem.push("professor");
    const situacao = meus.some((a) => a.gravidade === "erro") ? "problema" : meus.length > 0 ? "conferir" : enviados.length > 0 ? "aguardando" : "emdia";
    linhas.push({ documento: nomeDoc(d), dig: sDig, ana: sAna, cla: sCla, lan: sLan, situacao, quem });
  }

  const dias = diasAteHoje(prazo);
  const pendentesDoAluno = achados.filter((a) => a.gravidade === "erro").length;
  if (dias !== null && pendentesDoAluno > 0) {
    if (dias < 0) add("erro", "Geral", `Prazo da unidade vencido há ${-dias} dia(s)`, "Regularize as pendências acima o quanto antes.", "Menu → Meu progresso (acompanhe o fluxo)");
    else if (dias <= 7) add("atencao", "Geral", `Faltam ${dias} dia(s) para o prazo da unidade`, "Priorize as pendências acima.", "Menu → Meu progresso (acompanhe o fluxo)");
  }

  const ETAPA_POR_TITULO = [
    [/^(Digitação|Total digitado)/, "dig"], [/^Análise/, "ana"], [/^(Classificação|Classificado|Duas classificações)/, "cla"],
    [/^(Lançamento|Débito|Histórico|Valor do lançamento)/, "lan"],
  ];
  for (const a of achados) {
    if (a.etapa !== "geral") continue;
    const m = ETAPA_POR_TITULO.find(([re]) => re.test(a.titulo));
    if (m) a.etapa = m[1];
    if (/^Classificado, mas/.test(a.titulo)) a.etapa = "lan";
  }

  achados.sort((a, b) => (a.gravidade === b.gravidade ? 0 : a.gravidade === "erro" ? -1 : 1));
  const ordem = { problema: 0, conferir: 1, aguardando: 2, emdia: 3 };
  linhas.sort((a, b) => ordem[a.situacao] - ordem[b.situacao]);
  const comAluno = linhas.filter((l) => l.quem.includes("aluno")).length;
  const comProfessor = linhas.filter((l) => l.quem.includes("professor")).length;
  return { aluno, total: documentos.length, nOk, achados, linhas, comAluno, comProfessor, contaTeste: !!aluno?.contaTeste };
}

export function relatorioEmTexto(rel) {
  const L = [];
  L.push(`Orientação — ${rel.aluno?.nome || "Aluno"}`);
  L.push(`Documentos em dia: ${rel.nOk} de ${rel.total}. Com o aluno: ${rel.comAluno ?? 0}. Com o professor: ${rel.comProfessor ?? 0}.`);
  if (rel.achados.length === 0) { L.push("", "Nenhuma pendência encontrada. Parabéns, continue assim!"); return L.join("\n"); }
  L.push("", "O que precisa de ajuste:");
  rel.achados.forEach((a, i) => {
    L.push(`${i + 1}. [${a.documento}] ${a.titulo}  (quem age: ${a.quem === "professor" ? "Professor" : "Aluno"})`);
    L.push(`   O que fazer: ${a.orientacao}`);
    if (a.onde) L.push(`   Onde: ${a.onde}`);
  });
  L.push("", "Qualquer dúvida, procure o professor em aula.");
  return L.join("\n");
}


// Texto para ENVIAR ao aluno (Suporte): só o que cabe ao aluno, em linguagem direta.
export function relatorioParaAluno(rel) {
  const meus = (rel.achados || []).filter((a) => a.quem !== "professor");
  if (meus.length === 0) return "";
  const L = [];
  L.push(`${(rel.aluno?.nome || "").split(" ")[0] || "Olá"}, segue a sua orientação. Em dia: ${rel.nOk} de ${rel.total} notas.`, "", "O que você precisa ajustar:");
  meus.forEach((a, i) => {
    L.push(`${i + 1}) ${a.documento} — ${a.titulo}`);
    L.push(`   O que fazer: ${a.orientacao}`);
    if (a.onde) L.push(`   Onde: ${a.onde}`);
  });
  L.push("", "Qualquer dúvida, responda esta mensagem.", "Prof. Jorge");
  return L.join("\n");
}

// Pendências que são do PROFESSOR neste relatório (duplicado, divergência a conferir…).
// Texto para a lista do Suporte do professor; o aluno não recebe.
export function relatorioParaProfessor(rel) {
  const meus = (rel.achados || []).filter((a) => a.quem === "professor");
  if (meus.length === 0) return "";
  const L = [];
  L.push(`${rel.aluno?.nome || "Aluno"}, pendências do professor:`);
  meus.forEach((a, i) => {
    L.push(`${i + 1}) ${a.documento} — ${a.titulo}`);
    L.push(`   O que fazer: ${a.orientacao}`);
    if (a.onde) L.push(`   Onde: ${a.onde}`);
  });
  return L.join("\n");
}

export function contarPendenciasProfessor(rel) {
  return (rel.achados || []).filter((a) => a.quem === "professor").length;
}
