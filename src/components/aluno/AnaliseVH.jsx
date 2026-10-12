import { useMemo, useState } from "react";
import { fmt } from "../../lib/contabil.js";
import { LINHAS_BP, BLOCOS_BP, LINHAS_DRE, totaisBP, dreCompletaDeLinhas, av, ah, fmtPct, fmtPctAH, linhasBalanco, linhasDre } from "../../lib/agb.js";
import { SemDados, AvisoExemplo, AvisoNaoFecha, EstadoGravacao, Abas, MeuCalculo, CaixaTexto, Carregando, useDadosAnalise, useCampos } from "../shared/AgbUI.jsx";

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
      <div className="screen-eyebrow">etapa 5 · análise gerencial de balanços</div>
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
