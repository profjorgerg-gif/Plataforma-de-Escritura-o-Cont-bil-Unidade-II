import { useMemo, useState } from "react";
import { fmt } from "../../lib/contabil.js";
import { LINHAS_BP, BLOCOS_BP, totaisBP, calcularIndicadores, capitalDeGiro, fmtNum, fmtPct } from "../../lib/agb.js";
import { EXERCICIOS } from "../../lib/agbExercicios.js";
import { EstadoGravacao, MeuCalculo, CaixaTexto, Carregando, useCampos } from "../shared/AgbUI.jsx";

// Indicadores-chave usados nos exercícios e no comparativo. "melhor": "maior" ou "menor".
export const INDICADORES_CHAVE = [
  { k: "liquidezCorrente", nome: "Liquidez corrente", tipo: "x", melhor: "maior" },
  { k: "liquidezSeca", nome: "Liquidez seca", tipo: "x", melhor: "maior" },
  { k: "pmr", nome: "Prazo médio de recebimento (PMR)", tipo: "dias", melhor: "menor" },
  { k: "cicloFinanceiro", nome: "Ciclo financeiro", tipo: "dias", melhor: "menor" },
  { k: "participacaoCapTerceiros", nome: "Participação de capitais de terceiros (PCT)", tipo: "pct", melhor: "menor" },
  { k: "imobilizacaoPL", nome: "Imobilização do PL", tipo: "pct", melhor: "menor" },
  { k: "margemLiquida", nome: "Margem líquida", tipo: "pct", melhor: "maior" },
  { k: "giroAtivo", nome: "Giro do ativo", tipo: "x", melhor: "maior" },
  { k: "roe", nome: "ROE (retorno sobre o PL)", tipo: "pct", melhor: "maior" },
];
export function mostrarInd(v, tipo) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  if (tipo === "x") return fmtNum(v, 2);
  if (tipo === "pct") return fmtPct(v * 100, 1);
  if (tipo === "dias") return fmtNum(v, 0) + " dias";
  return "R$ " + fmt(v);
}
const esperadoInd = (v, tipo) => (v === null || v === undefined || !isFinite(v) ? null : tipo === "pct" ? v * 100 : v);
const TOL = { x: 0.015, pct: 0.15, dias: 0.6 };

// Lista das empresas que o aluno pode ver (as liberadas pelo professor; na conta de teste, todas)
export function exerciciosVisiveis(agb, emTeste) {
  const lib = (agb && agb.config && agb.config.exerciciosLiberados) || [];
  return EXERCICIOS.filter((e) => emTeste || lib.includes(e.id));
}

