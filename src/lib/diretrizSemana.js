// Diretriz da semana: o texto que o professor escreve no quadro (somente professor).
// Conteúdo fixo, conferido com o Caderno do Aluno (39 páginas) e com as etapas/prazos da plataforma em 12/10/2026.
// Não lê nem grava nada no Firestore.
export const AULAS_SEMANA = "4 aulas de CI + 2 aulas de CA + 2 aulas de AGB";
export const ETAPAS_LINHA = "1 Escrituração (CI) · 2 Folha de pagamento (CA) · 3 Folha, provisões e contabilização (CA) · 4 Rescisão trabalhista (CA) · 5 Análise gerencial de balanços (AGB) · 6 Análise comparativa (AGB)";
export const PRAZOS_LINHA = "1 → 16/10 · 2 → 23/10 · 3 → 05/11 · 4 → 11/11 · 5 → 19/11 · 6 → 25/11";
export const DICAS_QUADRO = [
  "Escreva na segunda e deixe valendo até sexta; a cada aula, circule no quadro onde a turma está.",
  "Desenhe a linha das 6 etapas e marque com ➜ a etapa atual.",
  "Cores, se tiver: verde para a meta, vermelho para o prazo, branco para o resto.",
  "Os alunos usam junto: Meu plano de trabalho (caderno p.4), Controle semanal (p.9) e Registro de entregas e notas (p.36).",
  "Dúvida do aluno (p.39): reler o roteiro da etapa, ler a mensagem da plataforma, conferir se a etapa anterior foi aprovada e perguntar ao professor. Problema no sistema: Suporte, no grupo Controle.",
];

