// Relatório de orientação por aluno — regras fixas, calculadas no navegador
// (sem IA e sem Cloud Functions). Cada achado tem gravidade:
//   "erro"   = precisa ser corrigido pelo aluno
//   "atencao"= vale conferir
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
  const add = (gravidade, documento, titulo, orientacao) => achados.push({ gravidade, documento, titulo, orientacao });

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

    if (!dig) add("erro", nomeDoc(d), "Digitação não feita", "Abra “Digitação e análise fiscal”, digite os dados da NF-e e salve.");
    else if (!ana || ana.status !== "enviado") add("erro", nomeDoc(d), "Análise fiscal não enviada", "Conclua a análise de CFOP, NCM e CST e clique em Enviar (rascunho não conta).");

    if (dig && ana?.status === "enviado" && clas.length === 0 && lans.length === 0)
      add("erro", nomeDoc(d), "Classificação contábil não feita", "Em “Classificação contábil”, defina a conta de débito e a de crédito deste documento.");

    if (clas.some((c) => c.status === "pendente") && lans.length > 0)
      add("atencao", nomeDoc(d), "Classificação ainda marcada como pendente", "O lançamento existe, mas a classificação não foi marcada como lançada. Use “marcar como lançada” ou refaça pelo botão “usar no lançamento”.");

    if (lans.length > 1)
      add("erro", nomeDoc(d), `Lançamento duplicado (${lans.length} lançamentos para o mesmo documento)`, "Exclua os repetidos e mantenha apenas um lançamento para este documento.");

    if (rascunhos.length > 0)
      add("erro", nomeDoc(d), `${rascunhos.length} lançamento(s) parado(s) em rascunho`, "O professor não vê rascunho. Abra o Livro diário e clique em Enviar.");

    if (devolvidos.length > 0)
      add("erro", nomeDoc(d), "Lançamento devolvido para correção", devolvidos.map((l) => l.obsCorrecao).filter(Boolean).join(" | ") || "Veja a observação do professor no Livro diário, corrija e reenvie.");

    for (const l of lans) {
      const dD = soma(l.partidas, "D"), dC = soma(l.partidas, "C");
      if (Math.abs(dD - dC) > 0.005) add("erro", nomeDoc(d), "Débito diferente de crédito", `Total de débitos (${dD.toFixed(2)}) e de créditos (${dC.toFixed(2)}) não fecham. Revise as partidas.`);
      const h = (l.historico || "").trim();
      if (h.length < 8 || HISTORICO_GENERICO.test(h))
        add("atencao", nomeDoc(d), "Histórico muito genérico", "O histórico deve descrever a operação do documento (ex.: compra de mercadorias a prazo conforme NF-e nº " + d.numero + ").");
    }

    if (lans.length === 0 && clas.length > 0 && dig && ana?.status === "enviado")
      add("erro", nomeDoc(d), "Classificado, mas não lançado no Livro diário", "Use “usar no lançamento” na Classificação e envie o lançamento.");

    if (enviados.length > 0 && rascunhos.length === 0 && devolvidos.length === 0 && aprovados.length === 0 && lans.length === 1) {
      // aguardando o professor — não é problema do aluno
    }
  }

  const dias = diasAteHoje(prazo);
  const pendentesDoAluno = achados.filter((a) => a.gravidade === "erro").length;
  if (dias !== null && pendentesDoAluno > 0) {
    if (dias < 0) add("erro", "Geral", `Prazo da unidade vencido há ${-dias} dia(s)`, "Regularize as pendências acima o quanto antes.");
    else if (dias <= 7) add("atencao", "Geral", `Faltam ${dias} dia(s) para o prazo da unidade`, "Priorize as pendências acima.");
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
  });
  L.push("", "Qualquer dúvida, procure o professor em aula.");
  return L.join("\n");
}
