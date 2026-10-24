import { useEffect, useState } from "react";
import { useTema } from "../../hooks/useTema.js";
import { useEscrituracao } from "../../hooks/useEscrituracao.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useTurmasDoProfessor } from "../../hooks/useTurmasDoProfessor.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useProgressoAluno } from "../../hooks/useProgressoAluno.js";
import { useMeuRegistroDeAluno } from "../../hooks/useMeuRegistroDeAluno.js";
import { useTurma } from "../../hooks/useTurma.js";
import { useAgbTurma, useTrabalhoAgb } from "../../hooks/useAgb.js";
import { useCaTurma, useTrabalhoCa } from "../../hooks/useCa.js";
import {
  fmt, completudeCiclo, autonomiaCorrecoes, notaFinalPonderada, qualidadeTecnicaAutomatica,
  prazoEfetivo, diasAtraso, fmtData, descontoEfetivo, PESOS_RUBRICA,
} from "../../lib/contabil.js";
import { backupDoAluno, backupDaTurma } from "../../lib/backup.js";
import { CriteriosAvaliacao } from "../shared/UI.jsx";

import EmpresaDidatica from "../aluno/EmpresaDidatica.jsx";
import DocumentosFiscais from "../aluno/DocumentosFiscais.jsx";
import DigitacaoAnaliseFiscal from "../aluno/DigitacaoAnaliseFiscal.jsx";
import PlanoContas from "../aluno/PlanoContas.jsx";
import ClassificacaoContabil from "../aluno/ClassificacaoContabil.jsx";
import LivroDiario from "../aluno/LivroDiario.jsx";
import LivroRazao from "../aluno/LivroRazao.jsx";
import Balancete from "../aluno/Balancete.jsx";
import ARE from "../aluno/ARE.jsx";
import DRE from "../aluno/DRE.jsx";
import BalancoPatrimonial from "../aluno/BalancoPatrimonial.jsx";

import Painel from "../professor/Painel.jsx";
import Notas from "../professor/Notas.jsx";
import DashboardCiclo from "../professor/DashboardCiclo.jsx";
import RelatorioOrientacao from "../professor/RelatorioOrientacao.jsx";
import ModelosMensagens from "../professor/ModelosMensagens.jsx";
import SuporteAluno from "../aluno/SuporteAluno.jsx";
import SuporteProfessor from "../professor/SuporteProfessor.jsx";
import RefazerNota from "../professor/RefazerNota.jsx";
import RegistroProcesso from "../professor/RegistroProcesso.jsx";
import GuiaProfessor from "../professor/GuiaProfessor.jsx";
import FluxoEtapa from "../shared/FluxoEtapa.jsx";
import FluxoEtapaPI from "../shared/FluxoEtapaPI.jsx";
import EtapaFechada from "../shared/EtapaFechada.jsx";
import Fechamento from "../professor/Fechamento.jsx";
import { situacaoPrazo } from "../../lib/fechamento.js";
import { useFechamentoSync } from "../../hooks/useFechamentoSync.js";
import { useChamados } from "../../hooks/useChamados.js";
import Turmas from "../professor/Turmas.jsx";
import FilaCorrecao from "../professor/FilaCorrecao.jsx";
import HistoricoAluno from "../professor/HistoricoAluno.jsx";
import DocumentosFiscaisProfessor from "../professor/DocumentosFiscaisProfessor.jsx";
import ModoTeste from "../professor/ModoTeste.jsx";
import VerComoAluno from "../professor/VerComoAluno.jsx";
import TravaLeitura from "../professor/TravaLeitura.jsx";

import ManualAluno from "../manuais/ManualAluno.jsx";
import ManualProfessor from "../manuais/ManualProfessor.jsx";
import ManualOperacao from "../manuais/ManualOperacao.jsx";
import FluxogramaProcesso from "../manuais/FluxogramaProcesso.jsx";
import RoteiroAluno from "../manuais/RoteiroAluno.jsx";
import ConsultaFiscal from "../shared/ConsultaFiscal.jsx";
import AnaliseVH from "../aluno/AnaliseVH.jsx";
import Indicadores from "../aluno/Indicadores.jsx";
import CapitalGiro from "../aluno/CapitalGiro.jsx";
import AgbExercicios, { exerciciosVisiveis } from "../aluno/AgbExercicios.jsx";
import AgbComparativo from "../aluno/AgbComparativo.jsx";
import EtapasAluno from "../aluno/EtapasAluno.jsx";
import NotasEtapas from "../aluno/NotasEtapas.jsx";
import FolhaAtividade from "../aluno/FolhaAtividade.jsx";
import RoteiroProfessor from "../professor/RoteiroProfessor.jsx";
import { CronogramaAluno, CronogramaProfessor } from "../shared/Cronograma.jsx";
import CadernoAluno from "../professor/CadernoAluno.jsx";
import CabecalhosCadernos from "../professor/CabecalhosCadernos.jsx";
import CadernoFolha from "../professor/CadernoFolha.jsx";
import DiretrizSemana from "../professor/DiretrizSemana.jsx";
import PlanosSemestrais from "../professor/PlanosSemestrais.jsx";
import DescricoesEscola from "../professor/DescricoesEscola.jsx";
import LotesFluxo from "../professor/LotesFluxo.jsx";
import FluxoTelas from "../aluno/FluxoTelas.jsx";
import EnviosPorLote from "../professor/EnviosPorLote.jsx";
import { useFluxoAluno } from "../../hooks/useFluxoAluno.js";
import { estadoFluxo } from "../../lib/fluxoLotes.js";
import TelaComAbas from "../professor/TelaComAbas.jsx";
import InicioAluno, { FaixaEtapa, EtapaBloqueada } from "../shared/InicioAluno.jsx";
import InicioProfessor from "../professor/InicioProfessor.jsx";
import SalaDeAula from "../professor/SalaDeAula.jsx";
import RoteiroTestes, { FaixaTeste } from "../professor/RoteiroTestes.jsx";
import { useProgressoTestes } from "../../hooks/useProgressoTestes.js";
import { passoDoTeste } from "../../lib/roteiroTestes.js";
import { gruposMenuAlunoPodc, gruposMenuProfessorPodc, menuSuperiorProfessor, menuSuperiorAluno, montarEtapasAluno, etapaDaTela, ABRIR_EM, TELAS_COM_ABAS } from "../../lib/menuPodc.js";
import MesaProfessor from "./MesaProfessor.jsx";
import PainelTurma from "../professor/PainelTurma.jsx";
import { useMesa } from "../../hooks/useMesa.js";
import { useTelaLarga } from "../../hooks/useTelaLarga.js";
import { mesaAlunoLiberada } from "../../lib/mesaAluno.js";
import AvaliacaoProfessor from "../professor/AvaliacaoProfessor.jsx";
import ConferenciaFolha from "../professor/ConferenciaFolha.jsx";
import DemonstracoesAlunos from "../professor/DemonstracoesAlunos.jsx";
import GuiaLancamentos from "../shared/GuiaLancamentos.jsx";
import TabelasInssIrrf from "../shared/TabelasInssIrrf.jsx";
import FormulasFolha from "../shared/FormulasFolha.jsx";
import Laboratorio2027 from "../professor/Laboratorio2027.jsx";
import { GuiaEtapa2, GuiaEtapa3, GuiaEtapa4, GuiaEtapas56 } from "../shared/GuiaPorEtapa.jsx";
import { TabelaFolhaEncargos, TabelaRescisao } from "../shared/TabelasFolhaRescisao.jsx";
import { useRoteiroTurma, useRoteiroAluno, useAvaliacoesAluno } from "../../hooks/useRoteiro.js";
import ParecerFinal from "../aluno/ParecerFinal.jsx";
import AgbProfessor from "../professor/AgbProfessor.jsx";
import FolhaMes from "../aluno/FolhaMes.jsx";
import ProvisoesEncargos from "../aluno/ProvisoesEncargos.jsx";
import ContabilizacaoFolha from "../aluno/ContabilizacaoFolha.jsx";
import EfeitosFolha from "../aluno/EfeitosFolha.jsx";
import ParecerFolha from "../aluno/ParecerFolha.jsx";
import CaProfessor from "../professor/CaProfessor.jsx";
import RescisaoProfessor from "../professor/RescisaoProfessor.jsx";
import RescCaso from "../aluno/RescCaso.jsx";
import RescCalculo from "../aluno/RescCalculo.jsx";
import RescIncidencias from "../aluno/RescIncidencias.jsx";
import RescContabilizacao from "../aluno/RescContabilizacao.jsx";
import RescDocumentos from "../aluno/RescDocumentos.jsx";
import RescConferencia from "../aluno/RescConferencia.jsx";
import { useRescisaoTurma } from "../../hooks/useRescisao.js";

// Casca do app: sidebar + topbar + área de conteúdo, com o papel vindo de
// verdade do Firestore (perfil.papel), não mais de um botão de demonstração.
//
// LADO DO ALUNO: completo — todas as 12 telas ligadas ao Firestore
// (Digitação da NF-e e Análise fiscal foram fundidas numa só tela em
// 2026-09-28: nunca trocaram dados entre si, só compartilhavam o mesmo PDF
// de referência — ver nota em DigitacaoAnaliseFiscal.jsx).
// LADO DO PROFESSOR: completo — Painel (+ Avaliação embutida), Turmas
// (+ importação de alunos via PDF), Fila de Correção, Histórico do aluno,
// Documentos Fiscais (+ ZIP), Plano de Contas, Modo de teste.
//
// MODO DE TESTE: o professor cria uma "conta de teste" (turmas/{id}/alunos
// com contaTeste:true) e entra nela para navegar pelas telas do aluno sem
// precisar de uma segunda conta Google. As regras do Firestore (função
// podeAgirComoEsteAluno) só liberam escrita do professor nessa conta
// marcada — nunca em alunos reais. Enquanto ativo, papelEfetivo/turmaId/
// matricula abaixo passam a apontar para a conta de teste, e um aviso fixo
// aparece no topo do conteúdo.
//
// MANUAIS: aluno vê só o Manual do Aluno; professor só o Manual do
// Professor; admin vê os três (inclui o de Operacionalização, mais
// técnico). Isso usa perfil.papel de verdade — não muda em modo de teste.

// Menu do aluno reorganizado em grupos (2026-10-07, pedido do professor: os
// alunos estavam se perdendo da sequência). Antes era uma lista única, com
// as 10 telas da sequência da empresa didática misturadas com telas de
// apoio/consulta (Roteiro, Consulta CFOP/NCM, Plano de contas) — agora a
// sequência fica separada e numerada (1 a 10, na ordem real do exercício),
// e o que é só apoio/consulta fica num grupo à parte, sem número.
const MENU_ALUNO_GRUPOS = [
  {
    label: null,
    itens: [
      { key: "dashboard", label: "Meu progresso" },
      { key: "minha-nota", label: "Minha nota" },
    ],
  },
  {
    label: "sequência da empresa didática",
    numerado: true,
    itens: [
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
    ],
  },
  {
    label: "apoio e consulta",
    itens: [
      { key: "roteiro", label: "Roteiro do Aluno" },
      { key: "guia-proj", label: "Guia de lançamentos" },
      { key: "tabelas-proj", label: "Tabelas" },
      { key: "suporte", label: "Suporte" },
    ],
  },
];

