import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { Kpi } from "../shared/UI.jsx";

// Agrega as devoluções da turma inteira por conta usada nos lançamentos que
// já precisaram de correção — dá ao professor um retrato do que vale reforçar
// em aula para todo mundo, não só observação isolada aluno por aluno.
function mapaDeErros(todos, contas) {
  const comCorrecao = todos.filter(({ lancamento }) => (lancamento.historicoCorrecoes?.length || 0) > 0);
  const totalCorrecoes = comCorrecao.reduce((s, { lancamento }) => s + lancamento.historicoCorrecoes.length, 0);
  const contagem = {};
  comCorrecao.forEach(({ lancamento }) => {
    (lancamento.partidas || []).forEach((p) => {
      contagem[p.conta] = (contagem[p.conta] || 0) + 1;
    });
  });
  const ranking = Object.entries(contagem)
    .map(([codigo, vezes]) => ({ codigo, nome: contas.find((c) => c.codigo === codigo)?.nome || codigo, vezes }))
    .sort((a, b) => b.vezes - a.vezes)
    .slice(0, 8);
  return { lancamentosComCorrecao: comCorrecao.length, totalCorrecoes, ranking };
}

// ---- Andamento por etapa (2026-10-09) -------------------------------------
// Só LEITURA: lê digitações, análises e classificações de cada aluno uma vez
// (botão "Atualizar" lê de novo) e junta com os lançamentos que o painel já
// recebia. Nada é gravado.
const DIAS_PARADO = 5;
const CAMPOS_DATA = ["atualizadoEm", "enviadoEm", "aprovadoEm", "salvoEm", "criadoEm", "em"];

function ms(v) {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v === "string") { const t = Date.parse(v); return Number.isFinite(t) ? t : 0; }
  return 0;
}
function ultimaData(obj) {
  let m = 0;
  for (const k of CAMPOS_DATA) m = Math.max(m, ms(obj?.[k]));
  for (const h of obj?.historicoCorrecoes || []) m = Math.max(m, ms(h?.em));
  return m;
}
function fmtUltima(t) {
  if (!t) return "—";
  const d = new Date(t);
  const dias = Math.floor((Date.now() - t) / 86400000);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (dias <= 0) return "hoje " + hora;
  if (dias === 1) return "ontem " + hora;
  return "há " + dias + " dias";
}

