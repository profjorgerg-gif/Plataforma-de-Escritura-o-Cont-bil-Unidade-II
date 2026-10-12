// Menus do aluno e do professor organizados em Planejamento, Organização, Direção e Controle (PODC).
// Aprovado em 2026-10-12. Este arquivo só DEFINE o menu: não lê nem grava nada no Firestore.
// As chaves das telas (key) são as mesmas de sempre, então nada do que os alunos já digitaram é afetado.
import { etapasEfetivas, situacaoEtapa } from "./roteiro.js";

export const PODC = [
  { letra: "P", titulo: "Planejamento", sub: "o que fazer e quando" },
  { letra: "O", titulo: "Organização", sub: "o que preciso para trabalhar" },
  { letra: "D", titulo: "Direção", sub: "fazer as atividades, na ordem" },
  { letra: "C", titulo: "Controle", sub: "progresso, notas e retornos" },
];
export const PODC_PROF = [
  { letra: "P", titulo: "Planejamento", sub: "etapas, prazos e critérios" },
  { letra: "O", titulo: "Organização", sub: "turmas, etapas e material" },
  { letra: "D", titulo: "Direção", sub: "liberar, orientar e responder" },
  { letra: "C", titulo: "Controle", sub: "entregas, avaliação e notas" },
];
const [P, O, D, C] = PODC;
const [PP, PO, PD, PC] = PODC_PROF;

// As 6 etapas do projeto, na ordem do roteiro. "id" é o mesmo de lib/avaliacao.js.
export const ETAPAS_MENU_ALUNO = [
  { id: "f1", n: 1, titulo: "Escrituração", disc: "CI", numerado: true, itens: [
    { key: "empresa", label: "Empresa didática" },
    { key: "documentos", label: "Documentos fiscais" },
    { key: "digitacao", label: "Digitação e análise fiscal" },
    { key: "classificacao", label: "Classificação contábil" },
    { key: "diario", label: "Livro diário" },
    { key: "razao", label: "Livro razão" },
    { key: "balancete", label: "Balancete" },
    { key: "are", label: "ARE" },
    { key: "dre", label: "DRE" },
    { key: "bp", label: "Balanço patrimonial" },
  ] },
  { id: "fp", n: 2, titulo: "Folha de pagamento", disc: "CA", itens: [{ key: "ca-ativ", label: "Atividade · Elaborar a folha" }] },
  { id: "ca", n: 3, titulo: "Folha, provisões e contabilização", disc: "CA", itens: [
    { key: "ca-folha", label: "Folha do mês" },
    { key: "ca-prov", label: "Provisões e encargos" },
    { key: "ca-cont", label: "Contabilização" },
    { key: "ca-efeitos", label: "Efeitos nas demonstrações" },
    { key: "ca-parecer", label: "Parecer técnico" },
  ] },
  { id: "resc", n: 4, titulo: "Rescisão trabalhista", disc: "CA", itens: [
    { key: "resc-caso", label: "Caso e direitos" },
    { key: "resc-calc", label: "Cálculo das verbas" },
    { key: "resc-inc", label: "Incidências" },
    { key: "resc-cont", label: "Contabilização" },
    { key: "resc-doc", label: "Documentos e prazos" },
    { key: "resc-final", label: "Conferência final" },
  ] },
  { id: "agb", n: 5, titulo: "Análise gerencial de balanços", disc: "AGB", itens: [
    { key: "agb-av", label: "Análise vertical e horizontal" },
    { key: "agb-ind", label: "Indicadores" },
    { key: "agb-giro", label: "Capital de giro" },
    { key: "agb-parecer", label: "Parecer e relatório final" },
  ] },
  { id: "comp", n: 6, titulo: "Análise comparativa", disc: "AGB", itens: [
    { key: "agb-ex", label: "Exercícios comparativos" },
    { key: "agb-comp", label: "Comparativo entre empresas" },
  ] },
];

// chave da tela → id da etapa (para a faixa "Você está aqui" e para a tela de etapa bloqueada)
export const ETAPA_DA_TELA = {};
ETAPAS_MENU_ALUNO.forEach((e) => e.itens.forEach((it) => { ETAPA_DA_TELA[it.key] = e.id; }));
export const etapaDaTela = (key) => ETAPA_DA_TELA[key] || null;

const CURTO = { aprovada: "Aprovada", ajustar: "Ajustar", entregue: "Entregue", liberada: "Liberada", bloqueada: "Bloqueada" };

// Junta as 6 etapas com: se a fase já foi liberada pela turma (disponibilidade) e a situação no roteiro do aluno.
// disp = { f1, fp, ca, resc, agb, comp } (true/false) — vem das mesmas condições que antes decidiam mostrar cada grupo.
export function montarEtapasAluno({ roteiroCfg, rot, disp }) {
  const lista = etapasEfetivas(roteiroCfg || null);
  const out = ETAPAS_MENU_ALUNO.map((m) => {
    const idx = lista.findIndex((x) => x.id === m.id);
    const base = idx >= 0 ? lista[idx] : {};
    const disponivel = m.id === "f1" ? true : !!disp[m.id];
    let sit = null;
    if (roteiroCfg && idx >= 0 && rot) sit = situacaoEtapa(lista, idx, rot.estado, rot.entregas);
    let cod, rotulo, classe;
    if (!disponivel) { cod = "bloqueada"; rotulo = "Bloqueada: o professor ainda não liberou"; classe = "gray"; }
    else if (sit && sit.cod !== "bloqueada") { cod = sit.cod; rotulo = sit.rotulo; classe = sit.classe; }
    else { cod = "liberada"; rotulo = "Liberada"; classe = "warn"; }
    return {
      ...m, prazo: base.prazo || "", aulas: base.aulas != null ? base.aulas : null, descricao: base.descricao || "", entrega: base.entrega || "",
      disponivel, cod, rotulo, classe, curto: CURTO[cod], entregue: !!(sit && sit.entregue), retorno: sit && sit.reg ? sit.reg.retorno || "" : "", atual: false,
    };
  });
  // etapa atual = a primeira disponível que ainda não foi aprovada
  const i = out.findIndex((e) => e.disponivel && e.cod !== "aprovada");
  if (i >= 0) { out[i].atual = true; if (out[i].cod === "liberada") out[i].curto = "Em andamento"; }
  return out;
}

