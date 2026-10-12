import { INCIDENCIAS, OPCOES_INSS_FGTS, OPCOES_IRRF } from "../../lib/rescisao.js";
import { EstadoGravacao, Carregando, useCampos } from "../shared/AgbUI.jsx";

export default function RescIncidencias({ trab }) {
  const campos = useCampos(trab, false);
  if (trab.carregando) return <Carregando />;
  const celula = (v, tributo, opcoes) => {
    const k = v.key + "_" + tributo, res = campos.get("rinc", k);
    return (
      <td>
        <select value={res} onChange={(e) => campos.set("rinc", k, e.target.value)} style={{ maxWidth: 170 }}>
          <option value="">—</option>{opcoes.map(([o, t]) => <option key={o} value={o}>{t}</option>)}
        </select>
        {res && <span style={{ fontWeight: 700, marginLeft: 4, color: res === v[tributo] ? "var(--green)" : "var(--red)" }}>{res === v[tributo] ? "✓" : "✗"}</span>}
      </td>
    );
  };
  const total = INCIDENCIAS.length * 3;
  const certas = INCIDENCIAS.reduce((s, v) => s + ["inss", "fgts", "irrf"].filter((t) => campos.get("rinc", v.key + "_" + t) === v[t]).length, 0);
  return (
    <>
      <div className="screen-eyebrow">etapa 4 · rescisão trabalhista</div>
      <h2 className="screen-title">Incidências: INSS, FGTS e IRRF</h2>
      <p className="screen-sub">Para cada verba rescisória, classifique se há incidência de INSS, de FGTS e de imposto de renda. Aqui você só classifica; os descontos do empregado não são calculados nesta etapa.</p>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />
      <div className="panel">
        <div className="panel-head"><h3>Quadro de incidências</h3><span className={"tag-pill " + (certas === total ? "ok" : "warn")}>{certas} de {total} certas</span></div>
        <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ minWidth: 640 }}>
            <thead><tr><th>Verba</th><th>INSS</th><th>FGTS</th><th>IRRF</th></tr></thead>
            <tbody>{INCIDENCIAS.map((v) => <tr key={v.key}><td>{v.nome}</td>{celula(v, "inss", OPCOES_INSS_FGTS)}{celula(v, "fgts", OPCOES_INSS_FGTS)}{celula(v, "irrf", OPCOES_IRRF)}</tr>)}</tbody>
          </table>
          <div style={{ padding: "10px 18px", fontSize: 12.5, color: "var(--ink-faint)", borderTop: "1px solid var(--line-strong)" }}>
            Pense na natureza da verba: remuneratória (paga pelo trabalho) ou indenizatória (repara uma perda). Quando a natureza depende do caso concreto, escolha "Depende da natureza".
          </div>
        </div>
      </div>
    </>
  );
}
