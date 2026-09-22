import { calcularBalancete, saldoConta, fmt } from "../../lib/contabil.js";

export default function Balancete({ razao }) {
  const linhas = calcularBalancete(razao);
  const totalD = linhas.reduce((s, l) => s + l.totalD, 0);
  const totalC = linhas.reduce((s, l) => s + l.totalC, 0);

  return (
    <>
      <div className="screen-eyebrow">10 · balancete de verificação</div>
      <h2 className="screen-title">Balancete de Verificação</h2>
      <p className="screen-sub">Gerado a partir do Razão. Débitos e créditos totais devem coincidir.</p>
      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Código</th><th>Conta</th><th className="num">Débitos</th><th className="num">Créditos</th><th className="num">Saldo</th><th>D/C</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.conta.codigo}>
                  <td className="mono">{l.conta.codigo}</td>
                  <td>{l.conta.nome}</td>
                  <td className="num mono">{fmt(l.totalD)}</td>
                  <td className="num mono">{fmt(l.totalC)}</td>
                  <td className="num mono">{fmt(Math.abs(saldoConta(l)))}</td>
                  <td className="mono">{saldoConta(l) >= 0 ? (l.conta.natureza === "devedora" ? "D" : "C") : (l.conta.natureza === "devedora" ? "C" : "D")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line-strong)" }}>
            <div className={"balance-check " + (Math.abs(totalD - totalC) < 0.005 ? "ok" : "bad")}>
              Total débitos: {fmt(totalD)} · Total créditos: {fmt(totalC)} {Math.abs(totalD - totalC) < 0.005 ? "✓ confere" : "✗ não confere"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
