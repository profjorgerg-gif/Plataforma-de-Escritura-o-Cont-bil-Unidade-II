import { useEffect, useRef, useState } from "react";
import { RE_ACAO_QUE_GRAVA } from "../../lib/fechamento.js";

// Etapa encerrada (prazo vencido): o aluno só CONSULTA. Cobre a tela com uma faixa e impede digitar/salvar/enviar/excluir.
// Não apaga nada. A trava forte (que vale até fora da tela) fica nas regras do Firestore.
export default function EtapaFechada({ prazo, titulo, onSuporte, children }) {
  const ref = useRef(null);
  const [aviso, setAviso] = useState("");
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const dizer = () => { setAviso("Etapa encerrada: esta tela está só para consulta."); setTimeout(() => setAviso(""), 3500); };
    const aoClicar = (e) => {
      const b = e.target.closest && e.target.closest("button, input[type=checkbox], input[type=radio], input[type=file], input[type=submit], a[download]");
      if (!b) return;
      const txt = (b.textContent || b.value || b.title || "") + " " + (b.getAttribute("aria-label") || "");
      const isInput = b.tagName === "INPUT";
      if (/pdf|imagem|png|imprimir|baixar|exportar/i.test(txt)) return;
      if (isInput || b.getAttribute("type") === "submit" || RE_ACAO_QUE_GRAVA.test(txt)) { e.preventDefault(); e.stopPropagation(); dizer(); }
    };
    const aoDigitar = (e) => {
      const t = e.target;
      if (t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !["checkbox", "radio", "button"].includes(t.type)))) { e.preventDefault(); e.stopPropagation(); dizer(); }
    };
    const aoEnviarForm = (e) => { e.preventDefault(); e.stopPropagation(); dizer(); };
    el.addEventListener("click", aoClicar, true);
    el.addEventListener("beforeinput", aoDigitar, true);
    el.addEventListener("paste", aoDigitar, true);
    el.addEventListener("cut", aoDigitar, true);
    el.addEventListener("drop", aoDigitar, true);
    el.addEventListener("submit", aoEnviarForm, true);
    return () => {
      el.removeEventListener("click", aoClicar, true); el.removeEventListener("beforeinput", aoDigitar, true);
      el.removeEventListener("paste", aoDigitar, true); el.removeEventListener("cut", aoDigitar, true);
      el.removeEventListener("drop", aoDigitar, true); el.removeEventListener("submit", aoEnviarForm, true);
    };
  }, []);
  const dt = prazo ? prazo.split("-").reverse().join("/") : "";
  return (
    <div ref={ref}>
      <div className="panel" role="status" style={{ borderWidth: 2, borderColor: "var(--amber, #9c6b1f)", marginBottom: 14 }}>
        <div className="panel-body">
          <b style={{ fontSize: "1.05rem" }}>🔒 Etapa encerrada{dt ? " em " + dt : ""}{titulo ? " · " + titulo : ""}</b>
          <div style={{ marginTop: 4 }}>O prazo desta etapa terminou. Você pode <b>consultar</b> o que fez, mas não digita, envia nem exclui mais nada. O professor está corrigindo e vai publicar o seu relatório e a sua nota. Nada do que você fez foi apagado.</div>
          {onSuporte && <div style={{ marginTop: 8 }}><button className="btn secondary" onClick={onSuporte}>Falar com o professor (Suporte)</button></div>}
          {aviso && <div className="helper-note" style={{ marginTop: 8 }} aria-live="polite">{aviso}</div>}
        </div>
      </div>
      <div style={{ opacity: 0.92 }}>{children}</div>
    </div>
  );
}
