import { useState } from "react";
import { fmt } from "../../lib/contabil.js";
import { DrillModal } from "../shared/UI.jsx";

// NOTA: o protótipo tinha um bug aqui — os filtros de drill-down ainda
// usavam `l.conta.grupo.includes("Receita")` etc., da época em que grupo
// era uma string. Desde a migração para o Plano de Contas oficial, grupo é
// numérico (1–7) e isso quebraria em runtime (números não têm .includes).
// Corrigido abaixo para usar grupo/subgrupo, no mesmo critério de
// src/lib/contabil.js > calcularDRE.

const FILTROS = {
  receita: (c) => c.grupo === 4 && c.subgrupo === "Receita Bruta de Vendas",
  deducoes: (c) => c.grupo === 4 && c.redutora,
  cmv: (c) => c.codigo.startsWith("6.2"),
  despop: (c) => c.grupo === 5 && c.subgrupo !== "Despesas Financeiras",
  finrec: (c) => c.grupo === 4 && c.subgrupo === "Receitas Financeiras",
  findesp: (c) => c.grupo === 5 && c.subgrupo === "Despesas Financeiras",
};

export default function DRE({ dre }) {
  const [drill, setDrill] = useState(null);

  function abrirDrill(label, key) {
    const contas = dre.linhas.filter((l) => FILTROS[key](l.conta));
    const movimentos = contas.flatMap((c) => c.movimentos.map((m) => ({ ...m })));
    setDrill({ title: label, legenda: "Lançamentos que formam este valor na DRE.", linhas: movimentos });
  }

  const Linha = ({ label, valor, filtro, cls }) => (
    <div className={"dre-row " + (cls || "") + " clickable"} onClick={() => abrirDrill(label, filtro)}>
      <span>{label}</span><span className="val mono">{valor}</span>
    </div>
  );

  return (
    <>
      <div className="screen-eyebrow">12 · demonstração do resultado</div>
      <h2 className="screen-title">DRE — Demonstração do Resultado do Exercício</h2>
      <p className="screen-sub">Clique em qualquer linha para ver quais lançamentos formaram aquele valor.</p>
      <div className="panel">
        <div className="panel-body">
          <Linha label="Receita Bruta de Vendas" valor={fmt(dre.receitaBruta)} filtro="receita" />
          <Linha label="(–) Deduções da Receita" valor={"(" + fmt(dre.deducoes) + ")"} filtro="deducoes" cls="sub" />
          <div className="dre-row total"><span>= Receita Líquida</span><span className="val">{fmt(dre.receitaLiquida)}</span></div>
          <Linha label="(–) CMV" valor={"(" + fmt(dre.cmv) + ")"} filtro="cmv" cls="sub" />
          <div className="dre-row total"><span>= Resultado Bruto</span><span className="val">{fmt(dre.resultadoBruto)}</span></div>
          <Linha label="(–) Despesas Operacionais" valor={"(" + fmt(dre.despesasOp) + ")"} filtro="despop" cls="sub" />
          <Linha label="(+) Receitas Financeiras" valor={fmt(dre.receitasFin)} filtro="finrec" cls="sub" />
          <Linha label="(–) Despesas Financeiras" valor={"(" + fmt(dre.despesasFin) + ")"} filtro="findesp" cls="sub" />
          <div className="dre-row total"><span>= Resultado do Exercício</span><span className="val">{fmt(dre.resultadoExercicio)}</span></div>
        </div>
      </div>
      <DrillModal item={drill} onClose={() => setDrill(null)} />
    </>
  );
}