async function lerEtapas(turmaId, alunos) {
  const saida = {};
  await Promise.all(alunos.map(async (a) => {
    const base = ["turmas", turmaId, "alunos", a.matricula];
    const [dig, ana, cla] = await Promise.all([
      getDocs(collection(db, ...base, "digitacoesNFe")),
      getDocs(collection(db, ...base, "analisesFiscais")),
      getDocs(collection(db, ...base, "classificacoes")),
    ]);
    saida[a.matricula] = {
      dig: dig.docs.map((d) => ({ id: d.id, ...d.data() })),
      ana: ana.docs.map((d) => ({ id: d.id, ...d.data() })),
      cla: cla.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  }));
  return saida;
}

function resumoAluno(etapas, lancs, total) {
  const dig = etapas?.dig || [], ana = etapas?.ana || [], cla = etapas?.cla || [];
  const porStatus = (st) => new Set(lancs.filter((l) => l.status === st).map((l) => l.documento || l.id)).size;
  const r = {
    dig: new Set(dig.map((d) => d.id)).size,
    ana: new Set(ana.filter((x) => x.status === "enviado").map((x) => x.id)).size,
    cla: new Set(cla.map((c) => c.documento || c.id)).size,
    ras: porStatus("rascunho"), env: porStatus("enviado"), apr: porStatus("aprovado"), cor: porStatus("correcao"),
  };
  let ultima = 0;
  [...dig, ...ana, ...cla, ...lancs].forEach((x) => { ultima = Math.max(ultima, ultimaData(x)); });
  r.ultima = ultima;
  const atividade = r.dig + r.ana + r.cla + r.ras + r.env + r.apr + r.cor;
  if (atividade === 0) r.situacao = "sem";
  else if (r.cor > 0) r.situacao = "correcao";
  else if (total > 0 && r.apr >= total) r.situacao = "completo";
  else if (ultima && Date.now() - ultima > DIAS_PARADO * 86400000) r.situacao = "parado";
  else r.situacao = "andamento";
  return r;
}

const ROTULO_SIT = {
  andamento: ["ok", "em andamento"], parado: ["warn", "parado"], correcao: ["warn", "em correção"],
  sem: ["bad", "sem atividade"], completo: ["ok", "completo"],
};

export default function Painel({ turma, onAbrirHistorico }) {
  const alunos = useAlunosDaTurma(turma?.id);
  const { todos } = useLancamentosDaTurma(turma?.id, alunos);
  const documentos = useDocumentosDaTurma(turma?.id);
  const [etapas, setEtapas] = useState(null);
  const [erroEtapas, setErroEtapas] = useState(false);
  const [lendo, setLendo] = useState(false);
  const atualizarEtapas = useCallback(async () => {
    if (!turma?.id || !alunos) return;
    setLendo(true); setErroEtapas(false);
    try { setEtapas(await lerEtapas(turma.id, alunos)); } catch (e) { setErroEtapas(true); }
    setLendo(false);
  }, [turma?.id, alunos]);
  useEffect(() => { if (alunos && turma?.id) atualizarEtapas(); }, [turma?.id, alunos?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalNotas = documentos?.length || 0;
  const resumos = useMemo(() => {
    const m = {};
    (alunos || []).forEach((a) => {
      const lancs = todos.filter((t) => t.aluno.matricula === a.matricula).map((t) => t.lancamento);
      m[a.matricula] = etapas ? resumoAluno(etapas[a.matricula], lancs, totalNotas) : null;
    });
    return m;
  }, [alunos, todos, etapas, totalNotas]);
  const parados = etapas ? Object.values(resumos).filter((r) => r && r.situacao === "parado").length : null;
  const { contas } = usePlanoContas();
  const pendentes = todos.filter(({ lancamento }) => lancamento.status === "enviado");
  const emCorrecao = todos.filter(({ lancamento }) => lancamento.status === "correcao");
  const aprovadosTotal = todos.filter(({ lancamento }) => lancamento.status === "aprovado").length;
  const erros = useMemo(() => mapaDeErros(todos, contas || []), [todos, contas]);

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (alunos === null) return <div className="empty-state">Carregando…</div>;

  return (
    <>
      <div className="screen-eyebrow">painel do professor</div>
      <h2 className="screen-title">Painel do Professor — Unidade II</h2>
      <p className="screen-sub">Visão geral da turma {turma.nome} e lançamentos pendentes. A avaliação ficou em "Notas", no menu.</p>

      <div className="btn-row no-print" style={{ marginBottom: 16 }}>
        <a className="btn secondary" href="https://console.firebase.google.com/project/plataforma-ci-unidade-ii/firestore/usage" target="_blank" rel="noopener noreferrer">
          📊 Ver uso do Firestore (Console Firebase) ↗
        </a>
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <Kpi label="Alunos na turma" value={alunos.length} />
        <Kpi label="Aguardando você" value={pendentes.length} tone="warn" />
        <Kpi label="Correções em aberto" value={emCorrecao.length} tone="bad" />
        <Kpi label={"Parados há +" + DIAS_PARADO + " dias"} value={parados === null ? "—" : parados} tone="bad" />
        <Kpi label="Aprovados na turma" value={aprovadosTotal} tone="ok" />
      </div>

      <div className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Andamento por etapa — notas fiscais (de {totalNotas})</h3>
          <button className="btn secondary no-print" style={{ padding: "4px 10px", fontSize: 12 }} disabled={lendo} onClick={atualizarEtapas}>{lendo ? "Lendo…" : "↻ Atualizar"}</button>
        </div>
        <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
          {erroEtapas && <div className="balance-check bad" style={{ margin: 10 }}>Não foi possível ler as etapas dos alunos. Os números de lançamentos continuam corretos; tente “Atualizar”.</div>}
          <table>
            <thead><tr>
              <th>Aluno</th><th className="num">① Digitou</th><th className="num">② Analisou</th><th className="num">③ Classificou</th>
              <th className="num">④ Lançou (rascunho)</th><th className="num">⑤ Enviou</th><th className="num">⑥ Aprovadas</th><th className="num">Correção</th>
              <th>Última atividade</th><th>Situação</th>
            </tr></thead>
            <tbody>
              {alunos.map((a) => {
                const r = resumos[a.matricula];
                const v = (x) => (r ? x : "…");
                const sit = r ? ROTULO_SIT[r.situacao] : null;
                return (
                  <tr key={a.matricula}>
                    <td>{onAbrirHistorico
                      ? <a href="#historico" style={{ color: "inherit" }} onClick={(e) => { e.preventDefault(); onAbrirHistorico(a); }}>{a.nome}</a>
                      : a.nome}</td>
                    <td className="num mono">{v(r?.dig)}</td>
                    <td className="num mono">{v(r?.ana)}</td>
                    <td className="num mono">{v(r?.cla)}</td>
                    <td className="num mono">{v(r?.ras)}</td>
                    <td className="num mono">{v(r?.env)}</td>
                    <td className="num mono">{v(r?.apr)}</td>
                    <td className="num mono">{v(r?.cor)}</td>
                    <td>{r ? fmtUltima(r.ultima) : "…"}</td>
                    <td>{sit ? <span className={"tag-pill " + sit[0]}>{sit[1]}</span> : "…"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="helper-note" style={{ margin: 10 }}>
            ①–④ ficam com o aluno; ⑤ aguarda você (Fila de correção); ⑥ já aprovadas. “Parado” = sem salvar nada há mais de {DIAS_PARADO} dias.
            “—” na última atividade = registros antigos sem data. Clique no nome do aluno para abrir o Histórico.
          </p>
        </div>
      </div>

      {erros.lancamentosComCorrecao > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Mapa de erros recorrentes da turma</h3></div>
          <div className="panel-body">
            <div className="helper-note" style={{ marginBottom: 12 }}>
              {erros.lancamentosComCorrecao} lançamento(s) desta turma já precisaram de correção ({erros.totalCorrecoes} devolução(ões) ao todo). As contas abaixo são as que mais aparecem nesses lançamentos — um sinal do que vale reforçar em aula para todos, não só individualmente.
            </div>
            <table>
              <thead><tr><th>Conta</th><th className="num">Vezes em lançamento devolvido</th><th className="num">% das devoluções</th></tr></thead>
              <tbody>
                {erros.ranking.map((r) => (
                  <tr key={r.codigo}>
                    <td className="mono">{r.codigo} — {r.nome}</td>
                    <td className="num mono">{r.vezes}</td>
                    <td className="num mono">{Math.round((r.vezes / erros.lancamentosComCorrecao) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
