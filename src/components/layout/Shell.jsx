import { useState } from "react";
import { useEscrituracao } from "../../hooks/useEscrituracao.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useTurmasDoProfessor } from "../../hooks/useTurmasDoProfessor.js";
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

// Casca do app: sidebar + topbar + área de conteúdo, com o papel vindo de
// verdade do Firestore (perfil.papel), não mais de um botão de demonstração.
//
// LADO DO ALUNO: completo — todas as 13 telas ligadas ao Firestore.
// LADO DO PROFESSOR: completo — Painel (+ Avaliação embutida, como no
// protótipo), Turmas (+ importação de alunos via PDF), Fila de Correção
// (aprovar/devolver — sem o parecer de IA, que depende de uma Cloud
// Function ainda não escrita), Histórico do aluno, Documentos Fiscais
// (catálogo + importação via ZIP), Plano de Contas (+ criar conta).
//
// O seletor de "qual turma/aluno estou vendo" mora aqui no Shell:
// turmaSelecionadaId (lista de turmas do professor) e alunoSelecionado
// (setado ao clicar num aluno em Turmas, usado por Histórico do aluno).
//
// Padrão a seguir ao portar/ajustar uma tela: useEscrituracao (lançamentos
// + razão/DRE/BP já calculados), useDocumentosDaTurma (catálogo liberado
// para uma turma) e useLancamentosDaTurma (todos os lançamentos de todos
// os alunos de uma turma, para Painel/Fila) cobrem a maior parte do que
// qualquer tela precisa — prefira esses hooks a escrever um listener novo.

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
];

