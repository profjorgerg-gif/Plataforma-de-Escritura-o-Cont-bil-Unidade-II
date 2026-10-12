import { useMemo, useState } from "react";
import { balancoPorLinhas, dreParaLinhas, totaisBP, confere } from "../../lib/agb.js";
import { EXEMPLO_BP, EXEMPLO_DRE, EXEMPLO_ANTERIOR } from "../../lib/agbExemplo.js";

// ---- Dados para a análise: lançamentos APROVADOS (via useEscrituracao) ou o exemplo fictício ----
export function useDadosAnalise(esc, anteriorTurma, usarExemplo) {
  return useMemo(() => {
    const aprovados = (esc.lancamentos || []).filter((l) => l.status === "aprovado").length;
    const aguardando = (esc.lancamentos || []).filter((l) => l.status === "enviado" || l.status === "correcao").length;
    if (usarExemplo) {
      return { exemplo: true, semDados: false, aprovados, aguardando, bpv: EXEMPLO_BP, dre: EXEMPLO_DRE, anterior: EXEMPLO_ANTERIOR, fecha: true };
    }
    if (!esc.bp || !esc.dre || aprovados === 0) {
      return { exemplo: false, semDados: true, aprovados, aguardando, bpv: null, dre: null, anterior: anteriorTurma || null, fecha: false };
    }
    const { valores } = balancoPorLinhas(esc.bp);
    return { exemplo: false, semDados: false, aprovados, aguardando, bpv: valores, dre: esc.dre, anterior: anteriorTurma || null, fecha: esc.bp.fecha };
  }, [esc.lancamentos, esc.bp, esc.dre, anteriorTurma, usarExemplo]);
}

// ---- Estado vazio (com botão de exemplo) ----
export function SemDados({ dados, onExemplo }) {
  return (
    <div className="panel">
      <div className="empty-state">
        Ainda não há lançamentos aprovados para analisar.<br />
        A análise aparece assim que o professor aprovar seus lançamentos no Livro diário.<br />
        <span style={{ fontSize: 12.5 }}>Você tem <b>{dados.aprovados}</b> aprovados e <b>{dados.aguardando}</b> aguardando correção ou aprovação.</span>
        <div style={{ marginTop: 14 }}>
          <button className="btn secondary" onClick={onExemplo}>Ver como fica, com dados de exemplo</button>
        </div>
      </div>
    </div>
  );
}

export function AvisoExemplo({ onSair }) {
  return (
    <div className="balance-check bad no-print" style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span><b>DADOS DE EXEMPLO</b> (empresa fictícia). Não são os seus dados e nada é gravado.</span>
      <button className="btn secondary" onClick={onSair}>Voltar aos meus dados</button>
    </div>
  );
}

export function AvisoNaoFecha({ dados }) {
  if (dados.exemplo || dados.semDados || dados.fecha) return null;
  return (
    <div className="balance-check bad" style={{ marginBottom: 14 }}>
      Atenção: com os lançamentos aprovados até agora o Balanço ainda não fecha (Ativo ≠ Passivo + PL). A análise abaixo usa o que está aprovado e pode mudar quando você concluir os demais lançamentos.
    </div>
  );
}

// ---- Estado de gravação (sempre visível) ----
export function EstadoGravacao({ estado, salvoEm, erroMsg, onSalvar }) {
  const hora = salvoEm ? salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
  let txt, cls;
  if (estado === "erro") { txt = "✗ NÃO foi salvo — " + (erroMsg || "tente de novo"); cls = "bad"; }
  else if (estado === "salvando") { txt = "Salvando…"; cls = "warn"; }
  else if (estado === "pendente") { txt = "Alterações ainda não salvas…"; cls = "warn"; }
  else { txt = hora ? "✓ Salvo às " + hora : "✓ Tudo salvo"; cls = "ok"; }
  return (
    <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
      <span className={"tag-pill " + cls}>{txt}</span>
      <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={onSalvar}>Salvar agora</button>
    </div>
  );
}

// ---- Abas simples ----
export function Abas({ abas, ativa, onChange }) {
  return (
    <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      {abas.map((a) => (
        <button key={a.key} className={"btn" + (ativa === a.key ? "" : " secondary")} style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onChange(a.key)}>{a.label}</button>
      ))}
    </div>
  );
}

// ---- "Meu cálculo": o aluno calcula, o sistema confere ----
export function MeuCalculo({ valor, esperado, onChange, tolerancia = 0.15, largura = 84, desabilitado }) {
  const r = valor ? confere(valor, esperado, tolerancia) : null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
      <input
        className="mono" inputMode="decimal" value={valor || ""} disabled={desabilitado}
        onChange={(e) => onChange(e.target.value)} placeholder="seu valor"
        style={{ width: largura, padding: "4px 6px", textAlign: "right", border: "1px solid var(--line-strong)", background: "#fff", fontSize: 13 }}
      />
      <span style={{ width: 16, color: r === true ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{r === true ? "✓" : r === false ? "✗" : ""}</span>
    </span>
  );
}

export function CaixaTexto({ rotulo, valor, onChange, linhas = 4, dica }) {
  return (
    <div className="field">
      <label>{rotulo}</label>
      <textarea rows={linhas} value={valor || ""} onChange={(e) => onChange(e.target.value)} placeholder={dica || "Escreva com suas palavras…"} />
    </div>
  );
}

export function Carregando({ texto = "Carregando…" }) { return <div className="empty-state">{texto}</div>; }

export { totaisBP, dreParaLinhas };
export function useExemplo() { return useState(false); }

// Leitura/gravação dos campos do aluno; no modo exemplo fica só na memória (não grava nada).
export function useCampos(trab, exemplo) {
  const [local, setLocal] = useState({});
  const get = (secao, chave) => (exemplo ? (local[secao] || {})[chave] : ((trab.dados || {})[secao] || {})[chave]) || "";
  const set = (secao, chave, valor) => {
    if (exemplo) setLocal((l) => ({ ...l, [secao]: { ...(l[secao] || {}), [chave]: valor } }));
    else trab.setCampo(secao, chave, valor);
  };
  return { get, set };
}
