import { useState } from "react";
import { FX1_CSS, FX1_VARS, FX1_SVG } from "../shared/fluxogramaEtapa1.js";
import { FXP_SVG } from "../shared/fluxogramasProcesso.js";
import { FXE_SVG } from "../shared/fluxogramasEtapas2a6.js";

// Fluxograma do processo (2026-10-15): consulta do professor, só leitura.
// Etapa 1 na ordem do menu do aluno. Não lê nem grava nada no banco.
const VISOES = [
  ["etapa1", "Etapa 1 · Rev. 00 (2026.2)", () => FXP_SVG.etapa1, ""],
  ["aluno", "Versão do aluno", () => FX1_SVG, ""],
  ["rev", "Rev. 01 · 2027.1 (prevista)", () => FXP_SVG.rev, "Prevista para 2027.1; desligada nas turmas atuais."],
  ["e2", "Etapa 2 · Folha", () => FXE_SVG.e2, ""],
  ["e3", "Etapa 3 · Provisões", () => FXE_SVG.e3, ""],
  ["e4", "Etapa 4 · Rescisão", () => FXE_SVG.e4, ""],
  ["e5", "Etapa 5 · AGB", () => FXE_SVG.e5, ""],
  ["e6", "Etapa 6 · Comparativa", () => FXE_SVG.e6, ""],
  ["mapa", "Mapa geral", () => FXP_SVG.mapa, ""],
];

export default function FluxogramaProcesso() {
  const [v, setV] = useState("etapa1");
  const atual = VISOES.find((x) => x[0] === v) || VISOES[0];
  return (
    <>
      <div className="screen-eyebrow">ajuda</div>
      <h2 className="screen-title">Fluxograma do processo</h2>
      <p className="screen-sub">Somente leitura. Mostra o caminho de cada etapa do menu do aluno (1 a 6), com responsável, nota e prazo. O documento completo, com cabeçalho de controle e tabelas, é o PDF.</p>
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