export const SEMANAS = [
  {
    de: "2026-10-12", ate: "2026-10-16", periodo: "12 a 16/10", etapa: "Etapa 1 — Escrituração (CI)", prazo: "sexta 16/10",
    meta: "Até sexta, o ciclo contábil da sua empresa didática concluído: cada NF-e liberada digitada, analisada, classificada e lançada no Livro diário, lançamentos aprovados pelo professor e Balanço fechando (Ativo = Passivo + PL).",
    caminho: [
      "Documentos fiscais: escolher uma NF-e (p.11)",
      "Digitação e análise fiscal: digitar como no PDF, Conferir digitação, julgar CFOP, NCM e CST e Enviar análise (p.12)",
      "Classificação contábil (p.13)",
      "Livro diário: Débito = Crédito e enviar para análise do professor (p.13)",
      "Repetir os passos 1 a 4 para cada documento liberado (p.11)",
      "Conferir Livro razão, Balancete, ARE, DRE e Balanço patrimonial (p.14)",
      "Entregar em Meu roteiro por etapas",
    ],
    controle: "Quarta: a primeira NF-e já deve ter passado pelos passos 1 a 4 (lançamento enviado ao professor).",
    erros: [
      "Digitar diferente do PDF",
      "Justificar com \"está certo\" sem citar o dado do documento (p.12)",
      "Débito diferente de Crédito (o envio não libera)",
      "Lançamento devolvido como \"Correção necessária\": clicar em Editar, ler a observação e reenviar (p.11 e 13)",
      "Balanço que não fecha: procurar lançamento ainda não aprovado ou conta no lugar errado (p.14)",
    ],
    antes: ["Todos os lançamentos aprovados", "Balanço fecha", "Razão, Balancete, ARE e DRE conferidos", "Entregar clicado (confira em Meu progresso)"],
    regras: "A Etapa 1 tem regra própria de atraso, definida pelo professor (caderno p.6 e p.10); veja Minha nota (Etapa 1). Critérios: completude do ciclo 45%, qualidade técnica 35%, autonomia 20%.",
    proxima: "Etapa 2 · Folha de pagamento · prazo 23/10.",
  },
  {
    de: "2026-10-19", ate: "2026-10-23", periodo: "19 a 23/10", etapa: "Etapa 2 — Folha de pagamento (CA)", prazo: "sexta 23/10",
    meta: "Até sexta, os contracheques de todos os funcionários da sua empresa didática calculados (proventos, INSS, IRRF e líquido), digitados e conferidos na plataforma, e o resumo sobre a folha escrito.",
    caminhoTitulo: "Caminho (tela \"Atividade · Elaborar a folha\")",
    caminho: [
      "Anotar os dados de cada funcionário (Ficha A, p.16)",
      "Calcular os proventos",
      "Calcular os descontos: INSS e IRRF com as tabelas da p.16 ou as que o professor indicar",
      "Chegar ao valor líquido (Ficha B, p.17)",
      "Digitar e conferir na plataforma",
      "Escrever o resumo e Entregar (p.15)",
    ],
    controle: "Quarta: dados anotados e proventos e descontos calculados nas Fichas A e B.",
    erros: [
      "INSS pela alíquota única em vez de faixa por faixa (progressivo, p.16)",
      "IRRF sem considerar dedução por dependente, desconto simplificado e a redução da Lei 15.270/2025 (p.16)",
      "Esquecer o salário-família",
      "Digitar sem calcular antes no caderno (Ficha B)",
      "A tolerância de R$ 0,02 vale só para arredondamento, nunca para erro de base, alíquota, faixa ou teto",
    ],
    antes: ["Contracheques conferidos", "Resumo escrito", "Entregar clicado"],
    regras: "Critérios: cálculos conferidos 60%, quantidade de contracheques 20%, resumo 20%. Entregar depois de 23/10 desconta 2,0 pontos.",
    proxima: "Etapa 3 · Folha, provisões e contabilização · prazo 05/11 (só abre com a atividade da folha aprovada).",
  },
  {
    de: "2026-10-26", ate: "2026-10-30", periodo: "26 a 30/10", etapa: "Etapa 3 — Folha, provisões e contabilização (CA), parte 1", prazo: "da etapa: 05/11 (esta semana e a próxima)",
    meta: "A folha do mês conferida e as seis linhas de provisões e encargos calculadas e conferidas na plataforma.",
    caminhoTitulo: "Caminho (telas da Etapa 3)",
    caminho: [
      "Folha do mês: conferir os valores da folha da etapa 2 (p.19)",
      "Provisões e encargos: a) salários e remunerações, b) encargos sociais sobre salários, c) férias + 1/3, d) encargos sobre férias, e) 13º salário, f) encargos sobre 13º (p.19)",
      "Conferir na plataforma",
      "Fica para a próxima semana: Contabilização, Efeitos nas demonstrações e Parecer técnico (p.20)",
    ],
    controle: "Quarta: folha do mês conferida e provisões calculadas no caderno.",
    erros: [
      "Esquecer de anotar a base de cada linha (se o resultado divergir, é a base que se revisa primeiro, p.19)",
      "Tentar abrir as telas da folha sem a atividade da etapa 2 aprovada (ficam travadas, p.18)",
    ],
    antes: ["Atividade da folha (etapa 2) aprovada", "Seis linhas conferidas"],
    regras: "Critérios da etapa: cálculos 35%, lançamentos aprovados 35%, efeitos nas demonstrações 10%, parecer técnico 20%. Entregar depois de 05/11 desconta 2,0 pontos.",
    proxima: "Contabilização, efeitos e parecer; entrega em 05/11.",
  },
  {
    de: "2026-11-02", ate: "2026-11-06", periodo: "02 a 06/11", etapa: "Etapa 3 — Folha, provisões e contabilização (CA), parte 2", prazo: "quinta 05/11",
    extra: "Sexta 06/11: começa a Etapa 4 (para quem já teve a Etapa 3 aprovada).",
    meta: "Até quinta, lançamentos levados ao Livro diário (salvos uma única vez), efeitos nas demonstrações descritos, parecer técnico de 15 a 20 linhas escrito e a etapa entregue.",
    caminhoTitulo: "Caminho (telas da Etapa 3)",
    caminho: [
      "Contabilização: montar os lançamentos no caderno (p.20)",
      "Levar para o Livro diário e salvar uma vez",
      "Lançamentos aprovados pelo professor",
      "Efeitos nas demonstrações: o que mudou na DRE e no Balanço",
      "Parecer técnico (de 15 a 20 linhas)",
      "Entregar em Meu roteiro por etapas",
    ],
    controle: "Quarta: lançamentos já levados ao Livro diário e salvos.",
    erros: [
      "Salvar mais de uma vez pode duplicar os lançamentos (p.20)",
      "Débito diferente de Crédito",
      "Parecer que só descreve: deve dizer o que a folha mostra, quais provisões foram feitas e por quê, e o que isso significa para a empresa (p.20)",
    ],
    antesTitulo: "Antes de entregar (lista da p.21)",
    antes: ["Atividade da folha aprovada", "Cálculos conferidos", "Lançamentos levados ao Livro diário e salvos uma vez", "Lançamentos aprovados", "Efeitos observados", "Parecer escrito", "Entreguei dentro do prazo (05/11)"],
    regras: "Entregar depois de 05/11 desconta 2,0 pontos.",
    proxima: "Etapa 4 · Rescisão trabalhista · prazo 11/11.",
  },
  {
    de: "2026-11-09", ate: "2026-11-13", periodo: "09 a 13/11", etapa: "Etapa 4 — Rescisão trabalhista (CA)", prazo: "quarta 11/11",
    extra: "Quinta 12/11: começa a Etapa 5.",
    meta: "Até quarta, o caso de desligamento calculado e contabilizado (com a baixa das provisões), incidências definidas, documentos e prazos reunidos, conferência final feita e parecer escrito.",
    caminhoTitulo: "Caminho (as 6 telas da Etapa 4, p.22 a 25)",
    caminho: [
      "Caso e direitos",
      "Cálculo das verbas (ficha da p.24)",
      "Incidências: INSS, FGTS e IRRF de cada verba",
      "Contabilização: dar baixa nas provisões já constituídas e lançar só a diferença",
      "Documentos e prazos",
      "Conferência final (resultado: Aprovado, Revisar ou Bloqueado) e parecer; depois, Entregar",
    ],
    controle: "Segunda: caso lido, tipo de desligamento e datas anotados; verbas em cálculo na ficha da p.24.",
    erros: [
      "Lançar férias e 13º sem dar baixa nas provisões já feitas (p.23)",
      "Deixar de marcar INSS, FGTS ou IRRF em uma verba",
      "Resultado \"Bloqueado\": há item obrigatório faltando; ler o motivo, corrigir e conferir de novo (p.23)",
    ],
    antes: ["Fatos", "Dados", "Valores", "Obrigações", "Evidências (os cinco níveis da p.25)", "Parecer escrito", "Entregar clicado"],
    regras: "Critérios: fatos, dados e valores 30%, incidências 20%, contabilização 20%, documentos e prazo 10%, parecer 20%. Entregar depois de 11/11 desconta 2,0 pontos.",
    proxima: "Etapa 5 · Análise gerencial de balanços · prazo 19/11.",
  },
  {
    de: "2026-11-16", ate: "2026-11-20", periodo: "16 a 20/11", etapa: "Etapa 5 — Análise gerencial de balanços (AGB)", prazo: "quinta 19/11",
    extra: "A Etapa 5 começou em 12/11. Sexta 20/11 é feriado.",
    meta: "Até quinta, análise vertical e horizontal, indicadores e capital de giro calculados, interpretações escritas e o parecer final (quatro partes) entregue.",
    caminhoTitulo: "Caminho (telas da Etapa 5, p.26 a 30)",
    caminho: [
      "Análise vertical e horizontal (p.27)",
      "Indicadores: informar a base de dias nos prazos (p.28)",
      "Capital de giro: calcular CGL, NCG e saldo de tesouraria e classificar a empresa (p.29)",
      "Interpretações, com palavras suas",
      "Parecer e relatório final: liquidez e capital de giro; estrutura de capitais e endividamento; rentabilidade e desempenho; conclusão e recomendações (p.30)",
      "Entregar",
    ],
    controle: "Terça: AV/AH e indicadores calculados.",
    erros: [
      "Não informar a base de dias dos prazos médios (p.28)",
      "Usar fórmula diferente da plataforma",
      "Número sem interpretação (\"número sem interpretação não basta\", p.26)",
      "Parecer sem citar os números que sustentam cada conclusão (p.30)",
    ],
    antes: ["Cálculos conferidos", "Interpretações escritas", "As quatro partes do parecer escritas", "Entregar clicado"],
    regras: "Critérios: cálculos conferidos 50%, interpretações 20%, parecer final 30%. Entregar depois de 19/11 desconta 2,0 pontos.",
    proxima: "Etapa 6 · Análise comparativa · prazo 25/11.",
  },
  {
    de: "2026-11-23", ate: "2026-11-27", periodo: "23 a 27/11", etapa: "Etapa 6 — Análise comparativa (AGB)", prazo: "quarta 25/11",
    meta: "Até quarta, os mesmos indicadores calculados para as empresas propostas, a ficha comparativa preenchida e o parecer comparativo entregue.",
    caminhoTitulo: "Caminho (telas da Etapa 6, p.31 a 33)",
    caminho: [
      "Reunir os indicadores da sua empresa (resultados da etapa 5)",
      "Exercícios comparativos: calcular os mesmos indicadores das empresas propostas",
      "Comparativo entre empresas: preencher a ficha (p.32)",
      "Parecer comparativo: conclusão em uma frase, justificativa e o que a sua empresa deveria melhorar (p.33)",
      "Entregar em Meu roteiro por etapas",
    ],
    controle: "Segunda: indicadores da etapa 5 reunidos e exercícios iniciados.",
    erros: [
      "Comparar sem calcular os mesmos indicadores para todas as empresas",
      "Não dizer quem está melhor em cada aspecto e por quê (p.32)",
      "Parecer que não começa pela conclusão e não justifica com os números (p.33)",
    ],
    antes: ["Exercícios conferidos", "Ficha comparativa preenchida", "Parecer comparativo escrito", "Entregar clicado"],
    regras: "Critérios: exercícios conferidos 50%, parecer comparativo 50%. Entregar depois de 25/11 desconta 2,0 pontos.",
    proxima: "Fechamento do projeto (30/11 a 04/12).",
  },
  {
    de: "2026-11-30", ate: "2026-12-04", periodo: "30/11 a 04/12", etapa: "Fechamento do projeto", prazo: "sem prazo de etapa", extra: "Não há etapa nova.",
    meta: "Até sexta, nenhuma etapa com situação \"Ajustar\", retornos do professor lidos e o Registro de entregas e notas preenchido.",
    caminhoTitulo: "Caminho",
    caminho: [
      "Notas e retornos: ler a nota e as observações do professor de cada etapa (p.9)",
      "Corrigir e reenviar o que foi devolvido",
      "Preencher o Registro de entregas e notas (p.36)",
      "Dúvidas e problemas: Suporte, no grupo Controle (p.39)",
    ],
    erros: [],
    antes: ["Retornos lidos", "Nada devolvido sem reenvio", "Registro de entregas e notas preenchido (p.36)"],
    antesTitulo: "Antes de sair",
    regras: "O professor define como usar esta semana (devolutivas, fechamento de notas e retomada de pendências). As notas de cada etapa são separadas, sem média entre elas.",
    proxima: "",
  },
];

