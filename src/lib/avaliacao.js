// Avaliação padronizada da plataforma — escala única de 0,0 a 10,0 (uma casa decimal).
// Cada etapa tem critérios com peso (somam 100%). A nota da etapa = soma (nota do critério × peso).
// Não há média entre etapas: as notas são digitadas no sistema da escola.
// "auto" = o sistema já calcula/sugere a nota do critério; "manual" = o professor digita (0 a 10).
export const ETAPAS = [
  { id: "f1", titulo: "Fase 1 · Escrituração completa", descricao: "Concluir as atividades da escrituração, do Diário ao Balanço.", entrega: "Lançamentos aprovados e parecer",
    criterios: [{ key: "nota", nome: "Nota da Fase 1 (a mesma da tela Notas: completude, qualidade técnica e autonomia, com o desconto por atraso)", peso: 100, tipo: "manual" }] },
  { id: "fp", titulo: "Atividade · Elaborar a folha de pagamento", descricao: "Calcular contracheques: proventos, descontos e salário líquido.", entrega: "Contracheques conferidos",
    criterios: [
      { key: "calculos", nome: "Cálculos conferidos", peso: 60, tipo: "auto" },
      { key: "quantidade", nome: "Quantidade de contracheques", peso: 20, tipo: "auto" },
      { key: "resumo", nome: "Resumo ou parecer sobre a folha", peso: 20, tipo: "manual" },
    ] },
  { id: "ca1", titulo: "Fase 2 · Folha do mês e provisões", descricao: "Folha consolidada, encargos, férias e 13º salário.", entrega: "Cálculos e parecer da folha",
    criterios: [{ key: "calculos", nome: "Cálculos conferidos", peso: 70, tipo: "manual" }, { key: "parecer", nome: "Parecer da folha", peso: 30, tipo: "manual" }] },
  { id: "ca2", titulo: "Fase 2 · Contabilização e efeitos", descricao: "Lançar a folha e ver o efeito nas demonstrações.", entrega: "Lançamentos da folha",
    criterios: [{ key: "lancamentos", nome: "Lançamentos conferidos (contas, valores e lados)", peso: 70, tipo: "manual" }, { key: "efeitos", nome: "Leitura dos efeitos nas demonstrações", peso: 30, tipo: "manual" }] },
  { id: "resc", titulo: "Fase 2 · Rescisão trabalhista", descricao: "Caso, cálculo, incidências, lançamentos e documentos.", entrega: "Conferência final",
    criterios: [
      { key: "calculo", nome: "Cálculo das verbas", peso: 30, tipo: "manual" }, { key: "incidencias", nome: "Incidências", peso: 20, tipo: "manual" },
      { key: "contab", nome: "Contabilização", peso: 20, tipo: "manual" }, { key: "docs", nome: "Documentos e prazos", peso: 10, tipo: "manual" },
      { key: "parecer", nome: "Parecer", peso: 20, tipo: "manual" },
    ] },
  { id: "agb", titulo: "Fase 3 · Análise gerencial (AGB)", descricao: "Análise vertical e horizontal, indicadores e capital de giro.", entrega: "Cálculos e interpretações",
    criterios: [{ key: "calculos", nome: "Cálculos conferidos", peso: 50, tipo: "manual" }, { key: "interpretacoes", nome: "Interpretações", peso: 20, tipo: "manual" }, { key: "parecer", nome: "Parecer final", peso: 30, tipo: "manual" }] },
  { id: "comp", titulo: "Fase 3 · Comparativo e parecer final", descricao: "Exercícios comparativos e parecer comparativo.", entrega: "Parecer comparativo enviado",
    criterios: [{ key: "exercicios", nome: "Exercícios conferidos", peso: 50, tipo: "manual" }, { key: "parecer", nome: "Parecer comparativo", peso: 50, tipo: "manual" }] },
];
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
