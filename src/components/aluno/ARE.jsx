import { fmt } from "../../lib/contabil.js";

export default function ARE({ dre }) {
  return (
    <>
      <div className="screen-eyebrow">11 · apuração do resultado</div>
      <h2 className="screen-title">ARE — Apuração do Resultado do Exercício</h2>
      <p className="screen-sub">Encerramento conceitual das contas de resultado — receitas, deduções, custos e despesas — para apuração do resultado do período.</p>
      <div className="panel">
        <div className="panel-body">
          <div className="dre-row"><span>Receitas</span><span className="val">{fmt(dre.receitaBruta + dre.receitasFin)}</span></div>
          <div className="dre-row sub"><span>(–) Deduções</span><span className="val">({fmt(dre.deducoes)})</span></div>
          <div className="dre-row sub"><span>(–) Custos (CMV)</span><span className="val">({fmt(dre.cmv)})</span></div>
          <div className="dre-row sub"><span>(–) Despesas</span><span className="val">({fmt(dre.despesasOp + dre.despesasFin)})</span></div>
          <div className="dre-row total"><span>= Resultado do Exercício</span><span className="val">{fmt(dre.resultadoExercicio)}</span></div>
        </div>
      </div>
    </>
  );
}
