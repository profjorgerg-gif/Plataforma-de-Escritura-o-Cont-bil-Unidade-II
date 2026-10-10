import { useEffect, useState } from "react";
import { FLUXOS, COR, Linha, Caixa2 } from "../shared/FluxoEtapa.jsx";
import info1 from "../../assets/infografico/Infografico_parte1.png";
import info2 from "../../assets/infografico/Infografico_parte2.png";
import infoPdf from "../../assets/infografico/Infografico_caminho_do_aluno.pdf?url";

// "Caminho do aluno" (2026-10-09): os mesmos fluxogramas que o aluno vê em
// cada etapa + o infográfico enviado no Classroom, para o professor consultar
// e explicar em sala. Só leitura: não lê nem grava nada no banco.

const ETAPAS = [
  ["empresa", "1 · Empresa didática"],
  ["documentos", "2 · Documentos fiscais"],
  ["digitacao", "3 · Digitação e análise"],
  ["classificacao", "4 · Classificação"],
  ["diario", "5 · Livro diário"],
  ["razao", "6 · Razão"],
  ["balancete", "7 · Balancete"],
  ["are", "8 · ARE"],
  ["dre", "9 · DRE"],
  ["bp", "10 · Balanço"],
];

function Fluxo({ etapa, grande }) {
  const f = FLUXOS[etapa];
  if (!f) return null;
  return (
    <div style={grande ? { zoom: 1.35 } : undefined}>
      <h3 style={{ margin: "0 0 6px" }}>{f.titulo}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, marginBottom: 4 }}>
        {[["al", "você faz"], ["sy", "o sistema faz"], ["pr", "o professor faz"], ["at", "atenção"]].map(([t, r]) => (
          <span key={t}><i style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: COR[t][0], border: "1px solid " + COR[t][1], marginRight: 5 }} />{r}</span>
        ))}
      </div>
      {f.partes
        ? f.partes.map((pt) => (
            <div key={pt.nome}><div className="mono" style={{ fontSize: 12, marginTop: 8, color: "var(--amber)" }}>{pt.nome}</div><Linha passos={pt.passos} /></div>
          ))
        : <Linha passos={f.passos} />}
      {f.aviso && <Caixa2 a={f.aviso} />}
    </div>
  );
}

export default function CaminhoAluno() {
  const [etapa, setEtapa] = useState("empresa");
  const [apresentando, setApresentando] = useState(false);
  const idx = ETAPAS.findIndex(([k]) => k === etapa);
  const ir = (d) => setEtapa(ETAPAS[Math.min(ETAPAS.length - 1, Math.max(0, idx + d))][0]);

  useEffect(() => {
    if (!apresentando) return undefined;
    function tecla(e) {
      if (e.key === "Escape") setApresentando(false);
      else if (e.key === "ArrowRight") ir(1);
      else if (e.key === "ArrowLeft") ir(-1);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const seletor = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {ETAPAS.map(([k, r]) => (
        <button key={k} className={"btn" + (etapa === k ? "" : " secondary")} style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={() => setEtapa(k)}>{r}</button>
      ))}
    </div>
  );

  return (
    <>
      <div className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Fluxograma de cada etapa (como o aluno vê)</h3>
          <button className="btn" style={{ padding: "4px 12px", fontSize: 12.5 }} onClick={() => setApresentando(true)}>⛶ Modo apresentação</button>
        </div>
        <div className="panel-body">
          <p className="helper-note" style={{ marginTop: 0 }}>É o mesmo painel “Como funciona esta etapa” que aparece para o aluno no topo de cada tela. Escolha a etapa para explicar. Só visualização: nada é gravado.</p>
          {seletor}
          <Fluxo etapa={etapa} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Infográfico enviado no Classroom</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <a className="btn secondary" style={{ padding: "4px 10px", fontSize: 12.5 }} href={infoPdf} download="Infografico_caminho_do_aluno.pdf">⬇ PDF completo</a>
            <a className="btn secondary" style={{ padding: "4px 10px", fontSize: 12.5 }} href={info1} download="Infografico_parte1.png">⬇ Imagem parte 1</a>
            <a className="btn secondary" style={{ padding: "4px 10px", fontSize: 12.5 }} href={info2} download="Infografico_parte2.png">⬇ Imagem parte 2</a>
          </div>
        </div>
        <div className="panel-body">
          <img src={info1} alt="Infográfico, parte 1" style={{ width: "100%", maxWidth: 900, display: "block", margin: "0 auto 12px", border: "1px solid #d9d2c0" }} />
          <img src={info2} alt="Infográfico, parte 2" style={{ width: "100%", maxWidth: 900, display: "block", margin: "0 auto", border: "1px solid #d9d2c0" }} />
        </div>
      </div>

      {apresentando && (
        <div className="no-print" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--paper, #F6F2E9)", overflow: "auto", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn secondary" disabled={idx === 0} onClick={() => ir(-1)}>← anterior</button>
              <button className="btn secondary" disabled={idx === ETAPAS.length - 1} onClick={() => ir(1)}>próxima →</button>
            </div>
            <small style={{ color: "#6b665a" }}>Setas ← → trocam de etapa · Esc fecha</small>
            <button className="btn" onClick={() => setApresentando(false)}>✕ Fechar</button>
          </div>
          <Fluxo etapa={etapa} grande />
        </div>
      )}
    </>
  );
}
