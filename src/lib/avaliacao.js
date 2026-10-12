// Avaliação padronizada da plataforma — escala única de 0,0 a 10,0 (uma casa decimal).
// Cada etapa tem critérios com peso (somam 100%). A nota da etapa = soma (nota do critério × peso).
// Não há média entre etapas: as notas são digitadas no sistema da escola.
// "auto" = o sistema já calcula/sugere a nota do critério; "manual" = o professor digita (0 a 10).
export const DESCONTO_ATRASO = 2; // pontos descontados da nota da etapa quando a entrega é feita depois do prazo (exceto etapa 1, que mantém a regra própria)
export const ETAPAS = [
  { id: "f1", titulo: "Escrituração", aulas: 8, prazoPadrao: "2026-10-16", descricao: "Concluir as atividades da escrituração, do Diário ao Balanço (iniciada na semana de 28/09; termina em 16/10).", entrega: "Lançamentos aprovados e parecer", semAtraso: true,
    criterios: [{ key: "nota", nome: "Nota da etapa 1 (a mesma da tela Notas: completude, qualidade técnica e autonomia, já com o desconto por atraso daquela tela)", peso: 100, tipo: "manual" }] },
  { id: "fp", titulo: "Folha de pagamento", aulas: 8, prazoPadrao: "2026-10-23", descricao: "Calcular contracheques: proventos, descontos e salário líquido.", entrega: "Contracheques conferidos",
    criterios: [
      { key: "calculos", nome: "Cálculos conferidos", peso: 60, tipo: "auto" },
      { key: "quantidade", nome: "Quantidade de contracheques", peso: 20, tipo: "auto" },
      { key: "resumo", nome: "Resumo ou parecer sobre a folha", peso: 20, tipo: "manual" },
    ] },
  { id: "ca", titulo: "Folha, provisões e contabilização", aulas: 12, prazoPadrao: "2026-11-05", descricao: "Folha do mês, provisões e encargos, contabilização, efeitos nas demonstrações e parecer.", entrega: "Cálculos, lançamentos e parecer da folha",
    criterios: [
      { key: "calculos", nome: "Cálculos conferidos (folha, provisões e encargos)", peso: 35, tipo: "auto" },
      { key: "lancamentos", nome: "Lançamentos conferidos e aprovados", peso: 35, tipo: "auto" },
      { key: "efeitos", nome: "Efeitos nas demonstrações (respostas preenchidas)", peso: 10, tipo: "auto" },
      { key: "parecer", nome: "Parecer técnico da folha", peso: 20, tipo: "manual" },
    ] },
  { id: "resc", titulo: "Rescisão trabalhista", aulas: 8, prazoPadrao: "2026-11-11", descricao: "Caso, cálculo, incidências, lançamentos e documentos.", entrega: "Conferência final e parecer",
    criterios: [
      { key: "calculo", nome: "Fatos, dados e valores das verbas", peso: 30, tipo: "auto" }, { key: "incidencias", nome: "Incidências (INSS, FGTS e IRRF)", peso: 20, tipo: "auto" },
      { key: "contab", nome: "Contabilização aprovada", peso: 20, tipo: "auto" }, { key: "docs", nome: "Documentos e prazo de pagamento", peso: 10, tipo: "auto" },
      { key: "parecer", nome: "Parecer da rescisão", peso: 20, tipo: "manual" },
    ] },
  { id: "agb", titulo: "Análise gerencial de balanços", aulas: 12, prazoPadrao: "2026-11-19", descricao: "Análise vertical e horizontal, indicadores, capital de giro e parecer final.", entrega: "Cálculos, interpretações e parecer final",
    criterios: [
      { key: "calculos", nome: "Cálculos conferidos (AV, AH, indicadores e capital de giro)", peso: 50, tipo: "auto" },
      { key: "interpretacoes", nome: "Interpretações (preenchimento; a qualidade é sua)", peso: 20, tipo: "auto" },
      { key: "parecer", nome: "Parecer final (sugestão pelo preenchimento das 4 partes)", peso: 30, tipo: "auto" },
    ] },
  { id: "comp", titulo: "Análise comparativa", aulas: 4, prazoPadrao: "2026-11-25", descricao: "Exercícios comparativos e parecer comparativo.", entrega: "Parecer comparativo enviado",
    criterios: [
      { key: "exercicios", nome: "Exercícios conferidos", peso: 50, tipo: "auto" },
      { key: "parecer", nome: "Parecer comparativo (sugestão pelo tamanho; a qualidade é sua)", peso: 50, tipo: "auto" },
    ] },
];
// Sem reserva e recuperação (decisão do professor em 12/10/2026). Mantido vazio: as telas que usam este texto simplesmente não mostram nada.
export const RESERVA_TEXTO = "";

export const etapaPorId = (id) => ETAPAS.find((e) => e.id === id) || null;

export const FAIXAS = [
  { nome: "Excelente", de: 9, ate: 10, classe: "ok", orientacao: "Mantenha o padrão; confira só os detalhes de arredondamento." },
  { nome: "Bom", de: 7, ate: 8.9, classe: "ok", orientacao: "Poucos ajustes: revise os itens marcados." },
  { nome: "Em desenvolvimento", de: 5, ate: 6.9, classe: "warn", orientacao: "Refaça os itens marcados e releia a explicação da etapa." },
  { nome: "Insuficiente", de: 0, ate: 4.9, classe: "bad", orientacao: "Procure o professor; a etapa precisa ser refeita antes de avançar." },
];
export const faixaDaNota = (n) => (n === null || n === undefined || isNaN(n) ? null : FAIXAS.find((f) => n >= f.de) || FAIXAS[FAIXAS.length - 1]);

export const limitaNota = (v) => { const n = Number(String(v).replace(",", ".")); return isNaN(n) ? null : Math.min(10, Math.max(0, Math.round(n * 10) / 10)); };
export const fmtNota = (n) => (n === null || n === undefined || isNaN(n) ? "—" : Number(n).toFixed(1).replace(".", ","));

// notas: { chaveCriterio: número } → nota da etapa (null se faltar algum critério)
export function notaDaEtapa(etapa, notas) {
  let soma = 0;
  for (const c of etapa.criterios) {
    const n = notas[c.key];
    if (n === null || n === undefined || n === "") return null;
    soma += Number(n) * (c.peso / 100);
  }
  return Math.round(soma * 10) / 10;
}

// Atraso: a entrega vale a PRIMEIRA vez que o aluno marcou como entregue. Prazo no formato "AAAA-MM-DD" (vale até o fim do dia).
export function entregaEmAtraso(prazo, entregaISO) {
  if (!prazo) return false;
  const lim = new Date(prazo + "T23:59:59");
  const e = entregaISO ? new Date(entregaISO) : new Date();
  return e.getTime() > lim.getTime();
}
export const aplicaDesconto = (notaCriterios, desconto) => (notaCriterios === null ? null : Math.round(Math.max(0, notaCriterios - (Number(desconto) || 0)) * 10) / 10);
