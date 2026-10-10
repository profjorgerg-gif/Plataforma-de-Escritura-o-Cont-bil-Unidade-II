import { useState } from "react";
import { useEscrituracao } from "../../hooks/useEscrituracao.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useTurmasDoProfessor } from "../../hooks/useTurmasDoProfessor.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useProgressoAluno } from "../../hooks/useProgressoAluno.js";
import { useMeuRegistroDeAluno } from "../../hooks/useMeuRegistroDeAluno.js";
import { useTurma } from "../../hooks/useTurma.js";
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
import { useChamados } from "../../hooks/useChamados.js";
import Turmas from "../professor/Turmas.jsx";
import FilaCorrecao from "../professor/FilaCorrecao.jsx";
import HistoricoAluno from "../professor/HistoricoAluno.jsx";
import DocumentosFiscaisProfessor from "../professor/DocumentosFiscaisProfessor.jsx";
import ModoTeste from "../professor/ModoTeste.jsx";

import ManualAluno from "../manuais/ManualAluno.jsx";
import ManualProfessor from "../manuais/ManualProfessor.jsx";
import ManualOperacao from "../manuais/ManualOperacao.jsx";
import RoteiroAluno from "../manuais/RoteiroAluno.jsx";
import ConsultaFiscal from "../shared/ConsultaFiscal.jsx";

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
      { key: "consulta", label: "Consulta CFOP/NCM" },
      { key: "plano", label: "Plano de contas" },
      { key: "suporte", label: "Suporte" },
    ],
  },
];

// Monta os grupos do menu do aluno já com o badge de pendências (no item
// "Livro diário") e, quando for o caso, o grupo de manuais ao final — mesmo
// padrão usado no modo de teste (sem manuais) e no aluno de verdade (com).
function gruposMenuAluno({ incluirManuais, badgeDiario, badgeSuporte }) {
  const grupos = MENU_ALUNO_GRUPOS.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.map((item) =>
      item.key === "diario" && badgeDiario > 0 ? { ...item, badge: badgeDiario }
        : item.key === "suporte" && badgeSuporte > 0 ? { ...item, badge: badgeSuporte } : item
    ),
  }));
  if (incluirManuais) grupos.push({ label: "manuais", itens: manuaisPara("aluno") });
  return grupos;
}

