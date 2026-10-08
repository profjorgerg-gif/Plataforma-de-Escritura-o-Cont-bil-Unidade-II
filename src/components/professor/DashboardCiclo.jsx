import { useMemo, useState } from "react";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useProgressoTurma } from "../../hooks/useProgressoTurma.js";
import { Kpi } from "../shared/UI.jsx";
import { fmt, prazoEfetivo } from "../../lib/contabil.js";

// Dashboard do ciclo — Entrada × Saída (2026-10-07, pedido do professor).
//
// Para cada aluno e cada documento liberado para a turma, considera 4
// etapas (Digitação → Análise fiscal enviada → Classificação → Lançamento
// APROVADO) e cruza isso com a direção do documento (entrada/saída).
//
// Critério da etapa 4 — decidido com o professor: só lançamento APROVADO
// fecha o ciclo (mesma régua que já vale no resto do sistema: Razão,
// Balancete, DRE e BP só usam lançamentos aprovados). Um lançamento
// "enviado" ou "em correção" NÃO conta como concluído — mas, para não
// esconder que o aluno já fez a parte dele e está só esperando o
// professor, o saldo daquele documento aparece em âmbar (aguardando você)
// em vez de vermelho (aluno ainda nem lançou).
const DIAS_INATIVIDADE = 6;

// "Acompanhamento do processo" (2026-10-08, pedido do professor) — não é
// uma nota nova, é um aviso para o professor agir a tempo: cruza o %
// concluído (que a tabela "Total" já calcula) com os dias que faltam até
// o prazo daquele aluno. Decidido junto com o professor: só ele vê isso
// (não aparece pro aluno) e os limites abaixo são um ponto de partida —
// podem ser ajustados depois de observar como a turma se comporta num
// ciclo real; não há como calcular "no ritmo esperado" de verdade sem uma
// data de início registrada, então o aviso só aparece quando o prazo já
// está perto.
function diasAteOPrazo(prazo) {
  if (!prazo) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  const d1 = new Date(hoje + "T00:00:00"), d2 = new Date(prazo + "T00:00:00");
  return Math.round((d2 - d1) / 86400000);
}
function situacaoProcesso(pctConcluido, dias) {
  if (pctConcluido === null || dias === null) return null;
  if (dias <= 3 && pctConcluido < 80) return { label: "atrasado", tone: "bad" };
  if (dias <= 7 && pctConcluido < 50) return { label: "atenção", tone: "warn" };
  return { label: "em dia", tone: "ok" };
}

function milissegundos(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  const d = new Date(ts);
  return isNaN(d) ? null : d.getTime();
}

function valorLancamento(l) {
  return (l.partidas || []).filter((p) => p.tipo === "D").reduce((s, p) => s + (Number(p.valor) || 0), 0);
}

// Para um aluno e um documento: em que pé está cada uma das 4 etapas.
function statusDocumentoAluno(doc, digitacoes, analises, classificacoes, lancsDoDoc) {
  const digitado = !!(digitacoes && digitacoes[doc.id]);
  const analisado = analises && analises[doc.id]?.status === "enviado";
  const classificado = (classificacoes || []).some((c) => c.documento === doc.id);
  const aprovado = lancsDoDoc.some((l) => l.status === "aprovado");
  const aguardandoProfessor = !aprovado && lancsDoDoc.some((l) => l.status === "enviado" || l.status === "correcao");
  return { digitado, analisado, classificado, aprovado, aguardandoProfessor };
}

function linhaPorAluno(aluno, documentosDoTipo, progressoTurma, lancsAluno) {
  const digitacoes = progressoTurma.digitacoesPorMatricula[aluno.matricula];
  const analises = progressoTurma.analisesPorMatricula[aluno.matricula];
  const classificacoes = progressoTurma.classificacoesPorMatricula[aluno.matricula];

  let nDigitado = 0, nAnalisado = 0, nClassificado = 0, nAprovado = 0, nAguardando = 0;
  documentosDoTipo.forEach((doc) => {
    const lancsDoDoc = lancsAluno.filter((l) => l.documento === doc.id);
    const st = statusDocumentoAluno(doc, digitacoes, analises, classificacoes, lancsDoDoc);
    if (st.digitado) nDigitado++;
    if (st.analisado) nAnalisado++;
    if (st.classificado) nClassificado++;
    if (st.aprovado) nAprovado++;
    if (st.aguardandoProfessor) nAguardando++;
  });

  const total = documentosDoTipo.length;
  const saldo = total - nAprovado;
  const pctConcluido = total === 0 ? null : Math.round(((nDigitado + nAnalisado + nClassificado + nAprovado) / (total * 4)) * 100);

  return { aluno, nDigitado, nAnalisado, nClassificado, nAprovado, saldo, nAguardando, pctConcluido, total };
}