// ---------- ALUNO ----------
export function gruposMenuAlunoPodc({ etapas, incluirManuais, incluirRoteiroTestes, mostrarPi, badgeDiario, badgeSuporte }) {
  const comBadge = (it) => (it.key === "diario" && badgeDiario > 0 ? { ...it, badge: badgeDiario } : it);
  const etapasMenu = etapas.map((e) => ({
    id: e.id, n: e.n, label: e.titulo, disc: e.disc, numerado: !!e.numerado, curto: e.curto, rotulo: e.rotulo, classe: e.classe, atual: e.atual, disponivel: e.disponivel,
    itens: e.itens.map(comBadge),
  }));
  return [
    { itens: [{ key: "inicio", label: "🧭 Comece aqui" }, ...(incluirRoteiroTestes ? [{ key: "roteiro-testes", label: "🧪 Roteiro de testes" }] : [])] },
    { podc: P, itens: [
      ...(mostrarPi ? [{ key: "etapas", label: "Meu roteiro por etapas" }, { key: "cronograma", label: "Cronograma" }] : []),
      { key: "roteiro", label: "Roteiro do Aluno" },
      ...(incluirManuais ? [{ key: "manual-aluno", label: "Manual do Aluno" }] : []),
    ] },
    { podc: O, itens: [{ key: "plano", label: "Plano de contas" }, { key: "consulta", label: "Consulta CFOP/NCM" }] },
    { podc: D, itens: [], etapas: etapasMenu },
    { podc: C, itens: [
      { key: "dashboard", label: "Meu progresso" },
      ...(mostrarPi ? [{ key: "notas-etapas", label: "Notas e retornos" }] : []),
      { key: "minha-nota", label: "Minha nota (Etapa 1)" },
      { key: "suporte", label: "Suporte", ...(badgeSuporte > 0 ? { badge: badgeSuporte } : {}) },
    ] },
  ];
}

// ---------- PROFESSOR ----------
// roteiro-prazos e roteiro-lib abrem a MESMA tela de roteiro (RoteiroProfessor), só em abas diferentes.
export const ABA_DO_ROTEIRO = { "roteiro-prof": "sit", "roteiro-lib": "sit", "roteiro-prazos": "cfg", "roteiro-folha": "folha" };

export function manuaisProfessor(papel) {
  if (papel === "professor") return [{ key: "manual-professor", label: "Manual do Professor" }, { key: "manual-aluno", label: "Manual do Aluno" }];
  if (papel === "admin") return [{ key: "manual-aluno", label: "Manual do Aluno" }, { key: "manual-professor", label: "Manual do Professor" }, { key: "manual-operacao", label: "Manual de Operacionalização" }];
  return [];
}

export function gruposMenuProfessorPodc({ papel, badgeFila, badgeSuporte }) {
  const b = (key, label, n, extra) => ({ key, label, ...(n > 0 ? { badge: n } : {}), ...(extra || {}) });
  return [
    { itens: [{ key: "inicio", label: "🧭 Comece aqui" }, { key: "roteiro-testes", label: "🧪 Roteiro de testes" }] },
    { podc: PP, itens: [
      { key: "guia", label: "Guia do professor" },
      { key: "roteiro-prazos", label: "Etapas e prazos" },
      { key: "cronograma", label: "Cronograma" },
      { key: "caderno", label: "Caderno do Aluno (imprimir)" },
      { key: "roteiro-folha", label: "Atividade da folha" },
      { key: "roteiro", label: "Roteiro do Aluno" },
    ] },
    { podc: PO, itens: [
      { key: "turmas", label: "Turmas" },
      { key: "documentos", label: "Documentos fiscais" },
      { key: "ca-prof", label: "Etapa 3 · CA (turma)" },
      { key: "resc-prof", label: "Etapa 4 · Rescisão (turma)" },
      { key: "agb-prof", label: "Etapas 5–6 · AGB (turma)" },
      { key: "plano", label: "Plano de contas" },
      { key: "consulta", label: "Consulta CFOP/NCM" },
    ] },
    { podc: PD, itens: [
      { key: "painel", label: "Painel do professor" },
      { key: "roteiro-lib", label: "Liberar etapas" },
      b("fila", "Fila de correção", badgeFila),
      b("suporte", "Suporte", badgeSuporte),
      { key: "relatorio", label: "Relatório de orientação" },
      { key: "modelos", label: "Modelos de mensagens" },
    ] },
    { podc: PC, itens: [
      { key: "dashboard-ciclo", label: "Dashboard do ciclo" },
      { key: "aval-prof", label: "Avaliação das etapas (0 a 10)" },
      { key: "notas", label: "Notas" },
      { key: "historico", label: "Histórico do aluno" },
      { key: "registro", label: "Registro do processo" },
      { key: "refazer", label: "Refazer nota do aluno", aviso: "⚠ mexe nos dados" },
    ] },
    { id: "ferramentas", label: "ferramentas e manuais", recolhivel: true, itens: [{ key: "modoteste", label: "Modo de teste" }, ...manuaisProfessor(papel)] },
  ];
}