// Menu do professor agrupado por função (2026-10-08, mesmo pedido do
// professor que levou ao reagrupamento do menu do aluno: tudo numa lista só
// misturava "o que eu olho todo dia" com "ferramenta de apoio que uso de vez
// em quando"). Sem numeração — ao contrário do aluno, o professor não segue
// uma sequência fixa de telas.
const MENU_PROFESSOR_GRUPOS = [
  {
    label: null,
    itens: [
      { key: "painel", label: "Painel do professor" },
      { key: "notas", label: "Notas" },
      { key: "dashboard-ciclo", label: "Dashboard do ciclo" },
    ],
  },
  {
    label: "gestão da turma",
    itens: [
      { key: "turmas", label: "Turmas" },
      { key: "fila", label: "Fila de correção" },
      { key: "historico", label: "Histórico do aluno" },
      { key: "suporte", label: "Suporte" },
      { key: "relatorio", label: "Relatório de orientação" },
      { key: "refazer", label: "Refazer nota do aluno" },
      { key: "registro", label: "Registro do processo" },
    ],
  },
  {
    label: "apoio e consulta",
    itens: [
      { key: "roteiro", label: "Roteiro do Aluno" },
      { key: "documentos", label: "Documentos fiscais" },
      { key: "consulta", label: "Consulta CFOP/NCM" },
      { key: "plano", label: "Plano de contas" },
      { key: "modelos", label: "Modelos de mensagens" },
    ],
  },
  {
    label: "ferramentas",
    itens: [{ key: "modoteste", label: "Modo de teste" }],
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
  grupos.push({ label: "manuais", itens: manuaisPara(papel) });
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

// Mostra a nota da Unidade II decomposta nos três componentes da rubrica,
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
      <div className="panel-head"><h3>Minha nota — Unidade II</h3></div>
      <div className="panel-body">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-label">Completude do ciclo ({Math.round(PESOS_RUBRICA.completude * 100)}%)</div><div className="kpi-value mono">{completudePct === null ? "—" : completudePct + "%"}</div></div>
          <div className="kpi"><div className="kpi-label">Qualidade técnica ({Math.round(PESOS_RUBRICA.qualidade * 100)}%)</div><div className="kpi-value mono">{registro.nota ?? "—"}</div></div>
          <div className="kpi"><div className="kpi-label">Autonomia ({Math.round(PESOS_RUBRICA.autonomia * 100)}%)</div><div className="kpi-value mono">{autonomiaPct === null ? "—" : autonomiaPct + "%"}</div></div>
          <div className="kpi ok"><div className="kpi-label">Nota final</div><div className="kpi-value mono">{notaFinal === null ? "—" : fmt(notaFinal)}</div></div>
        </div>
        {dias > 0 && <div className="helper-note">Desconto de {fmt(desconto)} ponto(s) já aplicado na nota final, por {dias} dia(s) de atraso em relação ao prazo ({fmtData(prazo)}).</div>}
        <div className="helper-note">Completude e autonomia são calculadas automaticamente a partir do que você já fez no sistema; a qualidade técnica é a avaliação do seu professor sobre o raciocínio contábil.</div>
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
      <h2 className="screen-title">Meu progresso — Unidade II</h2>
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
      <h2 className="screen-title">Minha nota — Unidade II</h2>
      <p className="screen-sub">Sua avaliação da Unidade II, liberada pelo professor quando estiver pronta.</p>
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

  const [screen, setScreen] = useState(ehProfessorOuAdmin ? "painel" : "dashboard");
  const [menuAberto, setMenuAberto] = useState(false);

  // Classificação → Livro diário: ao clicar em "usar no lançamento" na tela
  // de Classificação Contábil, guardamos aqui a classificação escolhida e
  // trocamos direto para a tela do Diário, que consome e limpa este estado.
  const [rascunhoDeClassificacao, setRascunhoDeClassificacao] = useState(null);
  function usarClassificacaoNoLancamento(classificacao) {
    setRascunhoDeClassificacao(classificacao);
    setScreen("diario");
  }

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
  const progresso = useProgressoAluno(turmaId, matricula);
  const meuRegistro = useMeuRegistroDeAluno(turmaId, matricula);
  const minhaTurma = useTurma(turmaId);

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

  // Indicativo no menu do professor: lançamentos aguardando a análise dele
  // (envio inicial ou reenvio depois de uma correção) na turma selecionada.
  const alunosParaFila = useAlunosDaTurma(ehProfessorOuAdmin && !emTeste ? turmaSelecionada?.id : null);
  const { todos: lancamentosParaFila } = useLancamentosDaTurma(ehProfessorOuAdmin && !emTeste ? turmaSelecionada?.id : null, alunosParaFila);
  const { chamados: chamadosDaTurma } = useChamados(ehProfessorOuAdmin && !emTeste ? turmaSelecionada?.id : null, null);
  const suporteNaoLidoProfessor = (chamadosDaTurma || []).filter((c) => c.naoLidoProfessor).length;
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

  // Menu do aluno (e do modo de teste, que usa as mesmas telas): agrupado e
  // numerado na ordem real do exercício. Menu do professor: agrupado por
  // função, sem numeração (2026-10-08).
  let menuGrupos;
  if (papelEfetivo === "aluno") {
    menuGrupos = gruposMenuAluno({
      incluirManuais: !emTeste,
      badgeDiario: correcoesPendentesAluno,
      badgeSuporte: suporteNaoLidoAluno,
    });
  } else {
    menuGrupos = gruposMenuProfessor({
      papel: perfil.papel,
      badgeFila: correcoesPendentesProfessor,
      badgeSuporte: suporteNaoLidoProfessor,
    });
  }

  const TELAS_COM_ESCRITURACAO = ["dashboard", "minha-nota", "diario", "razao", "balancete", "are", "dre", "bp"];
  const TELAS_COM_DOCUMENTOS = ["documentos", "digitacao", "classificacao"];

  let tela;
  if (screen === "roteiro") {
    tela = <RoteiroAluno />;
  } else if (screen === "manual-aluno") {
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
    tela = <TelaDashboardAluno identificacao={emTeste ? "Conta de teste — " + testeAtivo.nome : "Matrícula " + perfil.matricula} esc={esc} documentos={documentos} progresso={progresso} registro={meuRegistro} turma={minhaTurma} />;
  } else if (papelEfetivo === "aluno" && screen === "minha-nota") {
    tela = <TelaMinhaNota registro={meuRegistro} turma={minhaTurma} documentos={documentos} progresso={progresso} lancamentos={esc.lancamentos} contas={esc.contas} />;
  } else if (papelEfetivo === "aluno" && screen === "empresa") {
    tela = <EmpresaDidatica usuario={usuario} perfil={emTeste ? { turmaId, matricula } : perfil} />;
  } else if (papelEfetivo === "aluno" && screen === "documentos") {
    tela = <DocumentosFiscais documentos={documentos} />;
  } else if (papelEfetivo === "aluno" && screen === "digitacao") {
    tela = <DigitacaoAnaliseFiscal turmaId={turmaId} matricula={matricula} documentos={documentos} />;
  } else if (papelEfetivo === "aluno" && screen === "consulta") {
    tela = <ConsultaFiscal />;
  } else if (papelEfetivo === "aluno" && screen === "suporte") {
    tela = <SuporteAluno turmaId={turmaId} matricula={matricula} nome={emTeste ? testeAtivo.nome : meuRegistro?.nome} documentos={documentos || []} />;
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
  } else if (ehProfessorOuAdmin && screen === "painel") {
    tela = <Painel turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "notas") {
    tela = <Notas turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "dashboard-ciclo") {
    tela = <DashboardCiclo turma={turmaSelecionada} onSelecionarAluno={selecionarAlunoEVerHistorico} />;
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
    tela = <HistoricoAluno turmaId={turmaSelecionada?.id} alunoSelecionado={alunoSelecionado} onVoltarParaTurmas={() => setScreen("turmas")} />;
  } else if (ehProfessorOuAdmin && screen === "suporte") {
    tela = <SuporteProfessor turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "registro") {
    tela = <RegistroProcesso turma={turmaSelecionada} />;
  } else if (ehProfessorOuAdmin && screen === "refazer") {
    tela = <RefazerNota turma={turmaSelecionada} />;
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
        </div>
        {menuGrupos.map((grupo, gi) => (
          <div className="nav-group" key={gi}>
            {grupo.label && <div className="nav-group-label">{grupo.label}</div>}
            {grupo.itens.map((item, ii) => (
              <div
                key={item.key}
                className={"nav-item" + (screen === item.key ? " active" : "")}
                onClick={() => { setScreen(item.key); setMenuAberto(false); }}
              >
                {grupo.numerado && <span className="num">{ii + 1}</span>}
                <span>{item.label}</span>
                {!!item.badge && <span className="nav-badge">{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}
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