function TelaDashboardAluno({ perfil, esc }) {
  const { lancamentos, dre, bp } = esc;
  const aprovados = lancamentos.filter((l) => l.status === "aprovado").length;
  const pendentes = lancamentos.filter((l) => l.status === "enviado").length;
  const correcao = lancamentos.filter((l) => l.status === "correcao").length;

  return (
    <>
      <div className="screen-eyebrow">01 · visão geral</div>
      <h2 className="screen-title">Meu progresso — Unidade II</h2>
      <p className="screen-sub">Matrícula {perfil.matricula}. Dados ao vivo do Firestore.</p>
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
  const [screen, setScreen] = useState(perfil.papel === "professor" ? "painel" : "dashboard");
  const menu = perfil.papel === "professor" ? MENU_PROFESSOR : MENU_ALUNO;

  // --- Aluno: a própria escrituração ---
  const turmaId = perfil.papel === "aluno" ? perfil.turmaId : null;
  const matricula = perfil.papel === "aluno" ? perfil.matricula : null;
  const esc = useEscrituracao(turmaId, matricula);
  const documentos = useDocumentosDaTurma(turmaId);

  // --- Professor: turma e aluno selecionados ---
  const turmasDoProfessor = useTurmasDoProfessor(perfil.papel === "professor" ? usuario.uid : null);
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState(null);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const turmaSelecionada = turmasDoProfessor?.find((t) => t.id === turmaSelecionadaId) || turmasDoProfessor?.[0] || null;

  function selecionarAlunoEVerHistorico(aluno) {
    setAlunoSelecionado(aluno);
    setScreen("historico");
  }

  const [gerandoBackup, setGerandoBackup] = useState(false);
  async function gerarBackup() {
    setGerandoBackup(true);
    try {
      if (perfil.papel === "aluno") await backupDoAluno(perfil);
      else if (turmaSelecionada) await backupDaTurma(turmaSelecionada);
    } finally {
      setGerandoBackup(false);
    }
  }

  const TELAS_COM_ESCRITURACAO = ["dashboard", "diario", "razao", "balancete", "are", "dre", "bp"];
  const TELAS_COM_DOCUMENTOS = ["documentos", "digitacao", "analise", "classificacao"];

  let tela;
  if (perfil.papel === "aluno" && TELAS_COM_ESCRITURACAO.includes(screen) && esc.carregando) {
    tela = <div className="empty-state">Carregando sua escrituração…</div>;
  } else if (perfil.papel === "aluno" && TELAS_COM_DOCUMENTOS.includes(screen) && documentos === null) {
    tela = <div className="empty-state">Carregando documentos da turma…</div>;
  } else if (perfil.papel === "aluno" && screen === "dashboard") {
    tela = <TelaDashboardAluno perfil={perfil} esc={esc} />;
  } else if (perfil.papel === "aluno" && screen === "empresa") {
    tela = <EmpresaDidatica usuario={usuario} perfil={perfil} />;
  } else if (perfil.papel === "aluno" && screen === "documentos") {
    tela = <DocumentosFiscais documentos={documentos} />;
  } else if (perfil.papel === "aluno" && screen === "digitacao") {
    tela = <DigitacaoNFe turmaId={turmaId} matricula={matricula} documentos={documentos} />;
  } else if (perfil.papel === "aluno" && screen === "analise") {
    tela = <AnaliseFiscal turmaId={turmaId} matricula={matricula} documentos={documentos} />;
  } else if (perfil.papel === "aluno" && screen === "plano") {
    tela = <PlanoContas contas={esc.contas} papel={perfil.papel} />;
  } else if (perfil.papel === "aluno" && screen === "classificacao") {
    tela = <ClassificacaoContabil turmaId={turmaId} matricula={matricula} documentos={documentos} contas={esc.contas} />;
  } else if (perfil.papel === "aluno" && screen === "diario") {
    tela = <LivroDiario turmaId={turmaId} matricula={matricula} lancamentos={esc.lancamentos} contas={esc.contas} documentos={documentos} />;
  } else if (perfil.papel === "aluno" && screen === "razao") {
    tela = <LivroRazao razao={esc.razao} />;
  } else if (perfil.papel === "aluno" && screen === "balancete") {
    tela = <Balancete razao={esc.razao} />;
  } else if (perfil.papel === "aluno" && screen === "are") {
    tela = <ARE dre={esc.dre} />;
  } else if (perfil.papel === "aluno" && screen === "dre") {
    tela = <DRE dre={esc.dre} />;
  } else if (perfil.papel === "aluno" && screen === "bp") {
    tela = <BalancoPatrimonial bp={esc.bp} />;
  } else if (perfil.papel === "professor" && screen === "painel") {
    tela = <Painel turma={turmaSelecionada} />;
  } else if (perfil.papel === "professor" && screen === "turmas") {
    tela = (
      <Turmas
        uid={usuario.uid}
        turmaSelecionadaId={turmaSelecionada?.id}
        setTurmaSelecionadaId={setTurmaSelecionadaId}
        onSelecionarAluno={selecionarAlunoEVerHistorico}
      />
    );
  } else if (perfil.papel === "professor" && screen === "fila") {
    tela = turmaSelecionada ? <FilaCorrecao turmaId={turmaSelecionada.id} /> : <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  } else if (perfil.papel === "professor" && screen === "historico") {
    tela = <HistoricoAluno turmaId={turmaSelecionada?.id} alunoSelecionado={alunoSelecionado} />;
  } else if (perfil.papel === "professor" && screen === "documentos") {
    tela = <DocumentosFiscaisProfessor turma={turmaSelecionada} />;
  } else if (perfil.papel === "professor" && screen === "plano") {
    tela = <PlanoContas contas={esc.contas} papel={perfil.papel} />;
  }

  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="app">
      <div className={"sidebar-backdrop" + (menuAberto ? " open" : "")} onClick={() => setMenuAberto(false)} />
      <div className={"sidebar" + (menuAberto ? " open" : "")}>
        <div className="sidebar-head">
          <div className="kicker">CI · UNIDADE II</div>
          <h1>Escrituração Contábil</h1>
        </div>
        <div className="nav-group">
          <div className="nav-group-label">{perfil.papel}</div>
          {menu.map((item) => (
            <div
              key={item.key}
              className={"nav-item" + (screen === item.key ? " active" : "")}
              onClick={() => { setScreen(item.key); setMenuAberto(false); }}
            >
              <span>{item.label}</span>
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
              {perfil.papel === "aluno"
                ? "Matrícula " + perfil.matricula
                : (turmaSelecionada ? "Turma: " + turmaSelecionada.nome : "Nenhuma turma selecionada")}
            </div>
          </div>
          <div className="role-switch">
            <button className="role-btn" disabled={gerandoBackup || (perfil.papel === "professor" && !turmaSelecionada)} onClick={gerarBackup}>
              {gerandoBackup ? "Gerando backup…" : "Baixar backup"}
            </button>
            <button className="role-btn" onClick={onSair}>Sair</button>
          </div>
        </div>
        <div className="content">{tela}</div>
      </div>
    </div>
  );
}
