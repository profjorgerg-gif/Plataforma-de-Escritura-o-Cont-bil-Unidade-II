import { fmt } from "../../lib/contabil.js";

export function StatusBadge({ status }) {
  const label = { rascunho: "Rascunho", enviado: "Enviado p/ análise", aprovado: "Aprovado", correcao: "Correção necessária" }[status];
  return <span className={"status " + status}>{label}</span>;
}

export function Kpi({ label, value, tone }) {
  return (
    <div className={"kpi " + (tone || "")}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value mono">{value}</div>
    </div>
  );
}

export function DrillModal({ item, onClose }) {
  if (!item) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{item.title}</h3>
          <button className="modal-close" onClick={onClose}>fechar ×</button>
        </div>
        <div className="modal-body">
          <p className="helper-note">{item.legenda}</p>
          <table>
            <thead><tr><th>Data</th><th>Documento</th><th>Histórico</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {item.linhas.map((m, i) => (
                <tr key={i}>
                  <td className="mono">{m.data}</td>
                  <td className="mono">{m.documento}</td>
                  <td>{m.historico}</td>
                  <td className="num mono">{(m.tipo === "D" ? "D  " : "C  ") + fmt(m.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
