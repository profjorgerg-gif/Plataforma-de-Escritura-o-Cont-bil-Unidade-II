import { useMemo, useState } from "react";
import { fmt } from "../../lib/contabil.js";
import { calcularIndicadores, fmtNum, fmtPct } from "../../lib/agb.js";
import { SemDados, AvisoExemplo, AvisoNaoFecha, EstadoGravacao, Abas, MeuCalculo, CaixaTexto, Carregando, useDadosAnalise, useCampos } from "../shared/AgbUI.jsx";

// tipo: "x" (vezes), "pct" (valor × 100), "dias", "rs"
const GRUPOS = [
  { key: "liquidez", label: "Liquidez", itens: [
    { k: "liquidezCorrente", nome: "Liquidez corrente", formula: "Ativo circulante ÷ Passivo circulante", tipo: "x" },
    { k: "liquidezSeca", nome: "Liquidez seca", formula: "(Ativo circulante − Estoques − Desp. antecipadas) ÷ Passivo circulante", tipo: "x" },
    { k: "liquidezGeral", nome: "Liquidez geral", formula: "(AC + Realizável a LP) ÷ (PC + PNC)", tipo: "x" },
    { k: "liquidezImediata", nome: "Liquidez imediata", formula: "Caixa e equivalentes ÷ Passivo circulante", tipo: "x" },
    { k: "ccl", nome: "Capital circulante líquido", formula: "Ativo circulante − Passivo circulante", tipo: "rs" },
  ] },
  { key: "prazos", label: "Prazos e ciclo", itens: [
    { k: "pme", nome: "Prazo médio de estocagem (PME)", formula: "Estoques ÷ CMV × dias", tipo: "dias" },
    { k: "pmr", nome: "Prazo médio de recebimento (PMR)", formula: "Clientes ÷ Receita bruta × dias", tipo: "dias" },
    { k: "pmp", nome: "Prazo médio de pagamento (PMP)", formula: "Fornecedores ÷ CMV × dias (compras ≈ CMV)", tipo: "dias" },
    { k: "cicloOperacional", nome: "Ciclo operacional", formula: "PME + PMR", tipo: "dias" },
    { k: "cicloFinanceiro", nome: "Ciclo financeiro", formula: "Ciclo operacional − PMP", tipo: "dias" },
  ] },
  { key: "estrutura", label: "Estrutura de capitais", itens: [
    { k: "participacaoCapTerceiros", nome: "Participação de capitais de terceiros (PCT)", formula: "(PC + PNC) ÷ Patrimônio líquido", tipo: "pct" },
    { k: "composicaoEndividamento", nome: "Composição do endividamento (CE)", formula: "PC ÷ (PC + PNC)", tipo: "pct" },
    { k: "imobilizacaoPL", nome: "Imobilização do PL (IPL)", formula: "(Investimentos + Imobilizado + Intangível) ÷ PL", tipo: "pct" },
    { k: "imobilizacaoRecNaoCorr", nome: "Imob. dos recursos não correntes (IRNC)", formula: "(Investimentos + Imobilizado + Intangível) ÷ (PL + PNC)", tipo: "pct" },
  ] },
  { key: "rentabilidade", label: "Rentabilidade", itens: [
    { k: "margemBruta", nome: "Margem bruta", formula: "Resultado bruto ÷ Receita líquida", tipo: "pct" },
    { k: "margemOperacional", nome: "Margem operacional", formula: "(Resultado bruto − Desp. operacionais) ÷ Receita líquida", tipo: "pct" },
    { k: "margemLiquida", nome: "Margem líquida", formula: "Resultado do exercício ÷ Receita líquida", tipo: "pct" },
    { k: "giroAtivo", nome: "Giro do ativo", formula: "Receita líquida ÷ Ativo total", tipo: "x" },
    { k: "roi", nome: "ROI (retorno sobre o ativo)", formula: "Resultado do exercício ÷ Ativo total", tipo: "pct" },
    { k: "roe", nome: "ROE (retorno sobre o PL)", formula: "Resultado do exercício ÷ Patrimônio líquido", tipo: "pct" },
    { k: "alavancagem", nome: "Grau de alavancagem financeira", formula: "ROE ÷ ROI", tipo: "x" },
  ] },
];