// Semana da data (AAAA-MM-DD): a que contém a data; antes do início, a primeira; depois do fim, a última.
export function indiceSemana(hojeISO) {
  for (let i = 0; i < SEMANAS.length; i++) if (hojeISO <= SEMANAS[i].ate) return i;
  return SEMANAS.length - 1;
}

// Texto simples do quadro (para copiar e colar em outro lugar ou ler no celular).
export function textoDoQuadro(s) {
  const L = [];
  L.push("SEMANA · " + s.periodo + " · " + s.etapa);
  L.push("Aulas da semana: " + AULAS_SEMANA + ". PRAZO: " + s.prazo + "." + (s.extra ? " " + s.extra : ""));
  L.push("");
  L.push("META: " + s.meta);
  L.push("");
  L.push((s.caminhoTitulo || "CAMINHO").toUpperCase());
  s.caminho.forEach((c, i) => L.push((i + 1) + ". " + c));
  if (s.controle) { L.push(""); L.push("PONTO DE CONTROLE: " + s.controle); }
  if (s.erros.length) { L.push(""); L.push("ERROS COMUNS:"); s.erros.forEach((e) => L.push("- " + e)); }
  L.push("");
  L.push((s.antesTitulo || "ANTES DE ENTREGAR").toUpperCase() + ":");
  s.antes.forEach((a) => L.push("☐ " + a));
  L.push("");
  L.push("REGRAS: " + s.regras);
  if (s.proxima) { L.push(""); L.push("PRÓXIMA SEMANA: " + s.proxima); }
  return L.join("\n");
}
