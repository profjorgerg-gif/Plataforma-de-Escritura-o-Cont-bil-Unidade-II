import { useMemo, useState } from "react";
import { fmt } from "../../lib/contabil.js";
import { LINHAS_BP, BLOCOS_BP, LINHAS_DRE, totaisBP, dreCompletaDeLinhas, av, ah, fmtPct, fmtPctAH } from "../../lib/agb.js";
import { SemDados, AvisoExemplo, AvisoNaoFecha, EstadoGravacao, Abas, MeuCalculo, CaixaTexto, Carregando, useDadosAnalise, useCampos } from "../shared/AgbUI.jsx";

// Monta as linhas da tabela do Balanço (com subtotais) para um período.
function linhasBalanco(bpv, bpAnt) {
  const t = totaisBP(bpv);
  const ta = bpAnt ? totaisBP(bpAnt) : null;
  const rows = [];
  const blocos = [["AC", "ATIVO CIRCULANTE", "ativo"], ["ANC", "ATIVO NÃO CIRCULANTE", "ativo"], ["_TA"],
    ["PC", "PASSIVO CIRCULANTE", "pass"], ["PNC", "PASSIVO NÃO CIRCULANTE", "pass"], ["PL", "PATRIMÔNIO LÍQUIDO", "pass"], ["_TP"]];
  blocos.forEach(([b, titulo]) => {
    if (b === "_TA") { rows.push({ tipo: "total", key: "TOTAL_ATIVO", nome: "TOTAL DO ATIVO", atual: t.ativo, ant: ta ? ta.ativo : null, base: "ativo" }); return; }
    if (b === "_TP") { rows.push({ tipo: "total", key: "TOTAL_PASSIVO", nome: "TOTAL DO PASSIVO + PL", atual: t.passivoPL, ant: ta ? ta.passivoPL : null, base: "ativo" }); return; }
    const itens = [];
    LINHAS_BP.filter((l) => l.bloco === b).forEach((l) => {
      const atual = bpv[l.key] || 0, ant = bpAnt ? (Number(bpAnt[l.key]) || 0) : null;
      if (atual === 0 && !ant) return; // oculta linhas sem saldo
      itens.push({ tipo: "linha", key: l.key, nome: l.nome, atual, ant, base: "ativo" });
    });
    if (itens.length === 0 && t[b] === 0 && !(ta && ta[b])) return; // bloco inteiro sem saldo
    rows.push({ tipo: "bloco", nome: titulo }, ...itens);
    rows.push({ tipo: "sub", key: "SUB_" + b, nome: "Total do " + titulo.toLowerCase(), atual: t[b], ant: ta ? ta[b] : null, base: "ativo" });
  });
  return { rows, base: t.ativo, baseAnt: ta ? ta.ativo : null };
}

function linhasDre(dre, dreAnt) {
  const ant = dreAnt ? dreCompletaDeLinhas(dreAnt) : null;
  const rows = LINHAS_DRE.map((l) => ({ tipo: l.tipo === "total" ? "total" : "linha", key: l.key, nome: l.nome, atual: dre[l.key] || 0, ant: ant ? ant[l.key] : null }));
  return { rows, base: dre.receitaLiquida, baseAnt: ant ? ant.receitaLiquida : null };
}

