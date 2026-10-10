// Relatório de orientação por aluno — regras fixas, calculadas no navegador
// (sem IA e sem Cloud Functions). Cada achado tem gravidade:
//   "erro"   = precisa ser corrigido pelo aluno
//   "atencao"= vale conferir
// Cada achado também traz a "etapa" (dig | ana | cla | lan | geral), usada
// só para colorir/filtrar a tela.
// Entrada: dados que a tela Histórico do aluno já carrega.

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
  const add = (gravidade, documento, titulo, orientacao, onde = "", etapa = "geral") => achados.push({ gravidade, documento, titulo, orientacao, onde, etapa });

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

    if (aprovados.length > 0 && lans.length === aprovados.length && lans.length === 1) { nOk++; continue; }

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
      add("atencao", nomeDoc(d), `Duas classificações para a mesma nota (${clas.length})`, "Mantenha só a classificação correta. Avise o professor se precisar apagar a repetida.", "Menu → Classificação contábil (etapa 4) → tabela Classificações registradas", "cla");

    if (dig && ana?.status === "enviado" && clas.length === 0 && lans.length === 0)
      add("erro", nomeDoc(d), "Classificação contábil não feita", "Defina a conta de débito e a de crédito deste documento.", "Menu → Classificação contábil (etapa 4) → Nova classificação → Salvar classificação");

    if (clas.some((c) => c.status === "pendente") && lans.length > 0)
      add("atencao", nomeDoc(d), "Classificação ainda marcada como pendente", "O lançamento existe, mas a classificação não foi marcada como lançada. Clique em “marcar como lançada no Diário”.", "Menu → Classificação contábil (etapa 4) → tabela Classificações registradas → botão “marcar como lançada no Diário”");

    if (lans.length > 1)
      add("erro", nomeDoc(d), `Lançamento duplicado (${lans.length} lançamentos para o mesmo documento)`, "Fique com um só lançamento para este documento: edite o correto e envie. Não envie o repetido (hoje o sistema não permite excluir; avise o professor).", "Menu → Livro diário (etapa 5) → tabela de lançamentos, linhas deste documento → coluna Ações → ✏️ Editar");

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
  return { aluno, total: documentos.length, nOk, achados };
}

export function relatorioEmTexto(rel) {
  const L = [];
  L.push(`Orientação — ${rel.aluno?.nome || "Aluno"}`);
  L.push(`Documentos em dia: ${rel.nOk} de ${rel.total}.`);
  if (rel.achados.length === 0) { L.push("", "Nenhuma pendência encontrada. Parabéns, continue assim!"); return L.join("\n"); }
  L.push("", "O que precisa de ajuste:");
  rel.achados.forEach((a, i) => {
    L.push(`${i + 1}. [${a.documento}] ${a.titulo}`);
    L.push(`   O que fazer: ${a.orientacao}`);
    if (a.onde) L.push(`   Onde: ${a.onde}`);
  });
  L.push("", "Qualquer dúvida, procure o professor em aula.");
  return L.join("\n");
}
