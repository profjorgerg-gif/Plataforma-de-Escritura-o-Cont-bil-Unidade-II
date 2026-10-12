import { useMemo } from "react";
import { DOCUMENTOS, TOTAL_DOCUMENTOS, PRAZO_PAGAMENTO_DIAS, calcularRescisao, diasEntre, fmtData, parseData, prazoPagamento } from "../../lib/rescisao.js";
import { EstadoGravacao, Carregando, useCampos } from "../shared/AgbUI.jsx";

export default function RescDocumentos({ trab, resc }) {
  const campos = useCampos(trab, false);
  const r = useMemo(() => calcularRescisao(resc.caso), [resc.caso]);
  if (resc.caso === undefined || trab.carregando) return <Carregando />;
  const des = r.caso.desligamento, prazo = prazoPagamento(des);
  const pg = campos.get("rdoc", "pagamento");
  const dif = pg && parseData(pg) ? diasEntre(prazo, pg) : null;
  const marcados = DOCUMENTOS.reduce((s, g, gi) => s + g.itens.filter((_, i) => campos.get("rdoc", "i_" + gi + "_" + i) === "1").length, 0);
  return (
    <>
      <div className="screen-eyebrow">etapa 4 · rescisão trabalhista</div>
      <h2 className="screen-title">Documentos, obrigações e prazos</h2>
      <p className="screen-sub">Marque o que você já preparou e informe a data do pagamento. Na vida real cada item precisa de comprovante; aqui o objetivo é você saber o que existe e em que ordem.</p>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />

      <div className="panel">
        <div className="panel-head"><h3>Prazo de pagamento</h3></div>
        <div className="panel-body">
          <p style={{ marginTop: 0, fontSize: 14 }}>As verbas rescisórias devem ser pagas em até <b>{PRAZO_PAGAMENTO_DIAS} dias corridos</b> contados do término do contrato (CLT art. 477 §6º). Desligamento: {fmtData(des)}. Prazo final: <b>{fmtData(prazo)}</b>.</p>
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Data do pagamento</label>
            <input type="date" value={pg} onChange={(e) => campos.set("rdoc", "pagamento", e.target.value)} />
          </div>
          {dif !== null && (dif <= 0
            ? <span className="tag-pill ok">✓ Pago no prazo</span>
            : <span className="tag-pill bad">✗ Fora do prazo: {dif} dia(s) de atraso, com risco de multa (art. 477 §8º)</span>)}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Checklist de documentos</h3><span className={"tag-pill " + (marcados === TOTAL_DOCUMENTOS ? "ok" : "warn")}>{marcados} de {TOTAL_DOCUMENTOS}</span></div>
        <div className="panel-body" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {DOCUMENTOS.map((g, gi) => (
            <div key={g.grupo}>
              <h4 style={{ margin: "0 0 6px" }}>{g.grupo}</h4>
              {g.itens.map((t, i) => {
                const k = "i_" + gi + "_" + i;
                return (
                  <label key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, marginBottom: 6 }}>
                    <input type="checkbox" checked={campos.get("rdoc", k) === "1"} onChange={(e) => campos.set("rdoc", k, e.target.checked ? "1" : "")} style={{ marginTop: 3 }} />
                    <span>{t}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="helper-note">Fluxo do eSocial: confirmar o desligamento, conferir os dados, apurar as verbas, preparar o evento S-2299, validar, transmitir e conferir o retorno. A rescisão só se conclui com o evento aceito.</div>
    </>
  );
}
