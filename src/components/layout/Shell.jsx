import { useState } from "react";
import { useEscrituracao } from "../../hooks/useEscrituracao.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useTurmasDoProfessor } from "../../hooks/useTurmasDoProfessor.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { fmt } from "../../lib/contabil.js";
import { backupDoAluno, backupDaTurma } from "../../lib/backup.js";

import EmpresaDidatica from "../aluno/EmpresaDidatica.jsx";
import DocumentosFiscais from "../aluno/DocumentosFiscais.jsx";
import DigitacaoNFe from "../aluno/DigitacaoNFe.jsx";
import AnaliseFiscal from "../aluno/AnaliseFiscal.jsx";
import PlanoContas from "../aluno/PlanoContas.jsx";
import ClassificacaoContabil from "../aluno/ClassificacaoContabil.jsx";
import LivroDiario from "../aluno/LivroDiario.jsx";
import LivroRazao from "../aluno/LivroRazao.jsx";
import Balancete from "../aluno/Balancete.jsx";
import ARE from "../aluno/ARE.jsx";
import DRE from "../aluno/DRE.jsx";
import BalancoPatrimonial from "../aluno/BalancoPatrimonial.jsx";

import Painel from "../professor/Painel.jsx";
import Turmas from "../professor/Turmas.jsx";
import FilaCorrecao from "../professor/FilaCorrecao.jsx";
import HistoricoAluno from "../professor/HistoricoAluno.jsx";
import DocumentosFiscaisProfessor from "../professor/DocumentosFiscaisProfessor.jsx";
import ModoTeste from "../professor/ModoTeste.jsx";

import ManualAluno from "../manuais/ManualAluno.jsx";
import ManualProfessor from "../manuais/ManualProfessor.jsx";
import ManualOperacao from "../manuais/ManualOperacao.jsx";

// Casca do app: sidebar + topbar + área de conteúdo, com o papel vindo de
// verdade do Firestore (perfil.papel), não mais de um botão de demonstração.
//
// LADO DO ALUNO: completo — todas as 13 telas ligadas ao Firestore.
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

const MENU_ALUNO = [
  { key: "dashboard", label: "Meu progresso" },
  { key: "empresa", label: "Empresa didática" },
  { key: "documentos", label: "Documentos fiscais" },
  { key: "digitacao", label: "Digitação da NF-e" },
  { key: "analise", label: "Análise fiscal" },
  { key: "plano", label: "Plano de contas" },
  { key: "classificacao", label: "Classificação contábil" },
  { key: "diario", label: "Livro diário" },
  { key: "razao", label: "Livro razão" },
  { key: "balancete", label: "Balancete" },
  { key: "are", label: "ARE" },
  { key: "dre", label: "DRE" },
  { key: "bp", label: "Balanço patrimonial" },
];

const MENU_PROFESSOR = [
  { key: "painel", label: "Painel do professor" },
  { key: "turmas", label: "Turmas" },
  { key: "fila", label: "Fila de correção" },
  { key: "historico", label: "Histórico do aluno" },
  { key: "documentos", label: "Documentos fiscais" },
  { key: "plano", label: "Plano de contas" },
  { key: "modoteste", label: "Modo de teste" },
];

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

function TelaDashboardAluno({ identificacao, esc }) {
  const { lancamentos, dre, bp } = esc;
  const aprovados = lancamentos.filter((l) => l.status === "aprovado").length;
  const pendentes = lancamentos.filter((l) => l.status === "enviado").length;
  const correcao = lancamentos.filter((l) => l.status === "correcao").length;

  return (
    <>
      <div className="screen-eyebrow">01 · visão geral</div>
      <h2 className="screen-title">Meu progresso — Unidade II</h2>
      <p className="screen-sub">{identificacao}. Dados ao vivo do Firestore.</p>
      <div className="kpi-row">
        <div className="kpi ok"><div className="kpi-label">Lançamentos aprovados</div><div className="kpi-value mono">{aprovados}</div></div>
        <div className="kpi warn"><div className="kpi-label">Aguardando correção</div><div className="kpi-value mono">{pendentes}</div></div>
        <div className="kpi bad"><div className="kpi-label">Com correção necessária</div><div className="kpi-value mono">{correcao}</div></div>
        <div className="kpi"><div className="kpi-label">Balanço fecha?</div><div className="kpi-value mono">{lancamentos.length === 0 ? "—" : (bp.fecha ? "sim" : "não")}</div></div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Resultado do exercício (parcial)</h3></div>
        <div className="panel-body">R$ {fmt(dre.resultadoExercicio)}</div>
      </div>
    </>
  );
}

