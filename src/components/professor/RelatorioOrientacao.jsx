import { useState } from "react";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useProgressoTurma } from "../../hooks/useProgressoTurma.js";
import { prazoEfetivo } from "../../lib/contabil.js";
import { gerarRelatorioOrientacao, relatorioEmTexto } from "../../lib/relatorioOrientacao.js";

// Relatório de orientação por aluno (pedido do professor, 2026-10-08).
// Regras fixas calculadas no navegador (src/lib/relatorioOrientacao.js) — sem
// IA e sem Cloud Functions. Só LÊ os dados; não altera nada do aluno.

// Cores por etapa (opção C aprovada): a cor diz ONDE está o problema; o formato
// da pílula diz a gravidade — cheia (●) = corrigir, só contorno (○) = conferir.
const ETAPAS = {
  dig:   { nome: "Digitação",      n: 3, cor: "#2F5B8C", fundo: "#E3ECF5" },
  ana:   { nome: "Análise fiscal", n: 3, cor: "#6B4A8C", fundo: "#EEE6F5" },
  cla:   { nome: "Classificação",  n: 4, cor: "#1F6F78", fundo: "#DDF0F1" },
  lan:   { nome: "Lançamento",     n: 5, cor: "#7A4B2A", fundo: "#F3E6DA" },
  geral: { nome: "Prazo / geral",  n: 0, cor: "#555555", fundo: "#EAEAEA" },
};
const VERMELHO = "#8C2F2F", AMBAR = "#9C6B1F", VERDE = "#1F5C4A";
const nowrap = { whiteSpace: "nowrap" };

function PilulaGravidade({ g }) {
  const base = { display: "inline-block", padding: "1px 9px", borderRadius: 99, fontSize: 12, fontWeight: 700, ...nowrap };
  return g === "erro"
    ? <span style={{ ...base, background: VERMELHO, color: "#fff" }}>● erro</span>
    : <span style={{ ...base, border: `1.5px solid ${AMBAR}`, background: "#fff", color: AMBAR }}>○ conferir</span>;
}

function EtiquetaEtapa({ etapa }) {
  const e = ETAPAS[etapa] || ETAPAS.geral;
  return <span style={{ background: e.fundo, color: e.cor, padding: "2px 9px", borderRadius: 99, fontSize: 12, fontWeight: 700, ...nowrap }}>{e.n ? `${e.n} · ` : ""}{e.nome}</span>;
}

// "Quem age agora": o aluno ou o professor (ou os dois, na mesma nota).
function QuemAge({ quem }) {
  if (!quem || quem.length === 0) return <span style={{ color: "#999" }}>—</span>;
  const base = { display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 12, fontWeight: 700, marginRight: 4, ...nowrap };
  return (
    <>
      {quem.includes("professor") && <span style={{ ...base, border: `1.5px solid ${VERDE}`, color: VERDE, background: "#fff" }}>🧑‍🏫 Professor</span>}
      {quem.includes("aluno") && <span style={{ ...base, background: VERDE, color: "#fff" }}>👤 Aluno</span>}
    </>
  );
}

const SIT = {
  emdia: <span style={{ background: VERDE, color: "#fff", padding: "1px 9px", borderRadius: 99, fontSize: 12, fontWeight: 700, ...nowrap }}>em dia</span>,
  problema: <b style={{ color: VERMELHO }}>com problema</b>,
  conferir: <b style={{ color: AMBAR }}>conferir</b>,
  aguardando: <span>aguardando correção</span>,
};
const SIMBOLO = {
  ok: <b style={{ color: VERDE }}>✓</b>, no: <b style={{ color: VERMELHO }}>✗</b>,
  wa: <b style={{ color: AMBAR }}>⏳</b>, "-": <span style={{ color: "#aaa" }}>–</span>,
};

function SituacaoPorDocumento({ linhas }) {
  if (!linhas || linhas.length === 0) return null;
  return (
    <>
      <div style={{ fontWeight: 700, margin: "4px 0 6px" }}>Situação por documento</div>
      <table>
        <thead><tr><th>Documento</th><th>Digitação</th><th>Análise</th><th>Classificação</th><th>Lançamento</th><th>Situação</th><th>Quem age agora</th></tr></thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>
              <td className="mono" style={nowrap}>{l.documento}</td>
              <td>{SIMBOLO[l.dig]}</td><td>{SIMBOLO[l.ana]}</td><td>{SIMBOLO[l.cla]}</td><td>{SIMBOLO[l.lan]}</td>
              <td>{SIT[l.situacao]}</td>
              <td><QuemAge quem={l.quem} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 11.5, color: "#666", margin: "6px 0 14px" }}>
        ✓ etapa feita e salva (não significa que está correta) · ✗ com problema · ⏳ aguardando o professor · – ainda não chegou nessa etapa. Ordem: com problema primeiro, em dia por último.
      </div>
    </>
  );
}