function mostrar(v, tipo) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  if (tipo === "x") return fmtNum(v, 2);
  if (tipo === "pct") return fmtPct(v * 100, 1);
  if (tipo === "dias") return fmtNum(v, 0) + " dias";
  return "R$ " + fmt(v);
}
// valor que o aluno deve digitar (mesma unidade mostrada)
function esperado(v, tipo) {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return tipo === "pct" ? v * 100 : v;
}
const TOLERANCIA = { x: 0.015, pct: 0.15, dias: 0.6, rs: 0.6 };

export default function Indicadores({ esc, trab, agb }) {
  const [exemplo, setExemplo] = useState(false);
  const dados = useDadosAnalise(esc, agb.anterior, exemplo);
  const campos = useCampos(trab, exemplo);
  const [aba, setAba] = useState("liquidez");
  const diasTxt = campos.get("config", "dias");
  const dias = diasTxt === "365" ? 365 : 360;
  const ind = useMemo(() => (dados.semDados ? null : calcularIndicadores(dados.bpv, dados.dre, dias)), [dados, dias]);

  if (trab.carregando) return <Carregando />;
  const grupo = GRUPOS.find((g) => g.key === aba);

  return (
    <>
      <div className="screen-eyebrow">etapa 5 · análise gerencial de balanços</div>
      <h2 className="screen-title">Indicadores</h2>
      <p className="screen-sub">Liquidez, prazos, estrutura de capitais e rentabilidade, calculados do Balanço e da DRE <b>aprovados</b>. Calcule você mesmo e confira.</p>
      {dados.exemplo && <AvisoExemplo onSair={() => setExemplo(false)} />}
      {dados.semDados ? <SemDados dados={dados} onExemplo={() => setExemplo(true)} /> : (
        <>
          <AvisoNaoFecha dados={dados} />
          {!dados.exemplo && <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />}
          <Abas abas={GRUPOS.map((g) => ({ key: g.key, label: g.label }))} ativa={aba} onChange={setAba} />
          {aba === "prazos" && (
            <div className="field no-print" style={{ maxWidth: 260 }}>
              <label>Base de dias do período</label>
              <select value={String(dias)} onChange={(e) => campos.set("config", "dias", e.target.value)}>
                <option value="360">360 dias (ano comercial)</option>
                <option value="365">365 dias (ano civil)</option>
              </select>
            </div>
          )}
          <div className="panel">
            <div className="panel-body" style={{ padding: 0 }}>
              <table>
                <thead><tr><th>Indicador</th><th>Como se calcula</th><th className="num">Resultado</th><th className="num">Meu cálculo</th></tr></thead>
                <tbody>
                  {grupo.itens.map((it) => {
                    const v = ind[it.k];
                    return (
                      <tr key={it.k}>
                        <td style={{ fontWeight: 600 }}>{it.nome}</td>
                        <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{it.formula}</td>
                        <td className="num mono">{mostrar(v, it.tipo)}</td>
                        <td className="num"><MeuCalculo valor={campos.get("calculos", "ind_" + it.k)} esperado={esperado(v, it.tipo)} tolerancia={TOLERANCIA[it.tipo]} onChange={(x) => campos.set("calculos", "ind_" + it.k, x)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: "10px 18px", fontSize: 12.5, color: "var(--ink-faint)", borderTop: "1px solid var(--line-strong)" }}>
                Digite na mesma unidade do resultado (vezes, % ou dias). Indicadores sem dado suficiente aparecem como “—”.
              </div>
            </div>
          </div>
          <div className="panel"><div className="panel-body">
            <CaixaTexto
              rotulo={"Minha interpretação — " + grupo.label}
              valor={campos.get("interpretacoes", "ind_" + aba)}
              onChange={(v) => campos.set("interpretacoes", "ind_" + aba, v)}
              linhas={5}
              dica="Explique o que os números significam para esta empresa: está bem ou mal? por quê? o que você recomendaria?"
            />
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>O professor consegue ler o que você escreve aqui.</div>
          </div></div>
        </>
      )}
    </>
  );
}
