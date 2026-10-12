import { useMemo, useState } from "react";
import { fmt } from "../../lib/contabil.js";
import { capitalDeGiro } from "../../lib/agb.js";
import { SemDados, AvisoExemplo, AvisoNaoFecha, EstadoGravacao, MeuCalculo, CaixaTexto, Carregando, useDadosAnalise, useCampos } from "../shared/AgbUI.jsx";

export default function CapitalGiro({ esc, trab, agb }) {
  const [exemplo, setExemplo] = useState(false);
  const dados = useDadosAnalise(esc, agb.anterior, exemplo);
  const campos = useCampos(trab, exemplo);
  const g = useMemo(() => (dados.semDados ? null : capitalDeGiro(dados.bpv)), [dados]);
  if (trab.carregando) return <Carregando />;

  const itens = g && [
    { k: "aco", nome: "Ativo circulante operacional (ACO)", nota: "clientes, estoques, créditos e despesas antecipadas", v: g.aco, calcula: false },
    { k: "acf", nome: "Ativo circulante financeiro (ACF)", nota: "caixa e equivalentes de caixa", v: g.acf, calcula: false },
    { k: "pco", nome: "Passivo circulante operacional (PCO)", nota: "fornecedores, obrigações trabalhistas, tributos e outras", v: g.pco, calcula: false },
    { k: "pcf", nome: "Passivo circulante financeiro (PCF)", nota: "empréstimos, financiamentos e duplicatas descontadas", v: g.pcf, calcula: false },
    { k: "cgl", nome: "Capital de giro líquido (CGL)", nota: "PL + Passivo não circulante − Ativo não circulante", v: g.cgl, calcula: true },
    { k: "ncg", nome: "Necessidade de capital de giro (NCG)", nota: "ACO − PCO", v: g.ncg, calcula: true },
    { k: "st", nome: "Saldo de tesouraria (ST)", nota: "ACF − PCF (também: CGL − NCG)", v: g.st, calcula: true },
  ];

  return (
    <>
      <div className="screen-eyebrow">fase 3 · análise gerencial de balanços</div>
      <h2 className="screen-title">Capital de giro</h2>
      <p className="screen-sub">Análise dinâmica (modelo Fleuriet): separa o que é da operação do que é financeiro.</p>
      {dados.exemplo && <AvisoExemplo onSair={() => setExemplo(false)} />}
      {dados.semDados ? <SemDados dados={dados} onExemplo={() => setExemplo(true)} /> : (
        <>
          <AvisoNaoFecha dados={dados} />
          {!dados.exemplo && <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />}
          <div className="panel">
            <div className="panel-body" style={{ padding: 0 }}>
              <table>
                <thead><tr><th>Item</th><th>Composição</th><th className="num">R$</th><th className="num">Meu cálculo</th></tr></thead>
                <tbody>
                  {itens.map((it) => (
                    <tr key={it.k} style={it.calcula ? { fontWeight: 700, background: "var(--paper)" } : null}>
                      <td>{it.nome}</td>
                      <td style={{ fontWeight: 400, color: "var(--ink-soft)", fontSize: 13 }}>{it.nota}</td>
                      <td className="num mono">{fmt(it.v)}</td>
                      <td className="num">{it.calcula
                        ? <MeuCalculo largura={110} valor={campos.get("calculos", "giro_" + it.k)} esperado={it.v} tolerancia={0.6} onChange={(x) => campos.set("calculos", "giro_" + it.k, x)} />
                        : <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Situação encontrada: tipo {g.tipo.n} — {g.tipo.nome}</h3></div>
            <div className="panel-body">
              <p style={{ margin: "0 0 8px" }}>{g.tipo.leitura}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-faint)" }}>
                Sinais: CGL {g.cgl >= 0 ? "positivo" : "negativo"} · NCG {g.ncg >= 0 ? "positiva" : "negativa"} · Saldo de tesouraria {g.st >= 0 ? "positivo" : "negativo"}.
              </p>
            </div>
          </div>
          <div className="panel"><div className="panel-body">
            <CaixaTexto rotulo="Minha interpretação — capital de giro" valor={campos.get("interpretacoes", "giro")} onChange={(v) => campos.set("interpretacoes", "giro", v)} linhas={5}
              dica="A empresa financia a operação com recursos de longo prazo ou depende de dívida de curto prazo? Que risco isso traz?" />
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>O professor consegue ler o que você escreve aqui.</div>
          </div></div>
        </>
      )}
    </>
  );
}