function TabelaPorTipo({ titulo, documentosDoTipo, alunos, progressoTurma, todos, turma, mostrarSituacao, onSelecionarAluno, onAbrirRelatorio }) {
  const linhas = alunos.map((a) => {
    const lancsAluno = todos.filter((t) => t.aluno.matricula === a.matricula).map((t) => t.lancamento);
    const linha = linhaPorAluno(a, documentosDoTipo, progressoTurma, lancsAluno);
    const dias = mostrarSituacao ? diasAteOPrazo(prazoEfetivo(a, turma)) : null;
    return { ...linha, dias, situacao: mostrarSituacao ? situacaoProcesso(linha.pctConcluido, dias) : null };
  });

  return (
    <div className="panel">
      <div className="panel-head"><h3>{titulo} ({documentosDoTipo.length} nota{documentosDoTipo.length === 1 ? "" : "s"} liberada{documentosDoTipo.length === 1 ? "" : "s"})</h3></div>
      <div className="panel-body" style={{ padding: 0 }}>
        {documentosDoTipo.length === 0 ? (
          <div className="empty-state">Nenhuma nota deste tipo liberada para a turma.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th className="num">1. Digitação</th>
                <th className="num">2. Análise fiscal</th>
                <th className="num">3. Classificação</th>
                <th className="num">4. Lançamento</th>
                <th className="num">Saldo</th>
                <th style={{ width: 150 }}>% concluído (total)</th>
                {mostrarSituacao && <th style={{ width: 100 }}>Situação</th>}
                <th className="num no-print" style={{ width: 70 }}>Relatório</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((r) => (
                <tr key={r.aluno.matricula} className="clickable" onClick={() => onSelecionarAluno(r.aluno)}>
                  <td>{r.aluno.nome}</td>
                  <td className="num mono">{r.nDigitado}/{r.total}</td>
                  <td className="num mono">{r.nAnalisado}/{r.total}</td>
                  <td className="num mono">{r.nClassificado}/{r.total}</td>
                  <td className="num mono">{r.nAprovado}/{r.total}</td>
                  <td className="num mono">
                    <span style={{
                      fontWeight: r.saldo > 0 ? 600 : 400,
                      color: r.saldo === 0 ? "var(--green)" : (r.nAguardando > 0 ? "var(--amber)" : "var(--red)"),
                    }}>
                      {r.saldo}
                    </span>
                  </td>
                  <td>
                    <div style={{ height: 7, background: "var(--green-pale)", border: "1px solid var(--line-strong)", position: "relative" }}>
                      <div style={{ height: "100%", width: (r.pctConcluido ?? 0) + "%", background: "var(--green)" }} />
                    </div>
                    <div className="mono" style={{ fontSize: 10.5, marginTop: 2, color: "var(--ink-faint)" }}>{r.pctConcluido ?? "—"}%</div>
                  </td>
                  {mostrarSituacao && (
                    <td>
                      {r.situacao ? <span className={"tag-pill " + r.situacao.tone}>{r.situacao.label}</span> : <span className="mono" style={{ color: "var(--ink-faint)" }}>—</span>}
                    </td>
                  )}
                  <td className="num no-print">
                    <button
                      className="btn secondary"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      onClick={(e) => { e.stopPropagation(); onAbrirRelatorio(r.aluno); }}
                    >
                      🖨️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="helper-note" style={{ margin: "0 16px 16px" }}>
        Clique num aluno para abrir o Histórico dele. Saldo em <span style={{ color: "var(--amber)", fontWeight: 600 }}>âmbar</span>: já lançou, aguardando sua aprovação. Em <span style={{ color: "var(--red)", fontWeight: 600 }}>vermelho</span>: ainda não lançou nada para essas notas.
        {mostrarSituacao && (
          <> "Situação" não é nota, é só um aviso para você: compara o % concluído com os dias que faltam até o prazo daquele aluno. <span className="tag-pill warn" style={{ marginRight: 0 }}>atenção</span> = 7 dias ou menos e completude abaixo de 50%; <span className="tag-pill bad" style={{ marginRight: 0 }}>atrasado</span> = 3 dias ou menos e completude abaixo de 80%. São limites provisórios — ajustáveis depois de ver a turma num ciclo real.</>
        )}
      </div>
    </div>
  );
}

function Marca({ feito }) {
  return feito ? <span style={{ color: "var(--green)" }}>✓</span> : <span style={{ color: "var(--ink-faint)" }}>—</span>;
}

// Relatório individual — pensado para ser impresso/salvo como PDF e enviado
// ao próprio aluno (2026-10-07, pedido do professor): o mesmo recorte do
// Dashboard do ciclo (entrada × saída, 4 etapas, saldo), mas de um só aluno
// e documento por documento, para ele conseguir ver exatamente o que falta.
function TabelaRelatorioDocumentos({ titulo, documentosDoTipo, digitacoes, analises, classificacoes, lancsAluno }) {
  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head"><h3>{titulo}</h3></div>
      <div className="panel-body" style={{ padding: 0 }}>
        {documentosDoTipo.length === 0 ? (
          <div className="empty-state">Nenhuma nota deste tipo liberada para a turma.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th className="num">1. Digitação</th>
                <th className="num">2. Análise fiscal</th>
                <th className="num">3. Classificação</th>
                <th className="num">4. Lançamento</th>
              </tr>
            </thead>
            <tbody>
              {documentosDoTipo.map((doc) => {
                const lancsDoDoc = lancsAluno.filter((l) => l.documento === doc.id);
                const st = statusDocumentoAluno(doc, digitacoes, analises, classificacoes, lancsDoDoc);
                return (
                  <tr key={doc.id}>
                    <td className="mono">Nº {doc.numero || doc.id}</td>
                    <td className="num"><Marca feito={st.digitado} /></td>
                    <td className="num"><Marca feito={st.analisado} /></td>
                    <td className="num"><Marca feito={st.classificado} /></td>
                    <td className="num">
                      {st.aprovado ? <Marca feito /> : st.aguardandoProfessor ? <span style={{ color: "var(--amber)" }}>⏳ aguardando professor</span> : <Marca feito={false} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RelatorioAluno({ aluno, turma, docsEntrada, docsSaida, progressoTurma, todos, onVoltar }) {
  const digitacoes = progressoTurma.digitacoesPorMatricula[aluno.matricula];
  const analises = progressoTurma.analisesPorMatricula[aluno.matricula];
  const classificacoes = progressoTurma.classificacoesPorMatricula[aluno.matricula];
  const lancsAluno = todos.filter((t) => t.aluno.matricula === aluno.matricula).map((t) => t.lancamento);

  const linhaEntrada = linhaPorAluno(aluno, docsEntrada, progressoTurma, lancsAluno);
  const linhaSaida = linhaPorAluno(aluno, docsSaida, progressoTurma, lancsAluno);

  const idsEntrada = new Set(docsEntrada.map((d) => d.id));
  const saldoFinanceiroAluno = lancsAluno.reduce(
    (acc, l) => {
      if (l.status !== "aprovado") return acc;
      const dir = idsEntrada.has(l.documento) ? "entrada" : "saida";
      acc[dir] += valorLancamento(l);
      return acc;
    },
    { entrada: 0, saida: 0 }
  );

  const geradoEm = new Date().toLocaleDateString("pt-BR");

  return (
    <>
      <div className="screen-eyebrow no-print">dashboard do ciclo</div>
      <div className="btn-row no-print" style={{ marginBottom: 10 }}>
        <button className="btn secondary" onClick={onVoltar}>← Voltar ao Dashboard do ciclo</button>
        <button className="btn secondary" onClick={() => window.print()}>🖨️ Imprimir / Salvar como PDF</button>
      </div>
      <h2 className="screen-title">Relatório do ciclo — {aluno.nome}</h2>
      <p className="screen-sub">
        Turma: {turma?.nome || "—"} · Matrícula: {aluno.matricula} · Gerado em {geradoEm}
      </p>
      <div className="helper-note">
        Este relatório mostra, documento por documento, em que etapa do ciclo (Digitação → Análise fiscal → Classificação → Lançamento aprovado) você está. "⏳ aguardando professor" significa que você já lançou e está só esperando a aprovação.
      </div>

      <div className="kpi-row">
        <Kpi label="Entrada — aprovadas" value={`${linhaEntrada.nAprovado}/${linhaEntrada.total}`} />
        <Kpi label="Saída — aprovadas" value={`${linhaSaida.nAprovado}/${linhaSaida.total}`} />
        <Kpi label="Saldo entrada aprovado" value={"R$ " + fmt(saldoFinanceiroAluno.entrada)} tone="ok" />
        <Kpi label="Saldo saída aprovado" value={"R$ " + fmt(saldoFinanceiroAluno.saida)} tone="ok" />
      </div>

      <TabelaRelatorioDocumentos titulo="Entrada" documentosDoTipo={docsEntrada} digitacoes={digitacoes} analises={analises} classificacoes={classificacoes} lancsAluno={lancsAluno} />
      <TabelaRelatorioDocumentos titulo="Saída" documentosDoTipo={docsSaida} digitacoes={digitacoes} analises={analises} classificacoes={classificacoes} lancsAluno={lancsAluno} />
    </>
  );
}

export default function DashboardCiclo({ turma, onSelecionarAluno }) {
  const alunos = useAlunosDaTurma(turma?.id);
  const documentos = useDocumentosDaTurma(turma?.id);
  const { todos } = useLancamentosDaTurma(turma?.id, alunos);
  const progressoTurma = useProgressoTurma(turma?.id, alunos);

  const [alunoRelatorio, setAlunoRelatorio] = useState(null);

  const carregando = alunos === null || documentos === null;

  const docsEntrada = useMemo(() => (documentos || []).filter((d) => d.direcao === "entrada"), [documentos]);
  const docsSaida = useMemo(() => (documentos || []).filter((d) => d.direcao !== "entrada"), [documentos]);

  // Documento mais travado da turma — menor % médio de conclusão entre os alunos.
  const documentoMaisTravado = useMemo(() => {
    if (carregando || !alunos || alunos.length === 0 || !documentos || documentos.length === 0) return null;
    let pior = null;
    documentos.forEach((doc) => {
      const pcts = alunos.map((a) => {
        const lancsAluno = todos.filter((t) => t.aluno.matricula === a.matricula).map((t) => t.lancamento);
        const lancsDoDoc = lancsAluno.filter((l) => l.documento === doc.id);
        const st = statusDocumentoAluno(
          doc,
          progressoTurma.digitacoesPorMatricula[a.matricula],
          progressoTurma.analisesPorMatricula[a.matricula],
          progressoTurma.classificacoesPorMatricula[a.matricula],
          lancsDoDoc
        );
        return ([st.digitado, st.analisado, st.classificado, st.aprovado].filter(Boolean).length / 4) * 100;
      });
      const media = pcts.reduce((s, v) => s + v, 0) / pcts.length;
      if (!pior || media < pior.media) pior = { doc, media: Math.round(media) };
    });
    return pior;
  }, [carregando, alunos, documentos, todos, progressoTurma]);

  // Correções por tipo — entre todos os lançamentos já feitos (qualquer
  // status, já que todo lançamento nasce "enviado"), quantos já precisaram
  // de pelo menos uma devolução.
  const correcoesPorTipo = useMemo(() => {
    if (!documentos) return null;
    const direcaoPorDoc = Object.fromEntries(documentos.map((d) => [d.id, d.direcao === "entrada" ? "entrada" : "saida"]));
    const base = { entrada: { total: 0, devolvidos: 0 }, saida: { total: 0, devolvidos: 0 } };
    todos.forEach(({ lancamento: l }) => {
      const dir = direcaoPorDoc[l.documento];
      if (!dir) return;
      base[dir].total++;
      if ((l.historicoCorrecoes?.length || 0) > 0) base[dir].devolvidos++;
    });
    return base;
  }, [documentos, todos]);

  // Apontamentos de análise fiscal por tipo — análises enviadas que
  // marcaram CFOP, NCM ou CST como incorretos para a operação.
  const apontamentosPorTipo = useMemo(() => {
    if (!documentos || !alunos) return null;
    const direcaoPorDoc = Object.fromEntries(documentos.map((d) => [d.id, d.direcao === "entrada" ? "entrada" : "saida"]));
    const base = { entrada: { enviadas: 0, incorretas: 0 }, saida: { enviadas: 0, incorretas: 0 } };
    alunos.forEach((a) => {
      const analises = progressoTurma.analisesPorMatricula[a.matricula] || {};
      Object.entries(analises).forEach(([docId, an]) => {
        if (an.status !== "enviado") return;
        const dir = direcaoPorDoc[docId];
        if (!dir) return;
        base[dir].enviadas++;
        if (an.cfopCorreto === "não" || an.ncmCorreto === "não" || an.cstCorreto === "não") base[dir].incorretas++;
      });
    });
    return base;
  }, [documentos, alunos, progressoTurma]);

  // Saldo financeiro aprovado — soma do valor dos lançamentos aprovados,
  // por direção do documento de origem.
  const saldoFinanceiro = useMemo(() => {
    if (!documentos) return null;
    const direcaoPorDoc = Object.fromEntries(documentos.map((d) => [d.id, d.direcao === "entrada" ? "entrada" : "saida"]));
    const base = { entrada: 0, saida: 0 };
    todos.forEach(({ lancamento: l }) => {
      if (l.status !== "aprovado") return;
      const dir = direcaoPorDoc[l.documento];
      if (!dir) return;
      base[dir] += valorLancamento(l);
    });
    return base;
  }, [documentos, todos]);

  // Valor liberado — soma do valorTotal de cada documento (o valor "oficial"
  // da NF-e, vindo da digitação do professor), por direção. Comparado com o
  // saldoFinanceiro (já aprovado), dá o quanto ainda falta aprovar em R$
  // (2026-10-08, pedido do professor).
  const valorLiberado = useMemo(() => {
    if (!documentos) return null;
    const base = { entrada: 0, saida: 0 };
    documentos.forEach((d) => {
      const dir = d.direcao === "entrada" ? "entrada" : "saida";
      base[dir] += Number(d.valorTotal) || 0;
    });
    return base;
  }, [documentos]);

  // Alunos sem nenhuma atividade (digitação, análise ou lançamento) nos
  // últimos DIAS_INATIVIDADE dias — ou sem nenhuma atividade registrada.
  const alunosInativos = useMemo(() => {
    if (!alunos) return [];
    const agora = Date.now();
    const limite = DIAS_INATIVIDADE * 86400000;
    return alunos.filter((a) => {
      const digitacoes = Object.values(progressoTurma.digitacoesPorMatricula[a.matricula] || {});
      const analises = Object.values(progressoTurma.analisesPorMatricula[a.matricula] || {});
      const lancsAluno = todos.filter((t) => t.aluno.matricula === a.matricula).map((t) => t.lancamento);
      const timestamps = [
        ...digitacoes.map((d) => milissegundos(d.atualizadoEm)),
        ...analises.map((d) => milissegundos(d.atualizadoEm)),
        ...lancsAluno.map((l) => milissegundos(l.criadoEm)),
      ].filter((t) => t !== null);
      if (timestamps.length === 0) return true; // nunca fez nada ainda
      const ultima = Math.max(...timestamps);
      return (agora - ultima) > limite;
    });
  }, [alunos, progressoTurma, todos]);

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (carregando) return <div className="empty-state">Carregando…</div>;

  if (alunoRelatorio) {
    return (
      <RelatorioAluno
        aluno={alunoRelatorio}
        turma={turma}
        docsEntrada={docsEntrada}
        docsSaida={docsSaida}
        progressoTurma={progressoTurma}
        todos={todos}
        onVoltar={() => setAlunoRelatorio(null)}
      />
    );
  }

  return (
    <>
      <div className="screen-eyebrow">dashboard do ciclo</div>
      <h2 className="screen-title">Dashboard do ciclo — Entrada × Saída</h2>
      <p className="screen-sub">
        Por aluno, quantas notas de entrada e de saída já passaram por cada etapa do ciclo, e quantas ainda faltam (saldo). Turma: {turma.nome}.
      </p>

      <div className="kpi-row">
        <Kpi label="Notas de entrada" value={docsEntrada.length} />
        <Kpi label="Notas de saída" value={docsSaida.length} />
        <Kpi label="Total de notas (E + S)" value={documentos.length} />
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Valores por tipo (R$)</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th></th>
                <th className="num">Valor de cada nota</th>
                <th className="num">Esperado na turma (× {alunos.length} aluno{alunos.length === 1 ? "" : "s"})</th>
                <th className="num">Já aprovado</th>
                <th className="num">Saldo pendente</th>
              </tr>
            </thead>
            <tbody>
              {["entrada", "saida"].map((dir) => {
                const porNota = valorLiberado?.[dir] ?? 0;
                const esperadoTurma = porNota * alunos.length;
                const aprovado = saldoFinanceiro?.[dir] ?? 0;
                const pendente = esperadoTurma - aprovado;
                return (
                  <tr key={dir}>
                    <td>{dir === "entrada" ? "Entrada" : "Saída"}</td>
                    <td className="num mono">R$ {fmt(porNota)}</td>
                    <td className="num mono">R$ {fmt(esperadoTurma)}</td>
                    <td className="num mono" style={{ color: "var(--green)" }}>R$ {fmt(aprovado)}</td>
                    <td className="num mono" style={{ color: pendente > 0.005 ? "var(--amber)" : "var(--green)", fontWeight: 600 }}>R$ {fmt(pendente)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="helper-note" style={{ margin: "0 16px 16px" }}>
          "Valor de cada nota" é o valor oficial de cada documento liberado (o mesmo para todos os alunos, cada um tem sua própria escrituração). Como são {alunos.length} aluno(s), cada um deveria aprovar esse valor — por isso "esperado na turma" multiplica pelo número de alunos. "Já aprovado" soma o que todos os alunos já tiveram aprovado. O saldo pendente é a diferença: quanto em R$ ainda falta a turma toda lançar e você aprovar.
        </div>
      </div>

      {alunosInativos.length > 0 && (
        <div className="balance-check bad" style={{ marginBottom: 16 }}>
          ⚠ {alunosInativos.length} aluno(s) sem nenhuma atividade há {DIAS_INATIVIDADE}+ dias: {alunosInativos.map((a) => a.nome).join(", ")}.
        </div>
      )}

      <TabelaPorTipo titulo="Total (Entrada + Saída) — por aluno" documentosDoTipo={documentos} alunos={alunos} progressoTurma={progressoTurma} todos={todos} turma={turma} mostrarSituacao onSelecionarAluno={onSelecionarAluno} onAbrirRelatorio={setAlunoRelatorio} />
      <TabelaPorTipo titulo="Entrada — por aluno" documentosDoTipo={docsEntrada} alunos={alunos} progressoTurma={progressoTurma} todos={todos} turma={turma} onSelecionarAluno={onSelecionarAluno} onAbrirRelatorio={setAlunoRelatorio} />
      <TabelaPorTipo titulo="Saída — por aluno" documentosDoTipo={docsSaida} alunos={alunos} progressoTurma={progressoTurma} todos={todos} turma={turma} onSelecionarAluno={onSelecionarAluno} onAbrirRelatorio={setAlunoRelatorio} />

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h3>Documento mais travado da turma</h3></div>
          <div className="panel-body">
            {documentoMaisTravado ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  Nº {documentoMaisTravado.doc.numero || documentoMaisTravado.doc.id} — {documentoMaisTravado.doc.direcao === "entrada" ? "Entrada" : "Saída"}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 8 }}>
                  {documentoMaisTravado.media}% de conclusão média entre os {alunos.length} aluno(s) — a mais baixa entre as notas liberadas.
                </div>
                <div style={{ height: 7, background: "var(--red-pale)", border: "1px solid var(--line-strong)" }}>
                  <div style={{ height: "100%", width: documentoMaisTravado.media + "%", background: "var(--red)" }} />
                </div>
              </>
            ) : <div className="empty-state">Sem dados suficientes ainda.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Correções por tipo (lançamentos devolvidos)</h3></div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table>
              <tbody>
                {["entrada", "saida"].map((dir) => {
                  const d = correcoesPorTipo?.[dir];
                  const pct = d && d.total > 0 ? Math.round((d.devolvidos / d.total) * 100) : null;
                  return (
                    <tr key={dir}>
                      <td>{dir === "entrada" ? "Entrada" : "Saída"}</td>
                      <td className="num">{d ? `${d.devolvidos} de ${d.total} enviado(s)` : "—"}</td>
                      <td className="num mono" style={{ color: "var(--red)" }}>{pct === null ? "—" : pct + "%"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Apontamentos de análise fiscal por tipo</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th></th><th className="num">Análises enviadas</th><th className="num">Com algo marcado incorreto</th><th className="num">%</th></tr></thead>
            <tbody>
              {["entrada", "saida"].map((dir) => {
                const d = apontamentosPorTipo?.[dir];
                const pct = d && d.enviadas > 0 ? Math.round((d.incorretas / d.enviadas) * 100) : null;
                return (
                  <tr key={dir}>
                    <td>{dir === "entrada" ? "Entrada" : "Saída"}</td>
                    <td className="num mono">{d ? d.enviadas : "—"}</td>
                    <td className="num mono">{d ? d.incorretas : "—"}</td>
                    <td className="num mono">{pct === null ? "—" : pct + "%"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="helper-note" style={{ margin: "0 16px 16px" }}>
          CFOP, NCM ou CST que o aluno marcou como incorreto para a operação, na Análise fiscal — não é erro do aluno, é a contagem do que ele próprio sinalizou.
        </div>
      </div>
    </>
  );
}
