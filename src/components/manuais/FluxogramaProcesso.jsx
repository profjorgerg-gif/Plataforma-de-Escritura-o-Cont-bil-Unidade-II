import { useState } from "react";
import { FX1_CSS, FX1_VARS, FX1_SVG } from "../shared/fluxogramaEtapa1.js";
import { FXP_SVG } from "../shared/fluxogramasProcesso.js";

// Fluxograma do processo (2026-10-15): consulta do professor, só leitura.
// Etapa 1 na ordem do menu do aluno. Não lê nem grava nada no banco.
const VISOES = [
  ["etapa1", "Etapa 1 · Rev. 00 (2026.2)", () => FXP_SVG.etapa1, ""],
  ["aluno", "Versão do aluno", () => FX1_SVG, ""],
  ["rev", "Rev. 01 · 2027.1 (prevista)", () => FXP_SVG.rev, "Prevista para 2027.1; desligada nas turmas atuais."],
  ["mapa", "Mapa geral", () => FXP_SVG.mapa, ""],
];

export default function FluxogramaProcesso() {
  const [v, setV] = useState("etapa1");
  const atual = VISOES.find((x) => x[0] === v) || VISOES[0];
  return (
    <>
      <div className="screen-eyebrow">ajuda</div>
      <h2 className="screen-title">Fluxograma do processo</h2>
      <p className="screen-sub">Somente leitura. Mostra como cada nota percorre a Etapa 1, na ordem do menu do aluno. O documento completo, com cabeçalho de controle e tabelas, é o PDF.</p>
      <div className="btn-row" style={{ marginBottom: 10, flexWrap: "wrap" }}>
        {VISOES.map(([k, rot]) => (
          <button key={k} className={"btn" + (v === k ? "" : " secondary")} onClick={() => setV(k)}>{rot}</button>
        ))}
      </div>
      <div className="panel">
        <div className="panel-body">
          <div className="fx1" style={{ ...FX1_VARS, overflowX: "auto", background: "#fff", padding: 8 }}>
            <style>{FX1_CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: atual[2]() }} />
          </div>
          {atual[3] && <p className="helper-note">{atual[3]}</p>}
        </div>
      </div>
    </>
  );
}