export default function Shell({ usuario, perfil, onSair }) {
  const ehProfessorOuAdmin = perfil.papel === "professor" || perfil.papel === "admin";

  const [screen, setScreen] = useState(ehProfessorOuAdmin ? "painel" : "dashboard");
  const [menuAberto, setMenuAberto] = useState(false);

  // --- Modo de teste (só existe para professor/admin) ---
  const [testeAtivo, setTesteAtivo] = useState(null); // { turmaId, matricula, nome } | null
  const emTeste = ehProfessorOuAdmin && !!testeAtivo;

  function sairDoModoTeste() {
    setTesteAtivo(null);
    setScreen("painel");
  }
  function entrarNoModoTeste(alvo) {
    setTesteAtivo(alvo);
    setScreen("dashboard");
  }

  // papelEfetivo/turmaId/matricula: o que as telas de aluno realmente usam,
  // já considerando o modo de teste.
  const papelEfetivo = emTeste ? "aluno" : perfil.papel;
  const turmaId = emTeste ? testeAtivo.turmaId : (perfil.papel === "aluno" ? perfil.turmaId : null);
  const matricula = emTeste ? testeAtivo.matricula : (perfil.papel === "aluno" ? perfil.matricula : null);

  const esc = useEscrituracao(turmaId, matricula);
  const documentos = useDocumentosDaTurma(turmaId);

  // Indicativo no menu: lançamentos com "correção necessária" ainda não
  // reenviados pelo aluno — enquanto o ciclo aluno/professor não fecha
  // (status chega a "aprovado"), o item "Livro diário" mostra a contagem.
  const correcoesPendentesAluno = (esc.lancamentos || []).filter((l) => l.status === "correcao").length;

  // --- Professor/admin: turma e aluno selecionados ---
  const turmasDoProfessor = useTurmasDoProfessor(ehProfessorOuAdmin ? usuario.uid : null);
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState(null);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const turmaSelecionada = turmasDoProfessor?.find((t) => t.id === turmaSelecionadaId) || turmasDoProfessor?.[0] || null;

  // Indicativo no menu do professor: lançamentos aguardando a análise dele
  // (envio inicial ou reenvio depois de uma correção) na turma selecionada.
  const alunosParaFila = useAlunosDaTurma(ehProfessorOuAdmin && !emTeste ? turmaSelecionada?.id : null);
  const { todos: lancamentosParaFila } = useLancamentosDaTurma(ehProfessorOuAdmin && !emTeste ? turmaSelecionada?.id : null, alunosParaFila);
  const correcoesPendentesProfessor = lancamentosParaFila.filter(({ lancamento }) => lancamento.status === "enviado").length;

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

  function comBadge(itens, key, contagem) {
    return itens.map((it) => (it.key === key && contagem > 0 ? { ...it, badge: contagem } : it));
  }

  let menu = emTeste
    ? MENU_ALUNO
    : papelEfetivo === "aluno"
      ? [...MENU_ALUNO, ...manuaisPara(perfil.papel)]
      : [...MENU_PROFESSOR, ...manuaisPara(perfil.papel)];

  if (papelEfetivo === "aluno") {
    menu = comBadge(menu, "diario", correcoesPendentesAluno);
  }
  if (ehProfessorOuAdmin && !emTeste) {
    menu = comBadge(menu, "fila", correcoesPendentesProfessor);
  }

  const TELAS_COM_ESCRITURACAO = ["dashboard", "diario", "razao", "balancete", "are", "dre", "bp"];
  const TELAS_COM_DOCUMENTOS = ["documentos", "digitacao", "analise", "classificacao"];

  let tela;
  if (screen === "manual-aluno") {
    tela = <ManualAluno />;
  } else if (screen === "manual-professor") {
    tela = <ManualProfessor />;
  } else if (screen === "manual-operacao") {
    tela = <ManualOperacao />;
  } else if (ehProfessorOuAdmin && !emTeste && screen === "modoteste") {
    tela = <ModoTeste turma={turmaSelecionada} onEntrar={entrarNoModoTeste} />;
  } else if (papelEfetivo === "aluno" && TELAS_COM_ESCRITURACAO.includes(screen) && esc.carregando) {
    tela = <div className="empty-state">Carregando escrituração…</div>;
  } else if (papelEfetivo === "aluno" && TELAS_COM_DOCUMENTOS.includes(screen) && documentos === null) {
    tela = <div className="empty-state">Carregando documentos da turma…</div>;
  } else if (papelEfetivo === "aluno" && screen === "dashboard") {
    tela = <TelaDashboardAluno identificacao={emTeste ? "Conta de teste — " + testeAtivo.nome : "Matrícula " + perfil.matricula} esc={esc} />;
  } else if (papelEfetivo === "aluno" && screen === "empresa") {
    tela = <EmpresaDidatica usuario={usuario} perfil={emTeste ? { turmaId, matricula } : perfil} />;
  } else if (papelEfetivo === "aluno" && screen === "documentos") {
    tela = <DocumentosFiscais documentos={documentos} />;
  } else if (papelEfetivo === "aluno" && screen === "digitacao") {
    tela = <DigitacaoNFe turmaId={turmaId} matricula={matricula} documentos={documentos} />;
  } else if (papelEfetivo === "aluno" && screen === "analise") {
    tela = <AnaliseFiscal turmaId={turmaId} matricula={matricula} documentos={documentos} />;
  } else if (papelEfetivo === "aluno" && screen === "plano") {
    tela = <PlanoContas contas={esc.contas} papel={papelEfetivo} />;
  } else if (papelEfetivo === "aluno" && screen === "classificacao") {
    tela = <ClassificacaoContabil turmaId={turmaId} matricula={matricula} documentos={documentos} contas={esc.contas} />;
  } else if (papelEfetivo === "aluno" && screen === "diario") {
    tela = <LivroDiario turmaId={turmaId} matricula={matricula} lancamentos={esc.lancamentos} contas={esc.contas} documentos={documentos} />;
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
  } else if (ehProfessorOuAdmin && screen === "painel") {
    tela = <Painel turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "turmas") {
    tela = (
      <Turmas
        uid={usuario.uid}
        turmaSelecionadaId={turmaSelecionada?.id}
        setTurmaSelecionadaId={setTurmaSelecionadaId}
        onSelecionarAluno={selecionarAlunoEVerHistorico}
      />
    );
  } else if (ehProfessorOuAdmin && screen === "fila") {
    tela = turmaSelecionada ? <FilaCorrecao turmaId={turmaSelecionada.id} /> : <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  } else if (ehProfessorOuAdmin && screen === "historico") {
    tela = <HistoricoAluno turmaId={turmaSelecionada?.id} alunoSelecionado={alunoSelecionado} />;
  } else if (ehProfessorOuAdmin && screen === "documentos") {
    tela = <DocumentosFiscaisProfessor turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "plano") {
    tela = <PlanoContas contas={esc.contas} papel={perfil.papel} />;
  }

  return (
    <div className="app">
      <div className={"sidebar-backdrop" + (menuAberto ? " open" : "")} onClick={() => setMenuAberto(false)} />
      <div className={"sidebar" + (menuAberto ? " open" : "")}>
        <div className="sidebar-head">
          <div className="kicker">CI · UNIDADE II</div>
          <h1>Escrituração Contábil</h1>
        </div>
        <div className="nav-group">
          <div className="nav-group-label">{emTeste ? "aluno (modo de teste)" : perfil.papel}</div>
          {menu.map((item) => (
            <div
              key={item.key}
              className={"nav-item" + (screen === item.key ? " active" : "")}
              onClick={() => { setScreen(item.key); setMenuAberto(false); }}
            >
              <span>{item.label}</span>
              {!!item.badge && <span className="nav-badge">{item.badge}</span>}
            </div>
          ))}
        </div>
        <div className="sidebar-foot">{usuario.email}</div>
      </div>
      <div className="main">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="menu-toggle" aria-label="Abrir menu" onClick={() => setMenuAberto(true)}>☰</button>
            <div className="empresa">
              {emTeste
                ? "🧪 Modo de teste — " + testeAtivo.nome
                : perfil.papel === "aluno"
                  ? "Matrícula " + perfil.matricula
                  : (turmaSelecionada ? "Turma: " + turmaSelecionada.nome : "Nenhuma turma selecionada")}
            </div>
          </div>
          <div className="role-switch">
            {emTeste && <button className="role-btn" onClick={sairDoModoTeste}>Sair do modo de teste</button>}
            <button className="role-btn" disabled={gerandoBackup || (ehProfessorOuAdmin && !emTeste && !turmaSelecionada)} onClick={gerarBackup}>
              {gerandoBackup ? "Gerando backup…" : "Baixar backup"}
            </button>
            <button className="role-btn" onClick={onSair}>Sair</button>
          </div>
        </div>
        <div className="content">
          {emTeste && (
            <div className="balance-check bad no-print" style={{ marginBottom: 18 }}>
              🧪 Você está agindo como a conta de teste <b>{testeAtivo.nome}</b> ({testeAtivo.matricula}) — não é um aluno real.
            </div>
          )}
          {tela}
        </div>
      </div>
    </div>
  );
}
