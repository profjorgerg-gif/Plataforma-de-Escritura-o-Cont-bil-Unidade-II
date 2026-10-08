import { useState } from "react";
import { useEscrituracao } from "../../hooks/useEscrituracao.js";
import { useProgressoAluno } from "../../hooks/useProgressoAluno.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { contaInfo, fmt } from "../../lib/contabil.js";
import { StatusBadge } from "../shared/UI.jsx";

// Pedido do professor (2026-10-02): durante a aula, acompanhar o que cada
// aluno já fez em cada documento ANTES de o lançamento chegar na Fila de
// correção — digitação e análise fiscal já salvas, mesmo como rascunho,
// ficam visíveis aqui assim que o aluno salva (useProgressoAluno usa
// onSnapshot, então atualiza sozinho, sem precisar recarregar a página).

function Marca({ feito }) {
  return feito ? <span style={{ color: "var(--green)" }}>✓</span> : <span style={{ color: "var(--ink-faint)" }}>—</span>;
}

function PainelDigitacao({ digitacao }) {
  if (!digitacao) return <div className="helper-note">O aluno ainda não salvou a digitação deste documento.</div>;
  const somaItens = (digitacao.itens || []).reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valorUnit) || 0), 0);
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="grid-2" style={{ marginBottom: 10 }}>
        <div className="field"><label>Número / série</label><div className="mono">{digitacao.numero || "—"} / {digitacao.serie || "—"}</div></div>
        <div className="field"><label>Data de emissão</label><div className="mono">{digitacao.data || "—"}</div></div>
        <div className="field"><label>Natureza digitada</label><div>{digitacao.natureza || "—"}</div></div>
        <div className="field"><label>CFOP digitado</label><div className="mono">{digitacao.cfop || "—"}</div></div>
      </div>
      {(digitacao.itens || []).length > 0 && (
        <table style={{ marginBottom: 10 }}>
          <thead><tr><th>Descrição</th><th>NCM</th><th>CST</th><th>CFOP</th><th className="num">Qtd.</th><th className="num">V. unit.</th></tr></thead>
          <tbody>
            {digitacao.itens.map((it, i) => (
              <tr key={i}>
                <td>{it.descricao}</td><td className="mono">{it.ncm}</td><td className="mono">{it.cst}</td><td className="mono">{it.cfop}</td>
                <td className="num mono">{it.qtd}</td><td className="num mono">{fmt(Number(it.valorUnit) || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
        soma dos itens digitados: R$ {fmt(somaItens)} · total digitado: R$ {fmt(Number(digitacao.total) || 0)}
      </div>
    </div>
  );
}

function PainelAnalise({ analise }) {
  if (!analise) return <div className="helper-note">O aluno ainda não salvou a análise fiscal deste documento.</div>;
  return (
    <div className="grid-2" style={{ marginBottom: 14 }}>
      <div className="field"><label>CFOP está correto?</label><div>{analise.cfopCorreto || "—"}{analise.cfopSugerido ? " (sugerido: " + analise.cfopSugerido + ")" : ""}</div></div>
      <div className="field"><label>NCM está correto?</label><div>{analise.ncmCorreto || "—"}</div></div>
      <div className="field"><label>CST está correto?</label><div>{analise.cstCorreto || "—"}</div></div>
      <div className="field"><label>Status</label><div><StatusBadge status={analise.status === "enviado" ? "aprovado" : "rascunho"} /></div></div>
      <div className="field" style={{ gridColumn: "1 / -1" }}><label>Justificativa</label><div>{analise.justificativa || "—"}</div></div>
    </div>
  );
}

function PainelClassificacoes({ classificacoes, contas }) {
  if (classificacoes.length === 0) return <div className="helper-note">Nenhuma classificação registrada para este documento.</div>;
  return (
    <table style={{ marginBottom: 14 }}>
      <thead><tr><th>Fato</th><th>Débito</th><th>Crédito</th><th className="num">Valor</th><th>Histórico</th></tr></thead>
      <tbody>
        {classificacoes.map((c) => (
          <tr key={c.id}>
            <td>{c.fato}</td>
            <td className="mono">{c.contaDebito} — {contaInfo(c.contaDebito, contas)?.nome || ""}</td>
            <td className="mono">{c.contaCredito} — {contaInfo(c.contaCredito, contas)?.nome || ""}</td>
            <td className="num mono">{fmt(c.valor)}</td>
            <td>{c.historico}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PainelLancamentos({ lancamentos, contas }) {
  if (lancamentos.length === 0) return <div className="helper-note">O aluno ainda não lançou este documento no Livro diário.</div>;
  return lancamentos.map((l) => (
    <div className="panel" key={l.id} style={{ background: "var(--paper-deep)", marginBottom: 10 }}>
      <div className="panel-head">
        <h4 style={{ margin: 0 }}>{l.data} — {l.historico}</h4>
        <StatusBadge status={l.status} />
      </div>
      <div className="panel-body">
        <table>
          <thead><tr><th>Conta</th><th className="num">Débito</th><th className="num">Crédito</th></tr></thead>
          <tbody>
            {l.partidas.map((p, i) => (
              <tr key={i}>
                <td className="mono">{p.conta} — {contaInfo(p.conta, contas)?.nome || ""}</td>
                <td className="num mono">{p.tipo === "D" ? fmt(p.valor) : ""}</td>
                <td className="num mono">{p.tipo === "C" ? fmt(p.valor) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {l.obsCorrecao && (
          <div className="helper-note" style={{ marginTop: 10 }}>
            <b>Observação de correção enviada ao aluno: </b>{l.obsCorrecao}
          </div>
        )}
      </div>
    </div>
  ));
}

function PainelDocumento({ documento, digitacao, analise, classificacoes, lancamentos, contas, aberto, onToggle }) {
  const digitado = !!digitacao;
  const analisado = analise?.status === "enviado";
  const classificado = classificacoes.length > 0;
  const lancado = lancamentos.length > 0;

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head" style={{ cursor: "pointer" }} onClick={onToggle}>
        <div>
          <h3 style={{ margin: 0 }}>Nº {documento.numero} — {documento.direcao === "entrada" ? "Entrada" : "Saída"}</h3>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>
            <Marca feito={digitado} /> 1. digitação &nbsp; <Marca feito={analisado} /> 2. análise fiscal &nbsp; <Marca feito={classificado} /> 3. classificação &nbsp; <Marca feito={lancado} /> 4. lançamento
          </div>
        </div>
        <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>{aberto ? "▲ ocultar" : "▼ ver detalhes"}</span>
      </div>
      {aberto && (
        <div className="panel-body">
          <h4 style={{ marginTop: 0 }}>1. Digitação da NF-e</h4>
          <PainelDigitacao digitacao={digitacao} />
          <h4>2. Análise fiscal</h4>
          <PainelAnalise analise={analise} />
          <h4>3. Classificação contábil</h4>
          <PainelClassificacoes classificacoes={classificacoes} contas={contas} />
          <h4>4. Lançamento(s) no Livro diário</h4>
          <PainelLancamentos lancamentos={lancamentos} contas={contas} />
        </div>
      )}
    </div>
  );
}

export default function HistoricoAluno({ turmaId, alunoSelecionado, onVoltarParaTurmas }) {
  const { carregando, lancamentos, contas } = useEscrituracao(turmaId, alunoSelecionado?.matricula);
  const { digitacoes, analises, classificacoes } = useProgressoAluno(turmaId, alunoSelecionado?.matricula);
  const documentos = useDocumentosDaTurma(turmaId);
  const [abertos, setAbertos] = useState({}); // documentoId -> bool

  if (!alunoSelecionado) {
    return (
      <>
        <div className="screen-eyebrow">histórico do aluno</div>
        <h2 className="screen-title">Histórico de lançamentos</h2>
        <div className="empty-state">Selecione um aluno na tela Turmas para ver o histórico dele.</div>
      </>
    );
  }
  const carregandoTudo = carregando || digitacoes === null || analises === null || classificacoes === null || documentos === null;
  if (carregandoTudo) return <div className="empty-state">Carregando…</div>;

  function toggle(id) { setAbertos((prev) => ({ ...prev, [id]: !prev[id] })); }

  // Lançamentos que não batem com nenhum documento liberado atualmente para
  // a turma (ex.: documento removido do catálogo depois do lançamento feito)
  // ainda aparecem, numa seção separada, para não sumir nada do histórico.
  const idsDocumentos = new Set(documentos.map((d) => d.id));
  const lancamentosOrfaos = lancamentos.filter((l) => !l.documento || !idsDocumentos.has(l.documento));

  return (
    <>
      <div className="screen-eyebrow">histórico do aluno</div>
      <div className="btn-row no-print" style={{ marginBottom: 10 }}>
        <button className="btn secondary" onClick={onVoltarParaTurmas}>← Voltar para Turmas (escolher outro aluno)</button>
      </div>
      <h2 className="screen-title">Acompanhamento — {alunoSelecionado.nome}</h2>
      <p className="screen-sub">
        Progresso da empresa didática deste aluno em cada documento fiscal liberado para a turma — digitação e análise
        fiscal aparecem aqui assim que o aluno salva, mesmo como rascunho e antes de qualquer lançamento chegar na
        Fila de correção.
      </p>
      <div className="aviso-pedagogico">
        <b>O que você pode fazer aqui:</b> só consultar — digitação, análise fiscal, classificação e lançamento, nas quatro
        etapas. Esta tela não tem aprovar/devolver; correção de verdade (com observação para o aluno) só existe no
        lançamento, em <b>Fila de correção</b>.
      </div>

      {documentos.length === 0 && (
        <div className="panel"><div className="empty-state">Nenhum documento fiscal liberado para esta turma ainda.</div></div>
      )}

      {documentos.map((d) => (
        <PainelDocumento
          key={d.id}
          documento={d}
          digitacao={digitacoes[d.id]}
          analise={analises[d.id]}
          classificacoes={classificacoes.filter((c) => c.documento === d.id)}
          lancamentos={lancamentos.filter((l) => l.documento === d.id)}
          contas={contas}
          aberto={!!abertos[d.id]}
          onToggle={() => toggle(d.id)}
        />
      ))}

      {lancamentosOrfaos.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head"><h3>Outros lançamentos (sem documento liberado correspondente)</h3></div>
          <div className="panel-body">
            <PainelLancamentos lancamentos={lancamentosOrfaos} contas={contas} />
          </div>
        </div>
      )}
    </>
  );
}
