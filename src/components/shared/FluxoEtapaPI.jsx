import { useState } from "react";
import { FX1_CSS, FX1_VARS } from "./fluxogramaEtapa1.js";
import { FXE_SVG } from "./fluxogramasEtapas2a6.js";

// Fluxograma da etapa (2026-10-15): painel só informativo no topo das telas do aluno
// nas Etapas 2 a 6. Não lê nem grava nada no banco. Começa fechado.
const TELA_ETAPA = {
  "ca-ativ": ["e2", "2 · Folha de pagamento"],
  "ca-folha": ["e3", "3 · Folha, provisões e contabilização"], "ca-prov": ["e3", "3 · Folha, provisões e contabilização"],
  "ca-cont": ["e3", "3 · Folha, provisões e contabilização"], "ca-efeitos": ["e3", "3 · Folha, provisões e contabilização"],
  "ca-parecer": ["e3", "3 · Folha, provisões e contabilização"],
  "resc-caso": ["e4", "4 · Rescisão trabalhista"], "resc-calc": ["e4", "4 · Rescisão trabalhista"], "resc-inc": ["e4", "4 · Rescisão trabalhista"],
  "resc-cont": ["e4", "4 · Rescisão trabalhista"], "resc-doc": ["e4", "4 · Rescisão trabalhista"], "resc-final": ["e4", "4 · Rescisão trabalhista"],
  "agb-av": ["e5", "5 · Análise gerencial de balanços"], "agb-ind": ["e5", "5 · Análise gerencial de balanços"],
  "agb-giro": ["e5", "5 · Análise gerencial de balanços"], "agb-parecer": ["e5", "5 · Análise gerencial de balanços"],
  "agb-ex": ["e6", "6 · Análise comparativa"], "agb-comp": ["e6", "6 · Análise comparativa"],
};

export default function FluxoEtapaPI({ tela, onSuporte }) {
  const [aberto, setAberto] = useState(false);
  const alvo = TELA_ETAPA[tela];
  if (!alvo) return null;
  return (
    <div className="panel no-print" style={{ marginBottom: 14 }}>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>🧭 Fluxograma da etapa — {alvo[1]}</h3>
        <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setAberto(!aberto)}>{aberto ? "fechar" : "abrir"}</button>
      </div>
      {aberto && (
        <div className="panel-body">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8, fontSize: 12.5 }}>
            {onSuporte && <button type="button" className="btn" onClick={onSuporte}>❓ Dúvida? Abrir o Suporte</button>}
            <span style={{ border: "1px dashed #8a8678", padding: "6px 10px" }}>Só para consulta: mostra o caminho da etapa, do início à nota.</span>
          </div>
          <div className="fx1" style={{ ...FX1_VARS, overflowX: "auto", background: "#fff", border: "1px solid #d9d2c0", padding: 8 }}>
            <style>{FX1_CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: FXE_SVG[alvo[0]] }} />
          </div>
        </div>
      )}
    </div>
  );
}
