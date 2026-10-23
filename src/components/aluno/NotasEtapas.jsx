import { ETAPAS, etapaPorId, faixaDaNota, fmtNota } from "../../lib/avaliacao.js";
import { Carregando } from "../shared/AgbUI.jsx";

export default function NotasEtapas({ avaliacoes }) {
  if (avaliacoes === undefined) return <Carregando />;
  const ordenadas = ETAPAS.map((e) => avaliacoes.find((a) => a.etapaId === e.id)).filter(Boolean);
  return (
    <>
      <div className="screen-eyebrow">projeto interdisciplinar</div>
      <h2 className="screen-title">Notas e retornos</h2>
      <p className="screen-sub">Toda nota vai de 0,0 a 10,0. Em cada etapa você vê como a nota foi formada e o que ajustar.</p>
      {ordenadas.length === 0 && <div className="empty-state">Nenhuma nota liberada ainda. Elas aparecem aqui quando o professor analisar cada etapa.</div>}
      {ordenadas.map((a) => {
        const e = etapaPorId(a.etapaId); const f = faixaDaNota(a.nota);
        return (
          <div className="panel" key={a.etapaId}>
            <div className="panel-head"><h3>{e.titulo}</h3><span className={"tag-pill " + (f ? f.classe : "")}>{fmtNota(a.nota)} · {f ? f.nome : "—"}</span></div>
            <div className="panel-body">
              <table>
                <thead><tr><th>Critério</th><th className="num">Peso</th><th className="num">Nota</th><th>Retorno</th></tr></thead>
                <tbody>
                  {e.criterios.map((c) => {
                    const r = (a.criterios || {})[c.key] || {};
                    return <tr key={c.key}><td>{c.nome}</td><td className="num mono">{c.peso}%</td><td className="num mono">{fmtNota(r.nota)}</td><td style={{ fontSize: 13 }}>{r.comentario || "—"}</td></tr>;
                  })}
                </tbody>
              </table>
              {a.desconto > 0 && <div style={{ marginTop: 8, fontSize: 13.5 }}>Nota pelos critérios: <b>{fmtNota(a.notaCriterios)}</b> · desconto por entrega em atraso: <b>−{fmtNota(a.desconto)}</b> → nota da etapa <b>{fmtNota(a.nota)}</b>.</div>}
              {f && <div style={{ marginTop: 10, fontSize: 13.5 }}><b>O que fazer agora:</b> {f.orientacao}</div>}
              {a.comentario && <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--paper)", fontSize: 13.5 }}><b>Parecer técnico do professor</b><div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{a.comentario}</div></div>}
            </div>
          </div>
        );
      })}
    </>
  );
}
