import { useState } from "react";
import { saldoConta, fmt } from "../../lib/contabil.js";

export default function LivroRazao({ razao }) {
  const contasComMovimento = Object.values(razao).filter((b) => b.movimentos.length > 0);
  const [contaSel, setContaSel] = useState(contasComMovimento[0]?.conta.codigo || "");
  const bucket = razao[contaSel];

  return (
    <>
      <div className="screen-eyebrow">09 · livro razão</div>
      <h2 className="screen-title">Livro Razão</h2>
      <p className="screen-sub">Transporte automático dos lançamentos aprovados do Diário, agrupados por conta.</p>
      <div className="panel">
        <div className="panel-head">
          <h3>Conta</h3>
          <select className="mono" style={{ padding: "6px 8px" }} value={contaSel} onChange={(e) => setContaSel(e.target.value)}>
            {contasComMovimento.map((b) => <option key={b.conta.codigo} value={b.conta.codigo}>{b.conta.codigo} — {b.conta.nome}</option>)}
          </select>
        </div>
        {bucket && (
          <div className="panel-body" style={{ padding: 0 }}>
            <table>
              <thead><tr><th>Data</th><th>Documento</th><th>Histórico</th><th className="num">Débito</th><th className="num">Crédito</th></tr></thead>
              <tbody>
                {bucket.movimentos.map((m, i) => (
                  <tr key={i}>
                    <td className="mono">{m.data}</td>
                    <td className="mono">{m.documento}</td>
                    <td>{m.historico}</td>
                    <td className="num mono">{m.tipo === "D" ? fmt(m.valor) : ""}</td>
                    <td className="num mono">{m.tipo === "C" ? fmt(m.valor) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line-strong)", display: "flex", justifyContent: "space-between", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
              <span>Totais D: {fmt(bucket.totalD)} C: {fmt(bucket.totalC)}</span>
              <span style={{ fontWeight: 600 }}>Saldo: {fmt(saldoConta(bucket))} ({bucket.conta.natureza === "devedora" ? "devedor" : "credor"})</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
