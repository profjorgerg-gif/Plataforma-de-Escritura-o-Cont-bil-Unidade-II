import { useState } from "react";
import { saldoConta, fmt } from "../../lib/contabil.js";
import { DrillModal } from "../shared/UI.jsx";

export default function BalancoPatrimonial({ bp }) {
  const [drill, setDrill] = useState(null);

  const Grupo = ({ contas, titulo }) => (
    <>
      <div className="bp-group-label">{titulo}</div>
      {contas.length === 0
        ? <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>—</div>
        : contas.map((c) => (
          <div className="dre-row clickable" key={c.conta.codigo}
            onClick={() => setDrill({ title: c.conta.nome, legenda: "Lançamentos que compõem este saldo.", linhas: c.movimentos })}>
            <span>{c.conta.nome}</span><span className="val mono">{fmt(Math.abs(saldoConta(c)))}</span>
          </div>
        ))}
    </>
  );

  return (
    <>
      <div className="screen-eyebrow">13 · balanço patrimonial</div>
      <h2 className="screen-title">Balanço Patrimonial</h2>
      <p className="screen-sub">Gerado a partir das contas patrimoniais. Clique em uma conta para rastrear a origem do saldo.</p>
      <div className="panel">
        <div className="bp-cols">
          <div className="bp-col"><Grupo contas={bp.ativos} titulo="ATIVO CIRCULANTE" /></div>
          <div className="bp-col">
            <Grupo contas={bp.passivos} titulo="PASSIVO CIRCULANTE" />
            <div className="bp-group-label">PATRIMÔNIO LÍQUIDO</div>
            {bp.pl.map((c) => (
              <div className="dre-row" key={c.conta.codigo}><span>{c.conta.nome}</span><span className="val mono">{fmt(saldoConta(c))}</span></div>
            ))}
            <div className="dre-row"><span>Resultado do Exercício</span><span className="val mono">{fmt(bp.totalPL - bp.pl.reduce((s, l) => s + saldoConta(l), 0))}</span></div>
          </div>
        </div>
        <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line-strong)" }}>
          <div className={"balance-check " + (bp.fecha ? "ok" : "bad")}>
            Ativo: {fmt(bp.totalAtivo)} · Passivo + PL: {fmt(bp.totalPassivo + bp.totalPL)} {bp.fecha ? "✓ o balanço fecha" : "✗ não fecha"}
          </div>
        </div>
      </div>
      <DrillModal item={drill} onClose={() => setDrill(null)} />
    </>
  );
}
