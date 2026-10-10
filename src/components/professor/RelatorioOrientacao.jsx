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
const VERMELHO = "#8C2F2F", AMBAR = "#9C6B1F";

function PilulaGravidade({ g }) {
  const erro = g === "erro";
  const cor = erro ? VERMELHO : AMBAR;
  const base = { display: "inline-block", padding: "1px 9px", borderRadius: 99, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", color: cor };
  return erro
    ? <span style={{ ...base, background: VERMELHO, color: "#fff" }}>● corrigir</span>
    : <span style={{ ...base, border: `1.5px solid ${AMBAR}`, background: "#fff" }}>○ conferir</span>;
}

function TabelaAchados({ achados }) {
  const [filtro, setFiltro] = useState("todos");
  if (achados.length === 0) return <div className="helper-note">Nenhuma pendência encontrada.</div>;
  const etapasPresentes = Object.keys(ETAPAS).filter((k) => achados.some((a) => a.etapa === k));
  const lista = filtro === "todos" ? achados : achados.filter((a) => a.etapa === filtro);
  const chip = (id, rotulo, qtd, cor) => (
    <button key={id} type="button" className="no-print" onClick={() => setFiltro(id)}
      style={{ border: `1.5px solid ${cor}`, background: filtro === id ? cor : "#fff", color: filtro === id ? "#fff" : cor,
        borderRadius: 99, padding: "3px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
      {rotulo} {qtd}
    </button>
  );
  return (
    <>
      {etapasPresentes.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {chip("todos", "Todos", achados.length, "#444")}
          {etapasPresentes.map((k) => chip(k, ETAPAS[k].nome, achados.filter((a) => a.etapa === k).length, ETAPAS[k].cor))}
        </div>
      )}
      <table>
        <thead><tr><th>Etapa</th><th></th><th>Documento</th><th>Problema</th><th>O que o aluno deve fazer</th><th>Onde corrigir</th></tr></thead>
        <tbody>
          {lista.map((a, i) => {
            const e = ETAPAS[a.etapa] || ETAPAS.geral;
            return (
              <tr key={i}>
                <td style={{ borderLeft: `5px solid ${e.cor}` }}>
                  <span style={{ background: e.fundo, color: e.cor, padding: "2px 9px", borderRadius: 99, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {e.n ? `${e.n} · ` : ""}{e.nome}
                  </span>
                </td>
                <td><PilulaGravidade g={a.gravidade} /></td>
                <td className="mono">{a.documento}</td>
                <td>{a.titulo}</td>
                <td>{a.orientacao}</td>
                <td style={{ fontSize: 12.5 }}>{a.onde}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
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
    const restaurar = () => { document.title = anterior; window.removeEventListener("afterprint", restaurar); };
    window.addEventListener("afterprint", restaurar);
    window.print();
  }

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 3000); }
    catch (e) { window.prompt("Não copiou automaticamente — selecione e copie (Ctrl+C):", texto); }
  }
  const textoTurma = (linhas) => linhas.map((r) => relatorioEmTexto(r)).join("\n\n----------\n\n");
  const conta = (rel, g) => rel.achados.filter((a) => a.gravidade === g).length;

  return (
    <>
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
              <thead><tr><th>Aluno</th><th className="num">Documentos em dia</th><th className="num">Corrigir</th><th className="num">Conferir</th><th className="no-print"></th></tr></thead>
              <tbody>
                {gerado.linhas.map((r) => (
                  <tr key={r.aluno.matricula}>
                    <td>{r.aluno.nome}</td>
                    <td className="num mono">{r.nOk}/{r.total}</td>
                    <td className="num mono">{conta(r, "erro")}</td>
                    <td className="num mono">{conta(r, "atencao")}</td>
                    <td className="no-print">
                      {r.achados.length === 0
                        ? <span className="tag-pill ok">em dia</span>
                        : <button className="btn secondary" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => abrirAluno(r)}>ver relatório</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {gerado?.modo === "aluno" && (
        <div className="panel">
          <div className="panel-head">
            <h3>Relatório de orientação — {gerado.rel.aluno.nome}</h3>
            <div className="no-print" style={{ display: "flex", gap: 8 }}>
              {gerado.veioDaTurma && <button className="btn secondary" onClick={() => setGerado(gerado.veioDaTurma)}>← Voltar ao resumo</button>}
              <button className="btn secondary" onClick={() => copiar(relatorioEmTexto(gerado.rel))}>{copiado ? "Copiado ✓" : "Copiar texto"}</button>
              <button className="btn secondary" onClick={() => imprimir("Relatório de orientação - " + gerado.rel.aluno.nome)}>Imprimir</button>
            </div>
          </div>
          <div className="panel-body">
            <p style={{ marginTop: 0 }}>Documentos em dia: <b>{gerado.rel.nOk}</b> de <b>{gerado.rel.total}</b>. Gerado agora, com os dados atuais do aluno.</p>
            <TabelaAchados achados={gerado.rel.achados} />
            <p className="helper-note" style={{ marginBottom: 0 }}>Regras fixas do sistema, sem IA: elas apontam o que dá para detectar sozinho (duplicata, rascunho, histórico genérico, débito ≠ crédito, total diferente do gabarito, etapa faltando). Não avaliam se a conta contábil escolhida é a certa para a operação — isso continua sendo sua correção.</p>
          </div>
        </div>
      )}
    </>
  );
}