// Junta os achados de mesma etapa + gravidade + problema + orientação (uma linha com vários documentos).
function agrupar(achados) {
  const mapa = new Map();
  for (const a of achados) {
    const titulo = a.titulo.replace(/ \(\d+ lançamentos.*\)$/, "");
    const chave = [a.etapa, a.gravidade, titulo, a.orientacao].join("|");
    if (!mapa.has(chave)) mapa.set(chave, { ...a, titulo, docs: [] });
    mapa.get(chave).docs.push(a.documento);
  }
  return [...mapa.values()];
}

function rotuloDocs(docs) {
  const nums = docs.filter((d) => d !== "Geral");
  if (nums.length === 0) return "";
  return (nums.length > 1 ? `${nums.length} notas: ` : "Nota: ") + nums.join(", ").replace(/Nº /g, "").replace(/^/, "Nº ");
}

function TabelaAchados({ achados, quebrarPagina }) {
  const [filtro, setFiltro] = useState("todos");
  const [agrupado, setAgrupado] = useState(true);
  if (achados.length === 0) return <div className="helper-note">Nenhuma pendência encontrada.</div>;
  const etapasPresentes = Object.keys(ETAPAS).filter((k) => achados.some((a) => a.etapa === k));
  const base = filtro === "todos" ? achados : achados.filter((a) => a.etapa === filtro);
  const linhas = agrupado ? agrupar(base) : base.map((a) => ({ ...a, docs: [a.documento] }));
  const chip = (id, rotulo, qtd, cor) => (
    <button key={id} type="button" className="no-print" onClick={() => setFiltro(id)}
      style={{ border: `1.5px solid ${cor}`, background: filtro === id ? cor : "#fff", color: filtro === id ? "#fff" : cor,
        borderRadius: 99, padding: "3px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
      {rotulo} {qtd}
    </button>
  );
  return (
    <div style={quebrarPagina ? { breakBefore: "page" } : undefined}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        O que precisa de ajuste ({achados.length} ocorrência{achados.length > 1 ? "s" : ""}{agrupado ? ` em ${agrupar(achados).length} tipo(s) de problema` : ""})
      </div>
      <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        {etapasPresentes.length > 1 && chip("todos", "Todos", achados.length, "#444")}
        {etapasPresentes.length > 1 && etapasPresentes.map((k) => chip(k, ETAPAS[k].nome, achados.filter((a) => a.etapa === k).length, ETAPAS[k].cor))}
        <button type="button" className="btn secondary" style={{ padding: "3px 10px", fontSize: 12.5, marginLeft: "auto" }} onClick={() => setAgrupado(!agrupado)}>
          {agrupado ? "Mostrar uma linha por nota" : "Agrupar notas iguais"}
        </button>
      </div>
      <table>
        <thead><tr><th style={{ width: 140 }}>Etapa</th><th style={{ width: 80 }}></th>{agrupado ? null : <th style={{ width: 90 }}>Documento</th>}<th>Problema</th><th>O que fazer</th><th>Onde corrigir</th></tr></thead>
        <tbody>
          {linhas.map((a, i) => (
            <tr key={i}>
              <td style={{ verticalAlign: "top" }}><EtiquetaEtapa etapa={a.etapa} /></td>
              <td style={{ verticalAlign: "top" }}><PilulaGravidade g={a.gravidade} /></td>
              {agrupado ? null : <td className="mono" style={{ verticalAlign: "top", ...nowrap }}>{a.documento}</td>}
              <td style={{ verticalAlign: "top" }}>
                <b>{a.titulo}</b>
                {agrupado && rotuloDocs(a.docs) && <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>{rotuloDocs(a.docs)}</div>}
              </td>
              <td style={{ verticalAlign: "top" }}>{a.orientacao}</td>
              <td style={{ fontSize: 12.5, verticalAlign: "top" }}>{a.onde}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Aviso de conta de teste, para o relatório não ser confundido com o de um aluno real.
function EtiquetaTeste() {
  return <span style={{ marginLeft: 8, background: "#FBF1DC", color: AMBAR, border: `1.5px dashed ${AMBAR}`, borderRadius: 99, padding: "1px 9px", fontSize: 12, fontWeight: 700, ...nowrap }}>CONTA DE TESTE</span>;
}

export default function RelatorioOrientacao({ turma }) {
  const turmaId = turma?.id;
  const alunos = useAlunosDaTurma(turmaId);
  const documentos = useDocumentosDaTurma(turmaId);
  const { porMatricula } = useLancamentosDaTurma(turmaId, alunos);
  const progresso = useProgressoTurma(turmaId, alunos);
  const [escolha, setEscolha] = useState("");     // "" | "__turma__" | matrícula
  const [gerado, setGerado] = useState(null);     // { modo: "aluno"|"turma", ... }
  const [copiado, setCopiado] = useState(false);

  if (!turma) {
    return (
      <>
        <div className="screen-eyebrow">relatório de orientação</div>
        <h2 className="screen-title">Relatório de orientação por aluno</h2>
        <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>
      </>
    );
  }
  if (alunos === null || documentos === null) return <div className="empty-state">Carregando…</div>;

  const pronto = (a) =>
    progresso.digitacoesPorMatricula[a.matricula] && progresso.analisesPorMatricula[a.matricula] &&
    progresso.classificacoesPorMatricula[a.matricula] && porMatricula[a.matricula];
  const todosProntos = alunos.every(pronto);

  const relatorioDe = (a) => gerarRelatorioOrientacao({
    aluno: a, documentos,
    digitacoes: progresso.digitacoesPorMatricula[a.matricula] || {},
    analises: progresso.analisesPorMatricula[a.matricula] || {},
    classificacoes: progresso.classificacoesPorMatricula[a.matricula] || [],
    lancamentos: porMatricula[a.matricula] || [],
    prazo: prazoEfetivo(a, turma),
  });

  function gerar() {
    setCopiado(false);
    if (escolha === "__turma__") {
      const linhas = alunos.map(relatorioDe).sort((x, y) => x.aluno.nome.localeCompare(y.aluno.nome));
      setGerado({ modo: "turma", linhas });
    } else {
      const a = alunos.find((x) => x.matricula === escolha);
      if (a) setGerado({ modo: "aluno", rel: relatorioDe(a) });
    }
  }
  function abrirAluno(rel) { setGerado({ modo: "aluno", rel, veioDaTurma: gerado }); setCopiado(false); }

  // O nome do arquivo ao "Salvar como PDF" vem do título da página: troca o
  // título só durante a impressão, para o PDF sair com o nome do aluno.
  function imprimir(titulo) {
    const anterior = document.title;
    // Data e hora (horário local) no nome do arquivo: AAAA-MM-DD_HHhMM
    const d = new Date();
    const dois = (n) => String(n).padStart(2, "0");
    const carimbo = `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}_${dois(d.getHours())}h${dois(d.getMinutes())}`;
    document.title = `${titulo} - ${carimbo}`;
    // Folha A4 deitada (paisagem) só para este relatório: o estilo entra antes de imprimir e sai depois.
    const estilo = document.createElement("style");
    estilo.id = "rel-print-paisagem";
    estilo.textContent = "@page{size:A4 landscape;margin:10mm} thead{display:table-header-group} tr{break-inside:avoid}";
    document.head.appendChild(estilo);
    const restaurar = () => {
      document.title = anterior;
      estilo.remove();
      window.removeEventListener("afterprint", restaurar);
    };
    window.addEventListener("afterprint", restaurar);
    window.print();
  }

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 3000); }
    catch (e) { window.prompt("Não copiou automaticamente — selecione e copie (Ctrl+C):", texto); }
  }
  const textoTurma = (linhas) => linhas.map((r) => relatorioEmTexto(r)).join("\n\n----------\n\n");
  
  return (
    <>
      <style>{"@media screen{.so-impressao{display:none}}"}</style>
      <div className="screen-eyebrow">relatório de orientação</div>
      <h2 className="screen-title">Relatório de orientação por aluno</h2>
      <p className="screen-sub">Aponta o que cada aluno precisa corrigir e o que fazer. Gerado na hora, com os dados atuais.</p>

      <div className="panel no-print">
        <div className="panel-body">
          <div className="grid-2">
            <div className="field">
              <label>Aluno</label>
              <select value={escolha} onChange={(e) => setEscolha(e.target.value)}>
                <option value="">Selecione…</option>
                <option value="__turma__">— Toda a turma (resumo) —</option>
                {[...alunos].sort((a, b) => a.nome.localeCompare(b.nome)).map((a) => <option key={a.matricula} value={a.matricula}>{a.nome}</option>)}
              </select>
            </div>
            <div className="field" style={{ alignSelf: "end" }}>
              <button className="btn" disabled={!escolha || !todosProntos} onClick={gerar}>{todosProntos ? "Gerar relatório" : "Carregando dados…"}</button>
            </div>
          </div>
        </div>
      </div>

      {gerado?.modo === "turma" && (
        <div className="panel">
          <div className="panel-head">
            <h3>Resumo da turma</h3>
            <div className="no-print" style={{ display: "flex", gap: 8 }}>
              <button className="btn secondary" onClick={() => copiar(textoTurma(gerado.linhas))}>{copiado ? "Copiado ✓" : "Copiar tudo"}</button>
              <button className="btn secondary" onClick={() => imprimir("Resumo da turma - Relatório de orientação" + (turma.nome ? " - " + turma.nome : ""))}>Imprimir</button>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table>
              <thead><tr><th>Aluno</th><th className="num">Documentos em dia</th><th className="num">Com o aluno</th><th className="num">Com o professor</th><th className="no-print"></th></tr></thead>
              <tbody>
                {gerado.linhas.map((r) => (
                  <tr key={r.aluno.matricula}>
                    <td>{r.aluno.nome}{r.contaTeste && <EtiquetaTeste />}</td>
                    <td className="num mono">{r.nOk}/{r.total}</td>
                    <td className="num mono">{r.comAluno}</td>
                    <td className="num mono">{r.comProfessor}</td>
                    <td className="no-print">
                      {r.achados.length === 0 && r.comProfessor === 0
                        ? <span className="tag-pill ok">em dia</span>
                        : <button className="btn secondary" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => abrirAluno(r)}>ver relatório</button>}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700, background: "#F6F2E9" }}>
                  <td>Total da turma</td>
                  <td className="num mono">{gerado.linhas.reduce((s, r) => s + r.nOk, 0)}/{gerado.linhas.reduce((s, r) => s + r.total, 0)}</td>
                  <td className="num mono">{gerado.linhas.reduce((s, r) => s + r.comAluno, 0)}</td>
                  <td className="num mono">{gerado.linhas.reduce((s, r) => s + r.comProfessor, 0)}</td>
                  <td className="no-print"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {gerado?.modo === "aluno" && (
        <div className="panel">
          <div className="panel-head">
            <h3>Relatório de orientação — {gerado.rel.aluno.nome}{gerado.rel.contaTeste && <EtiquetaTeste />}</h3>
            <div className="no-print" style={{ display: "flex", gap: 8 }}>
              {gerado.veioDaTurma && <button className="btn secondary" onClick={() => setGerado(gerado.veioDaTurma)}>← Voltar ao resumo</button>}
              <button className="btn secondary" onClick={() => copiar(relatorioEmTexto(gerado.rel))}>{copiado ? "Copiado ✓" : "Copiar texto"}</button>
              <button className="btn secondary" onClick={() => imprimir("Relatório de orientação - " + gerado.rel.aluno.nome)}>Imprimir</button>
            </div>
          </div>
          <div className="panel-body">
            <p className="so-impressao" style={{ margin: "0 0 6px", fontSize: 11, color: "#666" }}>{turma.nome || ""} · emitido em {new Date().toLocaleString("pt-BR")}</p>
            <p style={{ marginTop: 0 }}>Em dia: <b>{gerado.rel.nOk}</b> de <b>{gerado.rel.total}</b> · com o <b>aluno</b>: <b>{gerado.rel.comAluno}</b> · com o <b>professor</b>: <b>{gerado.rel.comProfessor}</b>. Gerado agora, com os dados atuais do aluno.</p>
            <SituacaoPorDocumento linhas={gerado.rel.linhas} />
            <TabelaAchados achados={gerado.rel.achados} quebrarPagina={(gerado.rel.linhas || []).length > 12} />
            <p className="helper-note" style={{ marginBottom: 0 }}>Regras fixas do sistema, sem IA: elas apontam o que dá para detectar sozinho (duplicata, rascunho, histórico genérico, débito ≠ crédito, total diferente do gabarito, etapa faltando). Não avaliam se a conta contábil escolhida é a certa para a operação — isso continua sendo sua correção.</p>
          </div>
        </div>
      )}
    </>
  );
}