export default function AgbExercicios({ trab, agb, emTeste }) {
  const visiveis = exerciciosVisiveis(agb, emTeste);
  const [sel, setSel] = useState(null);
  const ex = visiveis.find((e) => e.id === sel) || visiveis[0] || null;
  const campos = useCampos(trab, false);
  const ind = useMemo(() => (ex ? calcularIndicadores(ex.bp, ex.dre, 360) : null), [ex]);
  const giro = useMemo(() => (ex ? capitalDeGiro(ex.bp) : null), [ex]);

  if (trab.carregando) return <Carregando />;
  if (!ex) return <div className="empty-state">O professor ainda não liberou nenhum exercício comparativo.</div>;
  const t = totaisBP(ex.bp);
  const sec = ex.id;
  const itensGiro = [
    { k: "cgl", nome: "Capital de giro líquido (CGL)", v: giro.cgl },
    { k: "ncg", nome: "Necessidade de capital de giro (NCG)", v: giro.ncg },
    { k: "st", nome: "Saldo de tesouraria (ST)", v: giro.st },
  ];
  const linhaDre = (n, v, forte) => (
    <tr style={forte ? { fontWeight: 700, background: "var(--paper)" } : null}><td>{n}</td><td className="num mono">{fmt(v)}</td></tr>
  );

  return (
    <>
      <div className="screen-eyebrow">fase 3 · análise gerencial de balanços</div>
      <h2 className="screen-title">Exercícios comparativos</h2>
      <p className="screen-sub">Empresas fictícias, só para treinar e comparar. Nada aqui mexe nos seus lançamentos.</p>
      <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {visiveis.map((e) => (
          <button key={e.id} className={"btn" + (e.id === ex.id ? "" : " secondary")} style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setSel(e.id)}>{e.nome}</button>
        ))}
      </div>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />
      <div className="panel">
        <div className="panel-head"><h3>{ex.nome}</h3></div>
        <div className="panel-body">
          <div><b>Ramo:</b> {ex.ramo}</div>
          <div style={{ color: "var(--ink-soft)" }}>{ex.perfil}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Balanço patrimonial</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Conta</th><th className="num">Exercício atual</th><th className="num">Exercício anterior</th></tr></thead>
            <tbody>
              {["AC", "ANC", "PC", "PNC", "PL"].map((b) => (
                [<tr key={b} style={{ background: "var(--paper)", fontWeight: 700 }}><td colSpan={3}>{BLOCOS_BP[b]}</td></tr>].concat(
                  LINHAS_BP.filter((l) => l.bloco === b && (ex.bp[l.key] || (ex.anterior.bp[l.key]))).map((l) => (
                    <tr key={l.key}><td>{l.nome}</td><td className="num mono">{fmt(ex.bp[l.key] || 0)}</td><td className="num mono">{fmt(ex.anterior.bp[l.key] || 0)}</td></tr>
                  )))
              ))}
              <tr style={{ fontWeight: 700 }}><td>Total do ativo</td><td className="num mono">{fmt(t.ativo)}</td><td className="num mono">{fmt(totaisBP(ex.anterior.bp).ativo)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Demonstração do resultado</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Linha</th><th className="num">Exercício atual</th></tr></thead>
            <tbody>
              {linhaDre("Receita bruta", ex.dre.receitaBruta)}
              {linhaDre("(−) Deduções", ex.dre.deducoes)}
              {linhaDre("Receita líquida", ex.dre.receitaLiquida, true)}
              {linhaDre("(−) CMV / custos", ex.dre.cmv)}
              {linhaDre("Resultado bruto", ex.dre.resultadoBruto, true)}
              {linhaDre("(−) Despesas operacionais", ex.dre.despesasOp)}
              {linhaDre("Resultado financeiro", ex.dre.resultadoFinanceiro)}
              {linhaDre("Resultado do exercício", ex.dre.resultadoExercicio, true)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Indicadores-chave</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Indicador</th><th className="num">Resultado</th><th className="num">Meu cálculo</th></tr></thead>
            <tbody>
              {INDICADORES_CHAVE.map((it) => (
                <tr key={it.k}>
                  <td style={{ fontWeight: 600 }}>{it.nome}</td>
                  <td className="num mono">{mostrarInd(ind[it.k], it.tipo)}</td>
                  <td className="num"><MeuCalculo valor={campos.get(sec, "ind_" + it.k)} esperado={esperadoInd(ind[it.k], it.tipo)} tolerancia={TOL[it.tipo]} onChange={(x) => campos.set(sec, "ind_" + it.k, x)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 18px", fontSize: 12.5, color: "var(--ink-faint)", borderTop: "1px solid var(--line-strong)" }}>
            Prazos calculados com 360 dias. Digite na mesma unidade do resultado (vezes, % ou dias).
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Capital de giro — tipo {giro.tipo.n}: {giro.tipo.nome}</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Item</th><th className="num">R$</th><th className="num">Meu cálculo</th></tr></thead>
            <tbody>
              {itensGiro.map((it) => (
                <tr key={it.k}>
                  <td>{it.nome}</td><td className="num mono">{fmt(it.v)}</td>
                  <td className="num"><MeuCalculo largura={110} valor={campos.get(sec, "giro_" + it.k)} esperado={it.v} tolerancia={0.6} onChange={(x) => campos.set(sec, "giro_" + it.k, x)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 18px", fontSize: 13 }}>{giro.tipo.leitura}</div>
        </div>
      </div>

      <div className="panel"><div className="panel-body">
        <CaixaTexto rotulo={"Minha interpretação — " + ex.nome} valor={campos.get(sec, "interpretacao")} onChange={(v) => campos.set(sec, "interpretacao", v)} linhas={5}
          dica="Em poucas linhas: a empresa está bem? Onde está o ponto fraco? O que você recomendaria?" />
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>O professor consegue ler o que você escreve aqui.</div>
      </div></div>
    </>
  );
}
