import { ESCOLHAS } from "../../lib/cabecalhosCadernos.js";

// Escolha do cabeçalho da capa (usada dentro de cada caderno). value: "escola" | "escrito" | "nenhum".
export default function EscolhaCabecalho({ value, onChange, vazio }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }} role="group" aria-label="Cabeçalho da capa">
      <span style={{ fontSize: 13 }}>Cabeçalho da capa:</span>
      {ESCOLHAS.map(([k, t]) => <button key={k} type="button" className={value === k ? "btn" : "btn secondary"} aria-pressed={value === k} onClick={() => onChange(k)}>{t}</button>)}
      <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
        {vazio && value !== "nenhum" ? "O cabeçalho escolhido está vazio. " : ""}Para criar ou editar: Materiais e ajuda → Cabeçalho dos cadernos.
      </span>
    </div>
  );
}