// Fase 3 — Análise Gerencial de Balanços (AGB). Grupo NOVO: só aparece para o aluno
// quando o professor libera (ou na conta de teste). Não altera nenhum item acima.
// Fase 2 — Contabilidade Avançada (folha de pagamento e provisões). Mesmo esquema: grupo NOVO,
// só aparece quando o professor libera (ou na conta de teste).
const MENU_ALUNO_CA = {
  label: "etapas 2 e 3 · contabilidade avançada (CA)",
  itens: [
    { key: "ca-folha", label: "Folha do mês" },
    { key: "ca-prov", label: "Provisões e encargos" },
    { key: "ca-cont", label: "Contabilização" },
    { key: "ca-efeitos", label: "Efeitos nas demonstrações" },
    { key: "ca-parecer", label: "Parecer técnico" },
  ],
};

// Fase 2 — Rescisão trabalhista. Grupo NOVO: aparece só quando o professor libera a rescisão (ou na conta de teste).
const MENU_ALUNO_RESC = {
  label: "etapa 4 · rescisão trabalhista",
  itens: [
    { key: "resc-caso", label: "Caso e direitos" },
    { key: "resc-calc", label: "Cálculo das verbas" },
    { key: "resc-inc", label: "Incidências" },
    { key: "resc-cont", label: "Contabilização" },
    { key: "resc-doc", label: "Documentos e prazos" },
    { key: "resc-final", label: "Conferência final" },
  ],
};

// Projeto interdisciplinar: roteiro por etapas e notas. Aparece quando o professor configura o roteiro (ou na conta de teste).
const MENU_ALUNO_PI = {
  label: "projeto interdisciplinar",
  itens: [
    { key: "etapas", label: "Meu roteiro por etapas" },
    { key: "notas-etapas", label: "Notas e retornos" },
  ],
};

const MENU_ALUNO_AGB = {
  label: "etapas 5 e 6 · análise gerencial (AGB)",
  itens: [
    { key: "agb-av", label: "Análise vertical e horizontal" },
    { key: "agb-ind", label: "Indicadores" },
    { key: "agb-giro", label: "Capital de giro" },
    { key: "agb-parecer", label: "Parecer e relatório final" },
  ],
};

// Monta os grupos do menu do aluno já com o badge de pendências (no item
// "Livro diário") e, quando for o caso, o grupo de manuais ao final — mesmo
// padrão usado no modo de teste (sem manuais) e no aluno de verdade (com).
function gruposMenuAluno({ incluirManuais, badgeDiario, badgeSuporte, mostrarAgb, mostrarExAgb, mostrarCa, mostrarResc, mostrarPi, mostrarAtivFolha }) {
  const grupos = MENU_ALUNO_GRUPOS.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.map((item) =>
      item.key === "diario" && badgeDiario > 0 ? { ...item, badge: badgeDiario }
        : item.key === "suporte" && badgeSuporte > 0 ? { ...item, badge: badgeSuporte } : item
    ),
  }));
  if (mostrarCa) {
    const posAgb = grupos.findIndex((g) => g.label === "apoio e consulta");
    const menuCa = mostrarAtivFolha ? { ...MENU_ALUNO_CA, itens: [{ key: "ca-ativ", label: "Atividade · Elaborar a folha" }].concat(MENU_ALUNO_CA.itens) } : MENU_ALUNO_CA;
    grupos.splice(posAgb < 0 ? grupos.length : posAgb, 0, menuCa);
  }
  if (mostrarResc) {
    const posResc = grupos.findIndex((g) => g.label === "apoio e consulta");
    grupos.splice(posResc < 0 ? grupos.length : posResc, 0, MENU_ALUNO_RESC);
  }
  if (mostrarAgb) {
    const posApoio = grupos.findIndex((g) => g.label === "apoio e consulta");
    const menuAgb = mostrarExAgb
      ? { ...MENU_ALUNO_AGB, itens: MENU_ALUNO_AGB.itens.concat([{ key: "agb-ex", label: "Exercícios comparativos" }, { key: "agb-comp", label: "Comparativo entre empresas" }]) }
      : MENU_ALUNO_AGB;
    grupos.splice(posApoio < 0 ? grupos.length : posApoio, 0, menuAgb);
  }
  if (mostrarPi) {
    const posPi = grupos.findIndex((g) => g.label === "apoio e consulta");
    grupos.splice(posPi < 0 ? grupos.length : posPi, 0, MENU_ALUNO_PI);
  }
  if (incluirManuais) grupos.push({ label: "manuais", itens: manuaisPara("aluno") });
  return grupos;
}

// Menu do professor agrupado por função (2026-10-08, mesmo pedido do
// professor que levou ao reagrupamento do menu do aluno: tudo numa lista só
// misturava "o que eu olho todo dia" com "ferramenta de apoio que uso de vez
// em quando"). Sem numeração — ao contrário do aluno, o professor não segue
// uma sequência fixa de telas.
const MENU_PROFESSOR_GRUPOS = [
  { label: null, itens: [{ key: "guia", label: "🧭 Guia do professor" }] },
  {
    label: "hoje",
    itens: [
      { key: "painel", label: "Painel do professor" },
      { key: "fila", label: "Fila de correção" },
      { key: "suporte", label: "Suporte" },
    ],
  },
  {
    label: "acompanhar",
    itens: [
      { key: "dashboard-ciclo", label: "Dashboard do ciclo" },
      { key: "historico", label: "Histórico do aluno" },
      { key: "registro", label: "Registro do processo" },
      { key: "documentos", label: "Documentos fiscais" },
    ],
  },
  {
    label: "corrigir e orientar",
    itens: [
      { key: "relatorio", label: "Relatório de orientação" },
      { key: "modelos", label: "Modelos de mensagens" },
      { key: "refazer", label: "Refazer nota do aluno", aviso: "⚠ mexe nos dados" },
    ],
  },
  { label: "etapas do projeto interdisciplinar", itens: [{ key: "ca-prof", label: "Etapa 3 · CA (turma)" }, { key: "resc-prof", label: "Etapa 4 · Rescisão (turma)" }, { key: "agb-prof", label: "Etapas 5–6 · AGB (turma)" }, { key: "roteiro-prof", label: "Roteiro por etapas (turma)" }] },
  { label: "notas", itens: [{ key: "notas", label: "Notas" }, { key: "aval-prof", label: "Avaliação das etapas (0 a 10)" }] },
  {
    id: "preparar",
    label: "preparar e consultar",
    recolhivel: true,
    itens: [
      { key: "turmas", label: "Turmas" },
      { key: "roteiro", label: "Roteiro do Aluno" },
      { key: "consulta", label: "Consulta CFOP/NCM" },
      { key: "plano", label: "Plano de contas" },
    ],
  },
];

// Monta os grupos do menu do professor já com o badge de pendências (no
// item "Fila de correção") e o grupo de manuais ao final — mesmo padrão
// usado em gruposMenuAluno().
function gruposMenuProfessor({ papel, badgeFila, badgeSuporte }) {
  const grupos = MENU_PROFESSOR_GRUPOS.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.map((item) =>
      item.key === "fila" && badgeFila > 0 ? { ...item, badge: badgeFila }
        : item.key === "suporte" && badgeSuporte > 0 ? { ...item, badge: badgeSuporte } : item
    ),
  }));
  // Modo de teste + manuais ficam juntos num grupo recolhível (2026-10-09).
  grupos.push({
    id: "ferramentas", label: "ferramentas e manuais", recolhivel: true,
    itens: [{ key: "modoteste", label: "Modo de teste" }, ...manuaisPara(papel)],
  });
  return grupos;
}

function manuaisPara(papel) {
  if (papel === "aluno") return [{ key: "manual-aluno", label: "Manual do Aluno" }];
  if (papel === "professor") return [
    { key: "manual-professor", label: "Manual do Professor" },
    { key: "manual-aluno", label: "Manual do Aluno" },
  ];
  if (papel === "admin") return [
    { key: "manual-aluno", label: "Manual do Aluno" },
    { key: "manual-professor", label: "Manual do Professor" },
    { key: "manual-operacao", label: "Manual de Operacionalização" },
  ];
  return [];
}