export default function AnaliseVH({ esc, trab, agb }) {
  const [exemplo, setExemplo] = useState(false);
  const dados = useDadosAnalise(esc, agb.anterior, exemplo);
  const campos = useCampos(trab, exemplo);
  const [aba, setAba] = useState("bp");

  const tabela = useMemo(() => {
    if (dados.semDados) return null;
    const ant = dados.anterior;
    return aba === "bp" ? linhasBalanco(dados.bpv, ant && ant.bp) : aba === "dre" ? linhasDre(dados.dre, ant && ant.dre) : null;
  }, [dados, aba]);

  if (agb.anterior === undefined || trab.carregando) return <Carregando />;
  const temAnterior = !!(dados.anterior && (aba === "dre" ? dados.anterior.dre : dados.anterior.bp));

  return (
    <>
      <div className="screen-eyebrow">fase 3 · análise gerencial de balanços</div>
      <h2 className="screen-title">Análise vertical e horizontal</h2>
      <p className="screen-sub">Calculada a partir dos <b>seus lançamentos aprovados</b>. Você faz a conta, o sistema confere.</p>
      {dados.exemplo && <AvisoExemplo onSair={() => setExemplo(false)} />}
      {dados.semDados ? <SemDados dados={dados} onExemplo={() => setExemplo(true)} /> : (
        <>
          <AvisoNaoFecha dados={dados} />
          {!dados.exemplo && <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />}
          <Abas abas={[{ key: "bp", label: "Balanço Patrimonial" }, { key: "dre", label: "DRE" }, { key: "int", label: "Interpretação" }]} ativa={aba} onChange={setAba} />
          {aba !== "int" && tabela && (
            <div className="panel">
              <div className="panel-head">
                <h3>{aba === "bp" ? "Balanço" : "DRE"} — atual × anterior</h3>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                  AV = linha ÷ {aba === "bp" ? "total do Ativo" : "receita líquida"} · AH = (atual ÷ anterior − 1)
                </span>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Conta</th><th className="num">Atual (R$)</th><th className="num">AV %</th>
                      {temAnterior && <><th className="num">Anterior (R$)</th><th className="num">AH %</th></>}
                      <th className="num">Meu cálculo AV</th>
                      {temAnterior && <th className="num">Meu cálculo AH</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tabela.rows.map((r, i) => {
                      if (r.tipo === "bloco") return <tr key={i}><td colSpan={temAnterior ? 7 : 4} style={{ fontWeight: 700, color: "var(--green-dark)", background: "var(--paper-deep)" }}>{r.nome}</td></tr>;
                      const vAv = av(r.atual, tabela.base);
                      const vAh = temAnterior ? ah(r.atual, r.ant) : null;
                      const forte = r.tipo !== "linha";
                      const ck = aba + "_" + r.key;
                      return (
                        <tr key={i} style={forte ? { fontWeight: 700, background: "var(--paper)" } : null}>
                          <td>{r.nome}</td>
                          <td className="num mono">{fmt(r.atual)}</td>
                          <td className="num mono">{fmtPct(vAv)}</td>
                          {temAnterior && <><td className="num mono">{r.ant === null ? "—" : fmt(r.ant)}</td><td className="num mono">{fmtPctAH(vAh)}</td></>}
                          <td className="num"><MeuCalculo valor={campos.get("av", ck)} esperado={vAv} onChange={(v) => campos.set("av", ck, v)} /></td>
                          {temAnterior && <td className="num"><MeuCalculo valor={campos.get("ah", ck)} esperado={vAh} onChange={(v) => campos.set("ah", ck, v)} /></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding: "10px 18px", fontSize: 12.5, color: "var(--ink-faint)", borderTop: "1px solid var(--line-strong)" }}>
                  {temAnterior
                    ? "Período anterior cadastrado pelo professor (" + (dados.anterior.rotulo || "exercício anterior") + "). Linhas sem saldo nos dois períodos ficam ocultas."
                    : "O professor ainda não cadastrou o período anterior; por isso a análise horizontal (AH) ainda não aparece. A vertical (AV) já está disponível."}
                  {" "}Confira: aceita vírgula ou ponto; diferença de até 0,15 ponto conta como certa.
                </div>
              </div>
            </div>
          )}
          {aba === "int" && (
            <div className="panel"><div className="panel-body">
              <CaixaTexto rotulo="Análise vertical — o que a composição do Balanço e da DRE mostra? (onde está concentrado o Ativo? quanto da receita sobra no fim?)" valor={campos.get("interpretacoes", "av")} onChange={(v) => campos.set("interpretacoes", "av", v)} linhas={5} />
              <CaixaTexto rotulo="Análise horizontal — o que cresceu ou diminuiu em relação ao período anterior, e por quê?" valor={campos.get("interpretacoes", "ah")} onChange={(v) => campos.set("interpretacoes", "ah", v)} linhas={5} />
              <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>O professor consegue ler o que você escreve aqui.</div>
            </div></div>
          )}
        </>
      )}
    </>
  );
}