// ✓ / — indicando se aquela etapa já foi feita para o documento, na ordem
// certa do exercício (Digitação → Análise fiscal → Classificação → Diário).
// Ajuda quem trava sem saber "o que falta fazer agora" para aquele documento.
function ChecklistProgresso({ documentos, progresso, lancamentos }) {
  const { digitacoes, analises, classificacoes } = progresso;
  const carregando = documentos === null || digitacoes === null || analises === null || classificacoes === null;

  if (carregando) return null;
  if (documentos.length === 0) return null;

  function marca(feito) { return feito ? <span style={{ color: "var(--green)" }}>✓</span> : <span style={{ color: "var(--ink-faint)" }}>—</span>; }

  return (
    <div className="panel">
      <div className="panel-head"><h3>Checklist por documento</h3></div>
      <div className="panel-body" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Documento</th><th className="num">1. Digitação</th><th className="num">2. Análise fiscal</th><th className="num">3. Classificação</th><th className="num">4. Livro diário</th></tr></thead>
          {/* Colunas 1 e 2 são preenchidas na mesma tela ("Digitação e análise fiscal"), mas continuam sendo dois registros
              independentes no Firestore — por isso seguem marcadas separadamente aqui. */}
          <tbody>
            {documentos.map((d) => {
              const digitado = !!digitacoes[d.id];
              const analisado = analises[d.id]?.status === "enviado";
              const classificado = classificacoes.some((c) => c.documento === d.id);
              const lancado = lancamentos.some((l) => l.documento === d.id);
              return (
                <tr key={d.id}>
                  <td className="mono">{d.id}</td>
                  <td className="num">{marca(digitado)}</td>
                  <td className="num">{marca(analisado)}</td>
                  <td className="num">{marca(classificado)}</td>
                  <td className="num">{marca(lancado)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="helper-note" style={{ margin: "0 16px 16px" }}>Siga a ordem das colunas como sequência de estudo para cada documento. Nem toda coluna usa os dados da anterior: a Classificação só é avisada se você sinalizou algo incorreto na Análise fiscal, e o Lançamento pode vir pronto da Classificação — a Digitação é um exercício à parte.</div>
    </div>
  );
}

// Mostra a nota da Fase 1 decomposta nos três componentes da rubrica,
// não só um número seco — o aluno vê exatamente o que pesou em cada parte.
// Só aparece quando o professor já liberou (mesma regra de sempre).
function MinhaNota({ registro, turma, documentos, progresso, lancamentos }) {
  if (!registro || !registro.notaLiberada) return null;

  const completudePct = documentos ? completudeCiclo(documentos, progresso.digitacoes, progresso.analises, progresso.classificacoes, lancamentos) : null;
  const autonomiaPct = autonomiaCorrecoes(lancamentos);
  const desconto = turma ? descontoEfetivo(registro, turma) : (registro.desconto || 0);
  const notaFinal = notaFinalPonderada({ completudePct, qualidadeNota: registro.nota, autonomiaPct, desconto });
  const prazo = turma ? prazoEfetivo(registro, turma) : null;
  const dias = turma ? diasAtraso(registro.dataEntrega, prazo) : 0;

  return (
    <div className="panel">
      <div className="panel-head"><h3>Minha nota — Etapa 1 · Escrituração</h3></div>
      <div className="panel-body">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-label">Completude do ciclo ({Math.round(PESOS_RUBRICA.completude * 100)}%)</div><div className="kpi-value mono">{completudePct === null ? "—" : completudePct + "%"}</div></div>
          <div className="kpi"><div className="kpi-label">Qualidade técnica ({Math.round(PESOS_RUBRICA.qualidade * 100)}%)</div><div className="kpi-value mono">{registro.nota ?? "—"}</div></div>
          <div className="kpi"><div className="kpi-label">Autonomia ({Math.round(PESOS_RUBRICA.autonomia * 100)}%)</div><div className="kpi-value mono">{autonomiaPct === null ? "—" : autonomiaPct + "%"}</div></div>
          <div className="kpi ok"><div className="kpi-label">Nota final</div><div className="kpi-value mono">{notaFinal === null ? "—" : fmt(notaFinal)}</div></div>
        </div>
        {dias > 0 && <div className="helper-note">Desconto de {fmt(desconto)} ponto(s) já aplicado na nota final, por {dias} dia(s) de atraso em relação ao prazo ({fmtData(prazo)}).</div>}
        <div className="helper-note">Completude e autonomia são calculadas automaticamente a partir do que você já fez no sistema; a qualidade técnica é a avaliação do seu professor sobre o raciocínio contábil.</div>
        {registro.parecer && registro.parecer.trim() && <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--paper)", fontSize: 13.5 }}><b>Parecer técnico do professor</b><div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{registro.parecer}</div></div>}
      </div>
    </div>
  );
}

// As 10 etapas da sequência (mesma ordem numerada do menu — ver
// MENU_ALUNO_GRUPOS). Etapas 1–2 (Empresa didática, Documentos fiscais) são
// só informativas, sem ação do aluno para "concluir" — por isso contam como
// feitas assim que a turma tem ao menos um documento liberado. Etapas 3–5
// (Digitação/análise, Classificação, Livro diário) ficam concluídas quando
// TODOS os documentos liberados passaram por aquela etapa (lançamento só
// conta aprovado — mesmo critério do completudeCiclo, usado na nota). As
// etapas 6–10 (Razão → Balanço) são só consulta de relatórios calculados
// automaticamente: ficam "concluídas" junto com a 5, já que não exigem uma
// ação separada do aluno.
const ETAPAS_FLUXO = [
  { n: 1, label: "Empresa didática", desc: "Cadastro informativo da empresa que você vai escriturar: nome, CNPJ e atividade." },
  { n: 2, label: "Documentos fiscais", desc: "Confira as notas fiscais que o professor liberou para a sua turma." },
  { n: 3, label: "Digitação e análise fiscal", desc: "Digite os dados da NF-e e analise se CFOP, NCM e CST estão corretos." },
  { n: 4, label: "Classificação contábil", desc: "Defina a conta de débito e a conta de crédito de cada fato contábil." },
  { n: 5, label: "Livro diário", desc: "Lance a classificação no diário e envie para o professor aprovar." },
  { n: 6, label: "Livro razão", desc: "Confira o razão — atualizado sozinho a partir dos lançamentos já aprovados." },
  { n: 7, label: "Balancete", desc: "Confira se o balancete fecha: soma dos débitos igual à soma dos créditos." },
  { n: 8, label: "ARE", desc: "Veja a Apuração do Resultado do Exercício, calculada a partir do razão." },
  { n: 9, label: "DRE", desc: "Veja a Demonstração do Resultado do Exercício." },
  { n: 10, label: "Balanço patrimonial", desc: "Veja o balanço final: Ativo = Passivo + Patrimônio Líquido." },
];

function FluxoEtapas({ documentos, progresso, lancamentos }) {
  // Se o progresso ainda não carregou (ou um listener falhou), o fluxograma
  // continua aparecendo, só que com tudo como "a fazer" — antes sumia em silêncio.
  const digitacoes = progresso?.digitacoes || {};
  const analises = progresso?.analises || {};
  const classificacoes = progresso?.classificacoes || [];
  lancamentos = lancamentos || [];
  documentos = documentos || [];
  const total = documentos.length;

  const nDigAnalisado = documentos.filter((d) => digitacoes[d.id] && analises[d.id]?.status === "enviado").length;
  const nClassificado = documentos.filter((d) => classificacoes.some((c) => c.documento === d.id)).length;
  const nAprovado = documentos.filter((d) => lancamentos.some((l) => l.documento === d.id && l.status === "aprovado")).length;

  const concluido = {
    1: true,
    2: total > 0,
    3: total > 0 && nDigAnalisado === total,
    4: total > 0 && nClassificado === total,
    5: total > 0 && nAprovado === total,
  };
  concluido[6] = concluido[7] = concluido[8] = concluido[9] = concluido[10] = concluido[5];

  // primeira etapa ainda não concluída = "você está aqui"
  let atual = ETAPAS_FLUXO.find((e) => !concluido[e.n])?.n ?? null;

  const fracao = { 3: `${nDigAnalisado}/${total}`, 4: `${nClassificado}/${total}`, 5: `${nAprovado}/${total}` };

  const estilo = (n) => {
    const feita = concluido[n], ehAtual = n === atual;
    return {
      feita, ehAtual,
      bg: feita ? "var(--green-pale)" : ehAtual ? "var(--amber-pale)" : "var(--paper-deep)",
      borda: feita ? "var(--green)" : ehAtual ? "var(--amber)" : "var(--line)",
    };
  };
  const cartao = (n) => {
    const e = ETAPAS_FLUXO[n - 1];
    const { feita, ehAtual, bg, borda } = estilo(n);
    return (
      <div key={n} style={{ background: bg, border: `${ehAtual ? 2 : 1}px solid ${borda}`, borderRadius: 4, padding: "8px 10px", minHeight: 62, boxSizing: "border-box" }}>
        <div className="mono" style={{ fontSize: 10.5, color: ehAtual ? "var(--amber)" : feita ? "var(--green)" : "var(--ink-faint)" }}>
          {n} · {feita ? "✓ concluído" : ehAtual ? "você está aqui" : "a fazer"}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, color: ehAtual ? "var(--amber)" : feita ? "var(--ink)" : "var(--ink-soft)" }}>{e.label}</div>
      </div>
    );
  };
  const seta = (txt, key) => (
    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontSize: 18 }}>{txt}</div>
  );
  const linhaCima = [1, 2, 3, 4, 5];
  const linhaBaixo = [10, 9, 8, 7, 6]; // volta da direita para a esquerda

  return (
    <>
    <div className="panel">
      <div className="panel-head"><h3>Seu caminho na sequência</h3></div>
      <div className="panel-body" style={{ overflowX: "auto" }}>
        <p className="helper-note" style={{ marginTop: 0 }}>Verde = concluído · âmbar = é aqui que você está agora · cinza = ainda não chegou lá.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(110px, 1fr))", columnGap: 0, rowGap: 0, minWidth: 640 }}>
          {/* cada célula = cartão + seta à direita (exceto a última coluna) */}
          {linhaCima.map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "stretch", gap: 4 }}>
              <div style={{ flex: 1 }}>{cartao(n)}</div>
              {i < 4 ? seta("→", "a" + n) : <div style={{ width: 0 }} />}
            </div>
          ))}
          {[0, 1, 2, 3].map((i) => <div key={"v" + i} style={{ height: 30 }} />)}
          <div style={{ height: 30, display: "flex", justifyContent: "center", alignItems: "center", color: "var(--ink-faint)", fontSize: 18, paddingRight: 0 }}>↓</div>
          {linhaBaixo.map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "stretch", gap: 4 }}>
              <div style={{ flex: 1 }}>{cartao(n)}</div>
              {i < 4 ? seta("←", "b" + n) : <div style={{ width: 0 }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="panel">
      <div className="panel-head"><h3>O que fazer em cada etapa</h3></div>
      <div className="panel-body">
        <p className="helper-note" style={{ marginTop: 0 }}>Detalhe de cada passo da sequência acima.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ETAPAS_FLUXO.map((e) => {
            const feita = concluido[e.n];
            const ehAtual = e.n === atual;
            const cor = feita ? "var(--green)" : ehAtual ? "var(--amber)" : "var(--ink-faint)";
            const bg = feita ? "var(--green-pale)" : ehAtual ? "var(--amber-pale)" : "var(--paper-deep)";
            return (
              <div key={e.n} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "10px 14px",
                background: bg, border: `1px solid ${feita ? "var(--green)" : ehAtual ? "var(--amber)" : "var(--line)"}`,
                borderRadius: 4,
              }}>
                <div className="mono" style={{
                  width: 28, height: 28, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 13, color: feita || ehAtual ? "#fff" : cor,
                  background: feita || ehAtual ? cor : "var(--paper)", border: feita || ehAtual ? "none" : "1px solid var(--line-strong)",
                }}>
                  {feita ? "✓" : e.n}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: feita || ehAtual ? 700 : 600, color: ehAtual ? "var(--amber)" : "var(--ink)" }}>
                    {e.n} · {e.label}{ehAtual ? " — você está aqui" : ""}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{e.desc}</div>
                </div>
                {fracao[e.n] && <div className="mono" style={{ fontSize: 12, color: "var(--ink-faint)", flexShrink: 0 }}>{fracao[e.n]}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}

// Painel do próprio aluno: valor oficial das notas liberadas pela turma
// (igual para todos — vem do documento) comparado só com o que ESTE aluno
// já teve aprovado. Diferente do painel do professor, não multiplica por
// número de alunos: aqui é sempre "1 aluno".
function MeusValoresPorTipo({ documentos, lancamentos }) {
  if (!documentos || documentos.length === 0) return null;

  const base = { entrada: 0, saida: 0 };
  const liberado = { ...base };
  documentos.forEach((d) => {
    const dir = d.direcao === "entrada" ? "entrada" : "saida";
    liberado[dir] += Number(d.valorTotal) || 0;
  });

  const aprovado = { ...base };
  documentos.forEach((d) => {
    const dir = d.direcao === "entrada" ? "entrada" : "saida";
    const temAprovado = lancamentos.some((l) => l.documento === d.id && l.status === "aprovado");
    if (temAprovado) aprovado[dir] += Number(d.valorTotal) || 0;
  });

  const totalLiberado = liberado.entrada + liberado.saida;
  const totalAprovado = aprovado.entrada + aprovado.saida;

  return (
    <div className="panel">
      <div className="panel-head"><h3>Meus valores por tipo (R$)</h3></div>
      <div className="panel-body" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th className="num">Liberado para você</th>
              <th className="num">Você já aprovou</th>
              <th className="num">Ainda pendente</th>
            </tr>
          </thead>
          <tbody>
            {["entrada", "saida"].map((dir) => {
              const pendente = liberado[dir] - aprovado[dir];
              return (
                <tr key={dir}>
                  <td>{dir === "entrada" ? "Entrada" : "Saída"}</td>
                  <td className="num mono">R$ {fmt(liberado[dir])}</td>
                  <td className="num mono" style={{ color: "var(--green)" }}>R$ {fmt(aprovado[dir])}</td>
                  <td className="num mono" style={{ color: pendente > 0.005 ? "var(--amber)" : "var(--green)", fontWeight: 600 }}>R$ {fmt(pendente)}</td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 700 }}>
              <td>Total</td>
              <td className="num mono">R$ {fmt(totalLiberado)}</td>
              <td className="num mono" style={{ color: "var(--green)" }}>R$ {fmt(totalAprovado)}</td>
              <td className="num mono" style={{ color: (totalLiberado - totalAprovado) > 0.005 ? "var(--amber)" : "var(--green)" }}>R$ {fmt(totalLiberado - totalAprovado)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="helper-note" style={{ margin: "0 16px 16px" }}>
        "Liberado para você" é o valor oficial de todas as notas de entrada/saída que o professor já liberou para a turma (as mesmas que aparecem em "Documentos fiscais"). "Você já aprovou" soma só os seus lançamentos com status aprovado. "Ainda pendente" é a diferença — quanto em R$ falta você lançar e o professor aprovar. Aqui aparecem só os seus números, nenhum valor de colega ou da turma.
      </div>
    </div>
  );
}

function TelaDashboardAluno({ identificacao, esc, documentos, progresso, registro, turma }) {
  const { lancamentos, dre, bp } = esc;
  const aprovados = lancamentos.filter((l) => l.status === "aprovado").length;
  const pendentes = lancamentos.filter((l) => l.status === "enviado").length;
  const correcao = lancamentos.filter((l) => l.status === "correcao").length;
  const rascunhos = lancamentos.filter((l) => l.status === "rascunho").length;

  return (
    <>
      <div className="screen-eyebrow">01 · visão geral</div>
      <h2 className="screen-title">Meu progresso — Etapa 1 · Escrituração</h2>
      <p className="screen-sub">{identificacao}. Dados ao vivo do Firestore.</p>
      {rascunhos > 0 && (
        <div className="aviso-pedagogico" style={{ marginBottom: 14 }}>
          ⚠ <b>Você tem {rascunhos} {rascunhos === 1 ? "lançamento salvo como rascunho que ainda não foi enviado" : "lançamentos salvos como rascunho que ainda não foram enviados"}.</b> O professor só vê e corrige o que você <b>envia</b>. Abra o <b>Livro diário</b> e clique em <b>Enviar</b> em cada um.
        </div>
      )}
      <div className="kpi-row">
        <div className="kpi ok"><div className="kpi-label">Lançamentos aprovados</div><div className="kpi-value mono">{aprovados}</div></div>
        <div className="kpi warn"><div className="kpi-label">Aguardando correção</div><div className="kpi-value mono">{pendentes}</div></div>
        <div className="kpi bad"><div className="kpi-label">Com correção necessária</div><div className="kpi-value mono">{correcao}</div></div>
        <div className="kpi"><div className="kpi-label">Balanço fecha?</div><div className="kpi-value mono">{lancamentos.length === 0 ? "—" : (bp.fecha ? "sim" : "não")}</div></div>
      </div>
      {documentos && <MeusValoresPorTipo documentos={documentos} lancamentos={lancamentos} />}
      <FluxoEtapas documentos={documentos} progresso={progresso} lancamentos={lancamentos} />
      <div className="panel">
        <div className="panel-head"><h3>Resultado do exercício (parcial)</h3></div>
        <div className="panel-body">R$ {fmt(dre.resultadoExercicio)}</div>
      </div>
      {documentos && <ChecklistProgresso documentos={documentos} progresso={progresso} lancamentos={lancamentos} />}
    </>
  );
}

// Tela própria para "Minha nota", com item de menu direto — antes esse
// painel só existia dentro de "Meu progresso", escondido lá embaixo (pedido
// do professor em 2026-10-08: acesso rápido pelo menu).
function TelaMinhaNota({ registro, turma, documentos, progresso, lancamentos, contas }) {
  const qualidadeAuto = documentos
    ? qualidadeTecnicaAutomatica({
        documentos, lancamentos,
        analises: progresso.analises, classificacoes: progresso.classificacoes,
        contas: contas || [],
      })
    : null;
  return (
    <>
      <div className="screen-eyebrow">avaliação</div>
      <h2 className="screen-title">Minha nota — Etapa 1 · Escrituração</h2>
      <p className="screen-sub">Sua avaliação da etapa 1, liberada pelo professor quando estiver pronta.</p>
      <CriteriosAvaliacao turma={turma} qualidade={qualidadeAuto} mostrarSugestao={false} />
      <MinhaNota registro={registro} turma={turma} documentos={documentos} progresso={progresso} lancamentos={lancamentos} />
      {(!registro || !registro.notaLiberada) && (
        <div className="helper-note">Sua nota ainda não foi liberada pelo professor. Assim que ele liberar, ela aparece aqui automaticamente.</div>
      )}
    </>
  );
}

export default function Shell({ usuario, perfil, onSair }) {
  const ehProfessorOuAdmin = perfil.papel === "professor" || perfil.papel === "admin";

  // Grupos recolhíveis do menu do professor: lembra o que ficou aberto
  // (só no navegador; não grava nada no Firestore).
  const [gruposAbertos, setGruposAbertos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("menuProf_abertos") || "{}") || {}; } catch { return {}; }
  });
  function alternarGrupo(id) {
    setGruposAbertos((a) => {
      const novo = { ...a, [id]: !a[id] };
      try { localStorage.setItem("menuProf_abertos", JSON.stringify(novo)); } catch { /* sem armazenamento */ }
      return novo;
    });
  }
  const [screen, setScreenRaw] = useState("inicio");
  // Botão "Voltar": guarda as últimas telas visitadas (só no navegador, em memória; não grava nada).
  // Toda navegação passa por setScreen(), então qualquer botão ou item de menu entra na pilha.
  const [pilhaTelas, setPilhaTelas] = useState([]);
  // "foco": a Sala de aula manda o professor a uma tela já posicionada (fila só de um aluno, um chamado). Qualquer outra navegação limpa o foco.
  const [foco, setFoco] = useState(null);
  const [testeAtivo, setTesteAtivo] = useState(null); // { turmaId, matricula, nome } | null
  const emTeste = ehProfessorOuAdmin && !!testeAtivo;
  const verComo = emTeste && !!testeAtivo.somenteLeitura; // "Ver como o aluno": aluno real, só leitura
  // "Mesa do professor" (2026-10-16): formato novo, em paralelo com o menu lateral. Quando ligada, abrir uma tela abre uma janela.
  // Mesa do aluno (2026-10-16): mesmo formato, opcional, só em tela larga. A escolha de cada papel é guardada separadamente neste navegador.
  // No modo de teste o professor vê as telas do aluno, então usa a Mesa do aluno (sem precisar do link ?mesa=1).
  const mesaDeAluno = emTeste || perfil.papel === "aluno";
  const homeMesa = mesaDeAluno ? "inicio" : "painel-turma";
  const telaLarga = useTelaLarga();
  const temaUi = useTema(); // claro/escuro (professor e aluno)
  const mesa = useMesa({ home: homeMesa, avisarRepetida: mesaDeAluno, chaveAuto: mesaDeAluno ? "mesa_auto_aluno" : "mesa_auto_prof" });
  const mesaAlunoOk = emTeste || (perfil.papel === "aluno" && mesaAlunoLiberada());
  // Saída de emergência: abrir o endereço com ?mesa=0 desliga a Mesa guardada neste navegador (professor e aluno).
  const lerMesa = (k) => { try { if (/[?&]mesa=0(&|$)/.test(window.location.search)) { localStorage.setItem(k, "0"); return false; } return localStorage.getItem(k) === "1"; } catch { return false; } };
  const [modoMesaProf, setModoMesaProf] = useState(() => lerMesa("modoMesa"));
  const [modoMesaAluno, setModoMesaAluno] = useState(() => lerMesa("modoMesaAluno"));
  const modoMesa = mesaDeAluno ? modoMesaAluno : modoMesaProf;
  function setModoMesa(v) {
    (mesaDeAluno ? setModoMesaAluno : setModoMesaProf)(v);
    try { localStorage.setItem(mesaDeAluno ? "modoMesaAluno" : "modoMesa", v ? "1" : "0"); } catch { /* sem armazenamento */ }
    if (v) mesa.abrir(homeMesa);
  }
  // Professor/admin: Mesa sempre disponível. Aluno: só se liberada (ou no modo de teste) e em computador (tela larga).
  const mesaPossivel = mesaDeAluno ? (mesaAlunoOk && telaLarga) : telaLarga; // professor: Mesa só em tela larga (no celular vale o menu lateral, mesmo com a escolha guardada)
  const mesaLigada = () => modoMesa && mesaPossivel;
  // Ao entrar ou sair do modo de teste as janelas trocam de papel: fecha todas e abre a inicial do papel atual.
  useEffect(() => { mesa.limpar(); if (modoMesa && mesaPossivel) mesa.abrir(homeMesa); }, [emTeste]); // eslint-disable-line react-hooks/exhaustive-deps
  // Se a tela passar de estreita para larga com a Mesa escolhida e nenhuma janela aberta, abre a inicial.
  useEffect(() => { if (modoMesa && mesaPossivel && mesa.janelas.length === 0) mesa.abrir(homeMesa); }, [mesaPossivel]); // eslint-disable-line react-hooks/exhaustive-deps
  function setScreen(nova) {
    if (mesaLigada()) { mesa.abrir(nova); return; }
    setFoco(null);
    if (nova === screen) return;
    setPilhaTelas((p) => [...p, screen].slice(-30));
    setScreenRaw(nova);
  }
  function irComFoco(tela, f) {
    if (mesaLigada()) { mesa.abrir(tela, { tela, ...f }); return; }
    setScreen(tela); setFoco({ tela, ...f });
  }
  function voltarUmaTela() {
    const anterior = pilhaTelas[pilhaTelas.length - 1];
    if (!anterior) { setScreenRaw("inicio"); return; }
    setPilhaTelas(pilhaTelas.slice(0, -1));
    setScreenRaw(anterior);
  }
  const [menuAberto, setMenuAberto] = useState(false);

  // Classificação → Livro diário: ao clicar em "usar no lançamento" na tela
  // de Classificação Contábil, guardamos aqui a classificação escolhida e
  // trocamos direto para a tela do Diário, que consome e limpa este estado.
  const [rascunhoDeClassificacao, setRascunhoDeClassificacao] = useState(null);
  function usarClassificacaoNoLancamento(classificacao) {
    if (mesaDeAluno && modoMesa && mesaPossivel) {
      // Mesa do aluno: o Diário abre em outra janela, já preenchido, e a Classificação continua aberta ao lado.
      // Se o Diário já estiver aberto, avisa antes: preencher o formulário substitui o que estiver digitado nele.
      const jaAberto = mesa.janelas.some((j) => j.chave === "diario");
      if (jaAberto && !window.confirm("O Livro diário já está aberto. Usar esta classificação vai preencher o formulário dele e substituir o que estiver digitado nele (o que já foi salvo não muda). Continuar?")) return;
      setRascunhoDeClassificacao(classificacao);
      mesa.abrir("diario", null, { avisar: false });
      return;
    }
    setRascunhoDeClassificacao(classificacao);
    setScreen("diario");
  }

  // --- Modo de teste (só existe para professor/admin) --- (o estado fica logo acima da Mesa, que depende dele)

  function sairDoModoTeste() {
    setTesteAtivo(null);
    setPilhaTelas([]);
    setScreenRaw("inicio");
  }
  function entrarNoModoTeste(alvo) {
    setTesteAtivo(alvo);
    setPilhaTelas([]);
    setScreenRaw(alvo && alvo.somenteLeitura ? "dashboard" : "inicio");
  }

  // papelEfetivo/turmaId/matricula: o que as telas de aluno realmente usam,
  // já considerando o modo de teste.
  const papelEfetivo = emTeste ? "aluno" : perfil.papel;
  const turmaId = emTeste ? testeAtivo.turmaId : (perfil.papel === "aluno" ? perfil.turmaId : null);
  const matricula = emTeste ? testeAtivo.matricula : (perfil.papel === "aluno" ? perfil.matricula : null);

  const esc = useEscrituracao(turmaId, matricula);
  const documentos = useDocumentosDaTurma(turmaId);
  const progresso = useProgressoAluno(turmaId, matricula);
  // Fluxo por etapas (2027.1): só vale quando o professor liga na turma. Desligado (padrão) = null e nada muda.
  const fluxo = useFluxoAluno(papelEfetivo === "aluno" ? turmaId : null, matricula);
  const estFluxo = papelEfetivo === "aluno" ? estadoFluxo(fluxo.cfg, fluxo.docs) : null;
  const docsLote = estFluxo && estFluxo.lote && documentos ? documentos.filter((d) => estFluxo.lote.documentos.includes(d.id)) : [];
  const meuRegistro = useMeuRegistroDeAluno(turmaId, matricula);
  const minhaTurma = useTurma(turmaId);
  // Fase 3 (AGB): liberação/período anterior da turma e o trabalho do aluno (um listener só para as 4 telas)
  const agbAluno = useAgbTurma(papelEfetivo === "aluno" ? turmaId : null);
  const caAluno = useCaTurma(papelEfetivo === "aluno" ? turmaId : null);
  const rescAluno = useRescisaoTurma(papelEfetivo === "aluno" ? turmaId : null);
  const trabCa = useTrabalhoCa(papelEfetivo === "aluno" ? turmaId : null, papelEfetivo === "aluno" ? matricula : null);
  const roteiroCfg = useRoteiroTurma(papelEfetivo === "aluno" ? turmaId : null);
  const rotAluno = useRoteiroAluno(papelEfetivo === "aluno" ? turmaId : null, papelEfetivo === "aluno" ? matricula : null);
  const avalAluno = useAvaliacoesAluno(papelEfetivo === "aluno" ? turmaId : null, papelEfetivo === "aluno" ? matricula : null);
  const trabAgb = useTrabalhoAgb(papelEfetivo === "aluno" ? turmaId : null, papelEfetivo === "aluno" ? matricula : null);

  // Indicativo no menu: lançamentos com "correção necessária" ainda não
  // reenviados pelo aluno — enquanto o ciclo aluno/professor não fecha
  // (status chega a "aprovado"), o item "Livro diário" mostra a contagem.
  const correcoesPendentesAluno = (esc.lancamentos || []).filter((l) => l.status === "correcao").length;

  // Suporte: contadores de mensagens novas (aluno: respostas; professor: chamados novos)
  const { chamados: chamadosDoAluno } = useChamados(papelEfetivo === "aluno" ? turmaId : null, papelEfetivo === "aluno" ? matricula : null);
  const suporteNaoLidoAluno = (chamadosDoAluno || []).filter((c) => c.naoLidoAluno).length;

  // --- Professor/admin: turma e aluno selecionados ---
  const turmasDoProfessor = useTurmasDoProfessor(ehProfessorOuAdmin ? usuario.uid : null);
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState(null);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const turmaSelecionada = turmasDoProfessor?.find((t) => t.id === turmaSelecionadaId) || turmasDoProfessor?.[0] || null;
  useFechamentoSync(ehProfessorOuAdmin && !emTeste ? turmaSelecionada?.id : null);

  // Indicativo no menu do professor: lançamentos aguardando a análise dele
  // (envio inicial ou reenvio depois de uma correção) na turma selecionada.
  const alunosParaFila = useAlunosDaTurma(ehProfessorOuAdmin && !emTeste ? turmaSelecionada?.id : null);
  const { todos: lancamentosParaFila } = useLancamentosDaTurma(ehProfessorOuAdmin && !emTeste ? turmaSelecionada?.id : null, alunosParaFila);
  const { chamados: chamadosDaTurma } = useChamados(ehProfessorOuAdmin && !emTeste ? turmaSelecionada?.id : null, null);
  const suporteNaoLidoProfessor = (chamadosDaTurma || []).filter((c) => c.naoLidoProfessor).length;
  const correcoesPendentesProfessor = lancamentosParaFila.filter(({ lancamento }) => lancamento.status === "enviado").length;

  // --- Roteiro de testes (modo de teste): progresso só no navegador; nada vai para o Firestore ---
  const [passoAtivoId, setPassoAtivoId] = useState(null);
  const turmaDoTeste = turmaSelecionada ? turmaSelecionada.id : (testeAtivo ? testeAtivo.turmaId : null);
  const progTestes = useProgressoTestes(usuario.uid, turmaDoTeste);
  const passoAtivo = passoAtivoId ? passoDoTeste(passoAtivoId) : null;
  const contaDeTeste = (alunosParaFila || []).find((a) => a.contaTeste) || null;
  function irParaPasso(p) {
    setPassoAtivoId(p.id);
    if (!p.tela) return;
    let trocouModo = false;
    if (p.quem === "aluno") {
      if (!emTeste) {
        if (!contaDeTeste || !turmaSelecionada) { setScreen("modoteste"); return; }
        setTesteAtivo({ turmaId: turmaSelecionada.id, matricula: contaDeTeste.matricula, nome: contaDeTeste.nome });
        trocouModo = true;
      }
    } else if (emTeste) {
      setTesteAtivo(null);
      trocouModo = true;
    }
    if (trocouModo) { setPilhaTelas([]); setScreenRaw(p.tela); } else setScreen(p.tela);
    setMenuAberto(false);
  }
  function voltarAoRoteiroDeTestes(concluir) {
    if (concluir && passoAtivoId) progTestes.marcar(passoAtivoId, true);
    setPassoAtivoId(null);
    setScreen("roteiro-testes");
  }

  function selecionarAlunoEVerHistorico(aluno) {
    setAlunoSelecionado(aluno);
    setScreen("historico");
  }

  const [gerandoBackup, setGerandoBackup] = useState(false);
  async function gerarBackup() {
    setGerandoBackup(true);
    try {
      if (papelEfetivo === "aluno" && !emTeste) await backupDoAluno(perfil);
      else if (ehProfessorOuAdmin && turmaSelecionada) await backupDaTurma(turmaSelecionada);
    } finally {
      setGerandoBackup(false);
    }
  }

  // Menu do aluno (e do modo de teste, que usa as mesmas telas): agrupado e
  // numerado na ordem real do exercício. Menu do professor: agrupado por
  // função, sem numeração (2026-10-08).
  // Menu PODC (Planejamento, Organização, Direção e Controle) — aprovado em 2026-10-12.
  // Só muda o agrupamento do menu: as chaves das telas e as regras de liberação são as mesmas de antes.
  const testeLivre = emTeste && !verComo; // conta de teste vê tudo; "ver como aluno" vê só o que o aluno vê
  const mostrarAgb = testeLivre || agbAluno.liberado;
  const mostrarExAgb = exerciciosVisiveis(agbAluno, testeLivre).length > 0;
  const mostrarCa = testeLivre || caAluno.liberado;
  const mostrarResc = testeLivre || !!(caAluno.config && caAluno.config.rescisaoLiberada);
  const mostrarPi = testeLivre || !!roteiroCfg;
  const mostrarAtivFolha = testeLivre || !!(caAluno.config && caAluno.config.empregados && caAluno.config.empregados.length > 0);
  const etapasAluno = papelEfetivo === "aluno"
    ? montarEtapasAluno({
        roteiroCfg, rot: rotAluno,
        disp: { fp: mostrarCa && mostrarAtivFolha, ca: mostrarCa, resc: mostrarResc, agb: mostrarAgb, comp: mostrarAgb && mostrarExAgb },
      })
    : null;
  let menuGrupos;
  if (papelEfetivo === "aluno") {
    menuGrupos = gruposMenuAlunoPodc({
      etapas: etapasAluno,
      incluirManuais: !emTeste,
      incluirRoteiroTestes: testeLivre,
      mostrarPi,
      badgeDiario: correcoesPendentesAluno,
      badgeSuporte: suporteNaoLidoAluno,
    });
  } else {
    menuGrupos = gruposMenuProfessorPodc({
      papel: perfil.papel,
      badgeFila: correcoesPendentesProfessor,
      badgeSuporte: suporteNaoLidoProfessor,
    });
  }
  // Fluxo ligado: Etapa 1 mostra os 3 passos em ordem, com cadeado no que ainda não abriu.
  if (papelEfetivo === "aluno" && estFluxo) {
    const trava = (p) => !estFluxo.lote || estFluxo.passos[p].status === "bloqueada";
    menuGrupos = menuGrupos.map((g) => (!g.etapas ? g : {
      ...g,
      etapas: g.etapas.map((e) => (e.id !== "f1" ? e : {
        ...e,
        itens: e.itens.flatMap((it) => {
          if (it.key === "digitacao") return [{ ...it, label: (trava("digitacao") ? "🔒 " : "") + "1 · Digitação da NF-e" }, { key: "analise-fiscal", label: (trava("analise") ? "🔒 " : "") + "2 · Análise fiscal" }];
          if (it.key === "classificacao") return [{ ...it, label: (trava("classificacao") ? "🔒 " : "") + "3 · Classificação contábil" }];
          return [it];
        }),
      })),
    }));
  }
  // nome de cada tela, tirado do próprio menu, para o botão "Voltar" dizer para onde vai
  const nomeDaTela = {};
  menuGrupos.forEach((g) => { (g.itens || []).forEach((it) => { nomeDaTela[it.key] = it.label; (it.apelidos || []).forEach((k) => { nomeDaTela[k] = it.label; }); }); (g.etapas || []).forEach((e) => e.itens.forEach((it) => { nomeDaTela[it.key] = it.label; })); });
  const telaAnterior = pilhaTelas[pilhaTelas.length - 1] || null;
  const rotuloAnterior = telaAnterior ? (nomeDaTela[telaAnterior] || "tela anterior").replace(/^[^\p{L}\p{N}]+/u, "") : (ehProfessorOuAdmin && !emTeste ? "Sala de aula" : "Comece aqui");
  const etapaDaTelaAtual = papelEfetivo === "aluno" ? etapaDaTela(screen) : null;
  const infoEtapaTela = etapaDaTelaAtual ? etapasAluno.find((e) => e.id === etapaDaTelaAtual) : null;
  const prazoTela = etapaDaTelaAtual ? situacaoPrazo(etapaDaTelaAtual, roteiroCfg) : { fechada: false };

  // Etapas abertas/fechadas no menu do aluno (só no navegador; não grava nada no Firestore).
  const [subsAbertas, setSubsAbertas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("menuAluno_etapas") || "{}") || {}; } catch { return {}; }
  });
  function alternarEtapa(id, abertoAgora) {
    setSubsAbertas((a) => {
      const novo = { ...a, [id]: !abertoAgora };
      try { localStorage.setItem("menuAluno_etapas", JSON.stringify(novo)); } catch { /* sem armazenamento */ }
      return novo;
    });
  }

  const TELAS_COM_ESCRITURACAO = ["dashboard", "minha-nota", "diario", "razao", "balancete", "are", "dre", "bp", "agb-av", "agb-ind", "agb-giro", "agb-parecer", "agb-comp", "ca-cont", "ca-efeitos"];
  const TELAS_COM_DOCUMENTOS = ["documentos", "digitacao", "analise-fiscal", "classificacao"];

  // Monta a tela de uma chave. Recebe a chave e o foco para servir tanto ao menu lateral (uma tela) quanto à Mesa (várias janelas).
  function montarTela(screen, foco) {
  // Para a Mesa (várias janelas): a etapa e a trava de cada janela vêm da chave da janela, não da tela aberta no menu lateral.
  const etapaDaTelaAtual = papelEfetivo === "aluno" ? etapaDaTela(screen) : null;
  const infoEtapaTela = etapaDaTelaAtual ? etapasAluno.find((e) => e.id === etapaDaTelaAtual) : null;
  // Itens do menu do professor que reúnem telas em abas (2026-10-13). Chave antiga → item novo + aba certa.
  const alvoAbas = ehProfessorOuAdmin && !emTeste ? (ABRIR_EM[screen] || (TELAS_COM_ABAS.includes(screen) ? [screen, null] : null)) : null;
  // Guia de lançamentos e Tabelas do projeto inteiro (2026-10-17): uma aba por etapa / por assunto. Só leitura.
  function guiaAbas(prof) {
    return [
      { key: "etapa1", label: "Etapa 1 · Compras e vendas", render: () => <GuiaLancamentos professor={prof} /> },
      { key: "etapa2", label: "Etapa 2 · Contracheque", render: () => <GuiaEtapa2 /> },
      { key: "etapa3", label: "Etapa 3 · Folha e provisões", render: () => <GuiaEtapa3 contas={esc.contas} /> },
      { key: "etapa4", label: "Etapa 4 · Rescisão", render: () => <GuiaEtapa4 contas={esc.contas} /> },
      { key: "etapa56", label: "Etapas 5 e 6 · Análise", render: () => <GuiaEtapas56 /> },
    ];
  }
  function tabelasAbas(papel) {
    return [
      { key: "inss", label: "INSS e IRRF 2026", render: () => <TabelasInssIrrf /> },
      { key: "folha", label: "Folha e encargos", render: () => <TabelaFolhaEncargos /> },
      { key: "resc", label: "Rescisão", render: () => <TabelaRescisao /> },
      { key: "formulas", label: "Fórmulas da folha", render: () => <FormulasFolha /> },
      { key: "plano", label: "Plano de contas", render: () => <PlanoContas contas={esc.contas} papel={papel} /> },
      { key: "cfop", label: "Consulta CFOP/NCM", render: () => <ConsultaFiscal /> },
    ];
  }
  function telaComAbas(item, aba) {
    const cab = (eyebrow, titulo) => (<><div className="screen-eyebrow">{eyebrow}</div><h2 className="screen-title">{titulo}</h2></>);
    if (item === "planejar") {
      return (
        <TelaComAbas key={screen} inicial={aba || "prazos"} abas={[
          { key: "prazos", label: "Etapas e prazos", render: () => <>{cab("planejamento", "Etapas e prazos")}<RoteiroProfessor turma={turmaSelecionada} somente="cfg" /></> },
          { key: "cronograma", label: "Cronograma", render: () => <CronogramaProfessor turma={turmaSelecionada} /> },
          { key: "lotes", label: "Lotes (2027.1)", render: () => <LotesFluxo turma={turmaSelecionada} /> },
          { key: "liberar", label: "Liberar etapas e situação dos alunos", render: () => <>{cab("liberação", "Liberar etapas e situação dos alunos")}<RoteiroProfessor turma={turmaSelecionada} somente="sit" /></> },
        ]} />
      );
    }
    if (item === "etapa1") {
      return (
        <TelaComAbas key={screen} inicial={aba || "painel"} abas={[
          { key: "painel", label: "Painel do professor", render: () => <Painel turma={turmaSelecionada} onAbrirHistorico={selecionarAlunoEVerHistorico} /> },
          { key: "docs", label: "Documentos fiscais", render: () => <DocumentosFiscaisProfessor turma={turmaSelecionada} /> },
          { key: "demonstr", label: "Diário ao Balanço (5 a 10)", render: () => <DemonstracoesAlunos turma={turmaSelecionada} /> },
        ]} />
      );
    }
    if (item === "alunos") {
      return (
        <TelaComAbas key={screen} inicial={aba || "historico"} abas={[
          { key: "historico", label: "Histórico do aluno", render: () => <HistoricoAluno turmaId={turmaSelecionada?.id} alunoSelecionado={alunoSelecionado} onVoltarParaTurmas={() => setScreen("turmas")} /> },
          { key: "registro", label: "Registro do processo", render: () => <RegistroProcesso turma={turmaSelecionada} /> },
          { key: "orientacao", label: "Relatório de orientação", render: () => <RelatorioOrientacao turma={turmaSelecionada} /> },
        ]} />
      );
    }
    if (item === "notas-aval") {
      return (
        <TelaComAbas key={screen} inicial={aba || "etapa1"} abas={[
          { key: "etapa1", label: "Notas · Etapa 1", render: () => <Notas turma={turmaSelecionada} /> },
          { key: "etapas", label: "Avaliação das etapas (0 a 10)", render: () => <AvaliacaoProfessor turma={turmaSelecionada} /> },
          { key: "folha", label: "Conferência da folha (etapa 2)", render: () => <ConferenciaFolha turma={turmaSelecionada} /> },
          { key: "dashboard", label: "Dashboard do ciclo", render: () => <DashboardCiclo turma={turmaSelecionada} onSelecionarAluno={selecionarAlunoEVerHistorico} /> },
        ]} />
      );
    }
    if (item === "guia-projeto") {
      return (
        <TelaComAbas key={screen} inicial={aba || "etapa1"} abas={guiaAbas(true)} />
      );
    }
    if (item === "tabelas-projeto") {
      return (
        <TelaComAbas key={screen} inicial={aba || "inss"} abas={tabelasAbas(perfil.papel)} />
      );
    }
    if (item === "consultas") {
      return (
        <TelaComAbas key={screen} inicial={aba || "plano"} abas={[
          { key: "plano", label: "Plano de contas", render: () => <PlanoContas contas={esc.contas} papel={perfil.papel} /> },
          { key: "guia", label: "Guia de lançamentos", render: () => <GuiaLancamentos professor /> },
          { key: "tabelas", label: "Tabelas INSS e IRRF 2026", render: () => <TabelasInssIrrf /> },
          { key: "cfop", label: "Consulta CFOP/NCM", render: () => <ConsultaFiscal /> },
        ]} />
      );
    }
    // ajuda
    return (
      <TelaComAbas key={screen} inicial={aba || "guia"} abas={[
        { key: "guia", label: "Guia do professor", render: () => <GuiaProfessor turma={turmaSelecionada} onIr={(k) => setScreen(k)} contadores={{ fila: correcoesPendentesProfessor, suporte: suporteNaoLidoProfessor }} /> },
        { key: "manprof", label: "Manual do Professor", render: () => <ManualProfessor /> },
        { key: "manaluno", label: "Manual do Aluno", render: () => <ManualAluno /> },
        { key: "fluxoproc", label: "Fluxograma do processo", render: () => <FluxogramaProcesso /> },
        ...(perfil.papel === "admin" ? [{ key: "manop", label: "Manual de Operacionalização", render: () => <ManualOperacao /> }] : []),
      ]} />
    );
  }

  let tela;
  if (alvoAbas) {
    tela = telaComAbas(alvoAbas[0], alvoAbas[1]);
  } else if (ehProfessorOuAdmin && screen === "roteiro-testes") {
    tela = (
      <RoteiroTestes
        turma={turmaSelecionada}
        feitos={progTestes.feitos}
        passoAtivo={passoAtivo}
        emTeste={emTeste}
        temContaTeste={!!contaDeTeste}
        onIr={irParaPasso}
        onMarcar={progTestes.marcar}
        onLimpar={progTestes.limpar}
      />
    );
  } else if (screen === "inicio" && papelEfetivo === "aluno") {
    tela = <InicioAluno etapas={etapasAluno} mostrarPi={mostrarPi} onIr={setScreen} nome={emTeste ? testeAtivo.nome : (meuRegistro && meuRegistro.nome)} />;
  } else if (screen === "inicio" && ehProfessorOuAdmin) {
    tela = <SalaDeAula turma={turmaSelecionada} onIr={(t, f) => (f ? irComFoco(t, f) : setScreen(t))} onAbrirHistorico={selecionarAlunoEVerHistorico} foco={foco && foco.tela === "inicio" ? foco : null} />;
  } else if (ehProfessorOuAdmin && screen === "painel-turma") {
    tela = <PainelTurma turma={turmaSelecionada} onIr={(t, f) => (f ? irComFoco(t, f) : setScreen(t))} onAbrirHistorico={selecionarAlunoEVerHistorico} />;
  } else if (screen === "hoje" && ehProfessorOuAdmin) {
    tela = <InicioProfessor turma={turmaSelecionada} onIr={setScreen} contadores={{ fila: correcoesPendentesProfessor, suporte: suporteNaoLidoProfessor }} />;
  } else if (infoEtapaTela && !infoEtapaTela.disponivel) {
    tela = <EtapaBloqueada info={infoEtapaTela} etapas={etapasAluno} onIr={setScreen} mostrarPi={mostrarPi} />;
  } else if (screen === "roteiro") {
    tela = <RoteiroAluno />;
  } else if (screen === "manual-aluno") {
    tela = <ManualAluno />;
  } else if (screen === "manual-professor") {
    tela = <ManualProfessor />;
  } else if (screen === "manual-operacao") {
    tela = <ManualOperacao />;
  } else if (ehProfessorOuAdmin && !emTeste && screen === "envios") {
    tela = <EnviosPorLote turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && !emTeste && screen === "ver-aluno") {
    tela = <VerComoAluno turma={turmaSelecionada} onEntrar={entrarNoModoTeste} />;
  } else if (ehProfessorOuAdmin && !emTeste && screen === "modoteste") {
    tela = <ModoTeste turma={turmaSelecionada} onEntrar={entrarNoModoTeste} />;
  } else if (papelEfetivo === "aluno" && TELAS_COM_ESCRITURACAO.includes(screen) && esc.carregando) {
    tela = <div className="empty-state">Carregando escrituração…</div>;
  } else if (papelEfetivo === "aluno" && TELAS_COM_DOCUMENTOS.includes(screen) && documentos === null) {
    tela = <div className="empty-state">Carregando documentos da turma…</div>;
  } else if (papelEfetivo === "aluno" && screen === "dashboard") {
    tela = <TelaDashboardAluno identificacao={verComo ? "Matrícula " + testeAtivo.matricula : emTeste ? "Conta de teste — " + testeAtivo.nome : "Matrícula " + perfil.matricula} esc={esc} documentos={documentos} progresso={progresso} registro={meuRegistro} turma={minhaTurma} />;
  } else if (papelEfetivo === "aluno" && screen === "minha-nota") {
    tela = <TelaMinhaNota registro={meuRegistro} turma={minhaTurma} documentos={documentos} progresso={progresso} lancamentos={esc.lancamentos} contas={esc.contas} />;
  } else if (papelEfetivo === "aluno" && screen === "empresa") {
    tela = <EmpresaDidatica usuario={usuario} perfil={emTeste ? { turmaId, matricula } : perfil} />;
  } else if (papelEfetivo === "aluno" && screen === "documentos") {
    tela = <DocumentosFiscais documentos={documentos} />;
  } else if (papelEfetivo === "aluno" && estFluxo && (screen === "digitacao" || screen === "analise-fiscal" || screen === "classificacao")) {
    tela = <FluxoTelas screen={screen} est={estFluxo} erro={fluxo.erro} docsLote={docsLote} progresso={progresso} turmaId={turmaId} matricula={matricula} contas={esc.contas} onUsarNoLancamento={usarClassificacaoNoLancamento} />;
  } else if (papelEfetivo === "aluno" && (screen === "digitacao" || screen === "analise-fiscal")) {
    tela = <DigitacaoAnaliseFiscal turmaId={turmaId} matricula={matricula} documentos={documentos} />;
  } else if (papelEfetivo === "aluno" && screen === "consulta") {
    tela = <ConsultaFiscal />;
  } else if (papelEfetivo === "aluno" && screen === "suporte") {
    tela = <SuporteAluno somenteLeitura={verComo} turmaId={turmaId} matricula={matricula} nome={emTeste ? testeAtivo.nome : meuRegistro?.nome} documentos={documentos || []} />;
  } else if (papelEfetivo === "aluno" && screen === "guia-proj") {
    tela = <TelaComAbas key={screen} inicial="etapa1" abas={guiaAbas(false)} />;
  } else if (papelEfetivo === "aluno" && screen === "tabelas-proj") {
    tela = <TelaComAbas key={screen} inicial="inss" abas={tabelasAbas(papelEfetivo)} />;
  } else if (papelEfetivo === "aluno" && screen === "guia-lanc") {
    tela = <GuiaLancamentos />;
  } else if (papelEfetivo === "aluno" && screen === "plano") {
    tela = <PlanoContas contas={esc.contas} papel={papelEfetivo} />;
  } else if (papelEfetivo === "aluno" && screen === "classificacao") {
    tela = <ClassificacaoContabil turmaId={turmaId} matricula={matricula} documentos={documentos} progresso={progresso} contas={esc.contas} onUsarNoLancamento={usarClassificacaoNoLancamento} />;
  } else if (papelEfetivo === "aluno" && screen === "diario") {
    tela = (
      <LivroDiario
        turmaId={turmaId}
        matricula={matricula}
        lancamentos={esc.lancamentos}
        contas={esc.contas}
        documentos={documentos}
        rascunhoDeClassificacao={rascunhoDeClassificacao}
        onRascunhoConsumido={() => setRascunhoDeClassificacao(null)}
        onIrClassificacao={() => setScreen("classificacao")}
      />
    );
  } else if (papelEfetivo === "aluno" && screen === "razao") {
    tela = <LivroRazao razao={esc.razao} />;
  } else if (papelEfetivo === "aluno" && screen === "balancete") {
    tela = <Balancete razao={esc.razao} />;
  } else if (papelEfetivo === "aluno" && screen === "are") {
    tela = <ARE dre={esc.dre} />;
  } else if (papelEfetivo === "aluno" && screen === "dre") {
    tela = <DRE dre={esc.dre} />;
  } else if (papelEfetivo === "aluno" && screen === "bp") {
    tela = <BalancoPatrimonial bp={esc.bp} />;
  } else if (papelEfetivo === "aluno" && screen === "etapas") {
    tela = <EtapasAluno config={roteiroCfg} rot={rotAluno} nomeAluno={emTeste ? testeAtivo.nome : (meuRegistro && meuRegistro.nome)} />;
  } else if (papelEfetivo === "aluno" && screen === "cronograma") {
    tela = <CronogramaAluno etapas={etapasAluno} nome={emTeste ? testeAtivo.nome : (meuRegistro && meuRegistro.nome)} matricula={emTeste ? "" : perfil.matricula} turmaNome={minhaTurma && minhaTurma.nome} />;
  } else if (papelEfetivo === "aluno" && screen === "notas-etapas") {
    tela = <NotasEtapas avaliacoes={avalAluno} />;
  } else if (papelEfetivo === "aluno" && screen === "ca-tabelas") {
    tela = <TabelasInssIrrf />;
  } else if (papelEfetivo === "aluno" && screen === "ca-ativ") {
    tela = <FolhaAtividade trab={trabCa} ca={caAluno} matricula={matricula} />;
  } else if (papelEfetivo === "aluno" && !emTeste && ["ca-folha", "ca-prov", "ca-cont", "ca-efeitos", "ca-parecer"].includes(screen)
    && caAluno.config && caAluno.config.fpObrigatoria
    && !(rotAluno.estado && rotAluno.estado.etapas && rotAluno.estado.etapas.fp && rotAluno.estado.etapas.fp.status === "aprovada")) {
    tela = <div className="empty-state">{rotAluno.carregando ? "Carregando…" : <>Esta etapa abre depois que o professor aprovar a atividade <b>“Elaborar a folha de pagamento”</b>. Faça a atividade no menu da etapa 2 e marque como entregue em “Meu roteiro por etapas”.</>}</div>;
  } else if (papelEfetivo === "aluno" && screen === "ca-folha") {
    tela = <FolhaMes trab={trabCa} ca={caAluno} />;
  } else if (papelEfetivo === "aluno" && screen === "ca-prov") {
    tela = <ProvisoesEncargos trab={trabCa} ca={caAluno} />;
  } else if (papelEfetivo === "aluno" && screen === "ca-cont") {
    tela = <ContabilizacaoFolha trab={trabCa} ca={caAluno} esc={esc} onLevar={usarClassificacaoNoLancamento} />;
  } else if (papelEfetivo === "aluno" && screen === "ca-efeitos") {
    tela = <EfeitosFolha trab={trabCa} esc={esc} />;
  } else if (papelEfetivo === "aluno" && screen === "ca-parecer") {
    tela = <ParecerFolha trab={trabCa} />;
  } else if (papelEfetivo === "aluno" && screen === "resc-caso") {
    tela = <RescCaso trab={trabCa} resc={rescAluno} />;
  } else if (papelEfetivo === "aluno" && screen === "resc-calc") {
    tela = <RescCalculo trab={trabCa} resc={rescAluno} />;
  } else if (papelEfetivo === "aluno" && screen === "resc-inc") {
    tela = <RescIncidencias trab={trabCa} />;
  } else if (papelEfetivo === "aluno" && screen === "resc-cont") {
    tela = <RescContabilizacao trab={trabCa} resc={rescAluno} esc={esc} onLevar={usarClassificacaoNoLancamento} />;
  } else if (papelEfetivo === "aluno" && screen === "resc-doc") {
    tela = <RescDocumentos trab={trabCa} resc={rescAluno} />;
  } else if (papelEfetivo === "aluno" && screen === "resc-final") {
    tela = <RescConferencia trab={trabCa} resc={rescAluno} esc={esc} />;
  } else if (ehProfessorOuAdmin && screen === "resc-prof") {
    tela = <RescisaoProfessor turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "ca-prof") {
    tela = <CaProfessor turma={turmaSelecionada} />;
  } else if (papelEfetivo === "aluno" && screen === "agb-av") {
    tela = <AnaliseVH esc={esc} trab={trabAgb} agb={agbAluno} />;
  } else if (papelEfetivo === "aluno" && screen === "agb-ind") {
    tela = <Indicadores esc={esc} trab={trabAgb} agb={agbAluno} />;
  } else if (papelEfetivo === "aluno" && screen === "agb-giro") {
    tela = <CapitalGiro esc={esc} trab={trabAgb} agb={agbAluno} />;
  } else if (papelEfetivo === "aluno" && screen === "agb-ex") {
    tela = <AgbExercicios trab={trabAgb} agb={agbAluno} emTeste={emTeste} />;
  } else if (papelEfetivo === "aluno" && screen === "agb-comp") {
    tela = <AgbComparativo esc={esc} trab={trabAgb} agb={agbAluno} emTeste={emTeste} />;
  } else if (papelEfetivo === "aluno" && screen === "agb-parecer") {
    tela = <ParecerFinal esc={esc} trab={trabAgb} agb={agbAluno} />;
  } else if (ehProfessorOuAdmin && screen === "roteiro-folha") {
    tela = (<><div className="screen-eyebrow">etapa 2</div><h2 className="screen-title">Atividade da folha</h2><RoteiroProfessor key={screen} turma={turmaSelecionada} somente="folha" /></>);
  } else if (ehProfessorOuAdmin && screen === "cronograma") {
    tela = <CronogramaProfessor turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "descricoes") {
    tela = <DescricoesEscola turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "planos") {
    tela = <PlanosSemestrais turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && !emTeste && screen === "laboratorio") {
    tela = <Laboratorio2027 turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "diretriz") {
    tela = <DiretrizSemana />;
  } else if (ehProfessorOuAdmin && screen === "caderno-folha") {
    tela = <CadernoFolha turma={turmaSelecionada} nomePadrao={(perfil && perfil.nome) || usuario.displayName || ""} />;
  } else if (ehProfessorOuAdmin && ["caderno-escrituracao", "caderno-rct", "caderno-agb", "caderno-ap"].includes(screen)) {
    const nomes = { "caderno-escrituracao": "Caderno da Escrituração", "caderno-rct": "Caderno da RCT", "caderno-agb": "Caderno AGB", "caderno-ap": "Caderno AP" };
    tela = (<>
      <div className="screen-eyebrow">materiais · cadernos para imprimir</div>
      <h2 className="screen-title">{nomes[screen]} (imprimir)</h2>
      <div className="empty-state">Este caderno ainda está em elaboração. Ele será feito depois do Caderno da Folha, com capa e cabeçalho escolhido em "Cabeçalho dos cadernos".</div>
    </>);
  } else if (ehProfessorOuAdmin && screen === "cabecalhos") {
    tela = <CabecalhosCadernos nomePadrao={(perfil && perfil.nome) || usuario.displayName || ""} />;
  } else if (ehProfessorOuAdmin && screen === "caderno") {
    tela = <CadernoAluno nomePadrao={(perfil && perfil.nome) || usuario.displayName || ""} turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "aval-prof") {
    tela = <AvaliacaoProfessor turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "agb-prof") {
    tela = <AgbProfessor turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "painel") {
    tela = <Painel turma={turmaSelecionada} onAbrirHistorico={selecionarAlunoEVerHistorico} />;
  } else if (ehProfessorOuAdmin && screen === "notas") {
    tela = <Notas turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "dashboard-ciclo") {
    tela = <DashboardCiclo turma={turmaSelecionada} onSelecionarAluno={selecionarAlunoEVerHistorico} />;
  } else if (ehProfessorOuAdmin && screen === "turmas") {
    tela = (
      <Turmas
        onVerComoAluno={entrarNoModoTeste}
        uid={usuario.uid}
        turmaSelecionadaId={turmaSelecionada?.id}
        setTurmaSelecionadaId={setTurmaSelecionadaId}
        onSelecionarAluno={selecionarAlunoEVerHistorico}
      />
    );
  } else if (ehProfessorOuAdmin && screen === "fila") {
    tela = turmaSelecionada ? <FilaCorrecao turmaId={turmaSelecionada.id} foco={foco && foco.tela === "fila" ? foco : null} onVerTodos={() => (mesaLigada() ? mesa.abrir("fila", null) : setFoco(null))} /> : <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  } else if (ehProfessorOuAdmin && screen === "historico") {
    tela = <HistoricoAluno turmaId={turmaSelecionada?.id} alunoSelecionado={alunoSelecionado} onVoltarParaTurmas={() => setScreen("turmas")} />;
  } else if (ehProfessorOuAdmin && screen === "suporte") {
    tela = <SuporteProfessor turma={turmaSelecionada} chamadoFoco={foco && foco.tela === "suporte" ? foco.chamadoId : null} />;
  } else if (ehProfessorOuAdmin && screen === "guia") {
    tela = <GuiaProfessor turma={turmaSelecionada} onIr={(k) => setScreen(k)} contadores={{ fila: correcoesPendentesProfessor, suporte: suporteNaoLidoProfessor }} />;
  } else if (ehProfessorOuAdmin && screen === "registro") {
    tela = <RegistroProcesso turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "refazer") {
    tela = <RefazerNota turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "fechamento") {
    tela = <Fechamento turma={turmaSelecionada} onIr={setScreen} />;
  } else if (ehProfessorOuAdmin && screen === "relatorio") {
    tela = <RelatorioOrientacao turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "documentos") {
    tela = <DocumentosFiscaisProfessor turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "consulta") {
    tela = <ConsultaFiscal />;
  } else if (ehProfessorOuAdmin && screen === "modelos") {
    tela = <ModelosMensagens turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "plano") {
    tela = <PlanoContas contas={esc.contas} papel={perfil.papel} />;
  }
  return tela;
  }
  const tela = montarTela(screen, foco);

  // Conteúdo de uma janela da Mesa do aluno: a tela + as faixas e a trava da etapa, como no menu lateral.
  function conteudoDaTela(chave, f) {
    const t = montarTela(chave, f);
    if (papelEfetivo !== "aluno") return t;
    const etapaId = etapaDaTela(chave);
    const info = etapaId ? etapasAluno.find((e) => e.id === etapaId) : null;
    const prazo = etapaId ? situacaoPrazo(etapaId, roteiroCfg) : { fechada: false };
    return (
      <>
        {info && info.disponivel && <FaixaEtapa info={info} total={etapasAluno.length} mostrarLink={mostrarPi} onRoteiro={() => setScreen("etapas")} />}
        <FluxoEtapa key={chave} etapa={chave} onSuporte={() => setScreen("suporte")} />
        <FluxoEtapaPI key={"pi" + chave} tela={chave} onSuporte={() => setScreen("suporte")} />
        {!emTeste && etapaId && prazo.fechada && info && info.disponivel
          ? <EtapaFechada key={"ef" + chave} prazo={prazo.prazo} titulo={info.titulo} livreFolha={chave === "diario"} onSuporte={() => setScreen("suporte")}>{t}</EtapaFechada>
          : t}
      </>
    );
  }

  // ---- Mesa (formato novo, em paralelo): professor/admin e, em teste, aluno ----
  if (mesaDeAluno && modoMesa && mesaPossivel) {
    const tituloAluno = (chave) => (nomeDaTela[chave] || chave).replace(/^[^\p{L}\p{N}]+/u, "");
    return (
      <MesaProfessor
        brand="Mesa do Aluno" homeChave="inicio" homeLabel="🧭 Comece aqui" atalho={{ chave: "dashboard", label: "Meu progresso" }}
        menu={menuSuperiorAluno(menuGrupos)}
        mesa={mesa}
        renderTela={(chave, f) => (<div key={chave}>{verComo ? <TravaLeitura>{conteudoDaTela(chave, f)}</TravaLeitura> : conteudoDaTela(chave, f)}</div>)}
        tituloDe={tituloAluno}
        turmaNome={emTeste ? (verComo ? "👁 Vendo como — " : "🧪 Modo de teste — ") + testeAtivo.nome : "Matrícula " + perfil.matricula}
        resumo={(menuGrupos.flatMap((g) => g.itens || []).find((i) => i.key === "suporte") || {}).badge ? "Você tem resposta no suporte" : ""}
        textoAviso={(chave) => "Você já tem a tela “" + tituloAluno(chave) + "” aberta. Trouxe ela para a frente."}
        acoes={{ voltarClassico: () => setModoMesa(false), sair: emTeste ? sairDoModoTeste : onSair, rotuloSair: emTeste ? (verComo ? "Sair da visualização" : "Sair do teste") : "Sair", tema: temaUi, backup: () => { if (!gerandoBackup) gerarBackup(); }, rotuloBackup: "Baixar meu backup" }}
      />
    );
  }
  if (ehProfessorOuAdmin && !emTeste && modoMesa && mesaPossivel) {
    const tituloDe = (chave, f) => {
      const base = (nomeDaTela[chave] || chave).replace(/^[^\p{L}\p{N}]+/u, "");
      return base + (f && f.nome && chave === "fila" ? " · " + String(f.nome).split(" ")[0] : "");
    };
    return (
      <MesaProfessor
        menu={menuSuperiorProfessor({ papel: perfil.papel, badgeFila: correcoesPendentesProfessor, badgeSuporte: suporteNaoLidoProfessor })}
        mesa={mesa}
        renderTela={(chave, f) => (<div key={chave}>{montarTela(chave, f)}</div>)}
        tituloDe={tituloDe}
        turmaNome={turmaSelecionada ? "Turma: " + turmaSelecionada.nome : "Nenhuma turma selecionada"}
        resumo={correcoesPendentesProfessor + " na fila · " + suporteNaoLidoProfessor + " no suporte"}
        acoes={{ voltarClassico: () => setModoMesa(false), sair: onSair, tema: temaUi, backup: () => { if (!gerandoBackup && turmaSelecionada) gerarBackup(); } }}
      />
    );
  }

  return (
    <div className="app">
      <div className={"sidebar-backdrop" + (menuAberto ? " open" : "")} onClick={() => setMenuAberto(false)} />
      <div className={"sidebar" + (menuAberto ? " open" : "")}>
        <div className="sidebar-head">
          <div className="kicker">CI–CA–AGB</div>
          <h1>Projeto Interdisciplinar</h1>
        </div>
        <div className="nav-group">
          <div className="nav-group-label">{emTeste ? "aluno (modo de teste)" : perfil.papel}</div>
        </div>
        {menuGrupos.map((grupo, gi) => {
          const itensDaEtapa = (grupo.etapas || []).flatMap((e) => e.itens);
          const itemAtivo = (it) => it.key === screen || (it.apelidos || []).includes(screen);
          const temAtivo = grupo.itens.some(itemAtivo) || itensDaEtapa.some((it) => it.key === screen);
          const aberto = !grupo.recolhivel || !!gruposAbertos[grupo.id] || temAtivo;
          const pendencias = grupo.itens.reduce((t, it) => t + (it.badge || 0), 0);
          function irPara(key) { setScreen(key); setMenuAberto(false); }
          function renderItem(item, num) {
            return (
              <div
                key={item.key}
                className={"nav-item" + (itemAtivo(item) ? " active" : "") + (item.bloqueado ? " bloq" : "")}
                onClick={() => irPara(item.key)}
              >
                {num != null && <span className="num">{num}</span>}
                <span>{item.label}</span>
                {item.aviso && <span style={{ fontSize: 11, color: "#e9c77d", marginLeft: 6 }}>{item.aviso}</span>}
                {!!item.badge && <span className="nav-badge">{item.badge}</span>}
              </div>
            );
          }
          return (
            <div className="nav-group" key={gi}>
              {grupo.podc && (
                <div className="nav-group-label podc">
                  <span className="podc-letra">{grupo.podc.letra}</span>
                  <span><b>{grupo.podc.titulo}</b><small>{grupo.podc.sub}</small></span>
                </div>
              )}
              {grupo.label && (grupo.recolhivel ? (
                <div
                  className="nav-group-label"
                  style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onClick={() => { if (!temAtivo) alternarGrupo(grupo.id); }}
                >
                  <span>{grupo.label}</span>
                  <span>{!aberto && pendencias > 0 && <span className="nav-badge" style={{ marginRight: 6 }}>{pendencias}</span>}{aberto ? "▾" : "▸"}</span>
                </div>
              ) : <div className="nav-group-label">{grupo.label}</div>)}
              {aberto && grupo.itens.map((item) => renderItem(item, null))}
              {(grupo.etapas || []).map((e) => {
                const contemAtiva = e.itens.some((it) => it.key === screen);
                const salvo = subsAbertas[e.id];
                const aberta = contemAtiva || (salvo !== undefined ? !!salvo : !!e.atual);
                const pend = e.itens.reduce((t, it) => t + (it.badge || 0), 0);
                return (
                  <div key={e.id} className={"nav-etapa" + (e.disponivel ? "" : " bloq") + (e.atual ? " atual" : "")}>
                    <div className="nav-etapa-head" onClick={() => { if (!contemAtiva) alternarEtapa(e.id, aberta); }} title={e.rotulo}>
                      <span className="nav-etapa-n">{e.n}</span>
                      <span className="nav-etapa-t">
                        {e.label}<small>{e.disc}</small>
                        <span className={"nav-chip " + (e.classe || "")}>{e.disponivel ? e.curto : "Bloqueada"}</span>
                      </span>
                      {!aberta && pend > 0 && <span className="nav-badge">{pend}</span>}
                      <span className="nav-etapa-seta">{aberta ? "▾" : "▸"}</span>
                    </div>
                    {aberta && e.itens.map((item, ii) => renderItem({ ...item, bloqueado: !e.disponivel }, e.numerado ? ii + 1 : null))}
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="sidebar-foot">{usuario.email}</div>
      </div>
      <div className="main">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="menu-toggle" aria-label="Abrir menu" onClick={() => setMenuAberto(true)}>☰</button>
            <div className="empresa">
              {emTeste
                ? (verComo ? "👁 Vendo como — " : "🧪 Modo de teste — ") + testeAtivo.nome
                : perfil.papel === "aluno"
                  ? "Matrícula " + perfil.matricula
                  : (turmaSelecionada ? "Turma: " + turmaSelecionada.nome : "Nenhuma turma selecionada")}
            </div>
          </div>
          <div className="role-switch">
            {emTeste && <button className="role-btn" onClick={sairDoModoTeste}>{verComo ? "Sair da visualização" : "Sair do modo de teste"}</button>}
            {ehProfessorOuAdmin && !emTeste && telaLarga && <button className="role-btn" title="Menus no topo e telas em janelas (formato novo, em teste)" onClick={() => setModoMesa(true)}>🪟 Mesa (novo)</button>}
            {mesaDeAluno && mesaAlunoOk && telaLarga && <button className="role-btn" title="Menus no topo e telas em janelas (formato novo, em teste, só no computador)" onClick={() => setModoMesa(true)}>🪟 Mesa (novo)</button>}
            <button className="role-btn" disabled={gerandoBackup || (ehProfessorOuAdmin && !emTeste && !turmaSelecionada)} onClick={gerarBackup}>
              {gerandoBackup ? "Gerando backup…" : "Baixar backup"}
            </button>
            <button className="role-btn" title="Trocar entre modo claro e escuro" onClick={temaUi.alternar}>{temaUi.tema === "escuro" ? "☀️ Modo claro" : "🌙 Modo escuro"}</button>
            <button className="role-btn" onClick={onSair}>Sair</button>
          </div>
        </div>
        <div className="content">
          {(screen !== "inicio" || (ehProfessorOuAdmin && passoAtivo)) && (
            <div className="nav-topo no-print">
              {screen !== "inicio" && (
                <div className="voltar-bar">
                  <button className="btn secondary" onClick={voltarUmaTela}>← Voltar</button>
                  <span className="voltar-para">para {rotuloAnterior}</span>
                  {ehProfessorOuAdmin && !emTeste && <button className="btn secondary" style={{ marginLeft: 10 }} onClick={() => setScreen("inicio")}>🏫 Sala de aula</button>}
                </div>
              )}
              {ehProfessorOuAdmin && passoAtivo && screen !== "roteiro-testes" && (
                <FaixaTeste passo={passoAtivo} emTeste={emTeste} onConcluir={() => voltarAoRoteiroDeTestes(true)} onVoltar={() => voltarAoRoteiroDeTestes(false)} />
              )}
            </div>
          )}
          {emTeste && !verComo && (
            <div className="balance-check bad no-print" style={{ marginBottom: 18 }}>
              🧪 Você está agindo como a conta de teste <b>{testeAtivo.nome}</b> ({testeAtivo.matricula}) — não é um aluno real.
            </div>
          )}
          {verComo && (
            <div className="balance-check no-print" style={{ marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", background: "var(--amber-pale)", color: "var(--amber)", border: "1px solid var(--amber)" }}>
              <span>👁 Você está vendo a plataforma como <b>{testeAtivo.nome}</b> ({testeAtivo.matricula}) — <b>somente leitura</b>: nada é salvo.</span>
              <button className="btn secondary" onClick={sairDoModoTeste}>Sair da visualização</button>
            </div>
          )}
          {papelEfetivo === "aluno" && infoEtapaTela && infoEtapaTela.disponivel && (
            <FaixaEtapa info={infoEtapaTela} total={etapasAluno.length} mostrarLink={mostrarPi} onRoteiro={() => setScreen("etapas")} />
          )}
          {papelEfetivo === "aluno" && <FluxoEtapa key={screen} etapa={screen} onSuporte={() => setScreen("suporte")} />}
          {papelEfetivo === "aluno" && <FluxoEtapaPI key={"pi" + screen} tela={screen} onSuporte={() => setScreen("suporte")} />}
          {papelEfetivo === "aluno" && !emTeste && etapaDaTelaAtual && prazoTela.fechada && infoEtapaTela && infoEtapaTela.disponivel
            ? <EtapaFechada key={"ef" + screen} prazo={prazoTela.prazo} titulo={infoEtapaTela.titulo} livreFolha={screen === "diario"} onSuporte={() => setScreen("suporte")}>{tela}</EtapaFechada>
            : (verComo ? <TravaLeitura key={screen}>{tela}</TravaLeitura> : tela)}
        </div>
      </div>
    </div>
  );
}
