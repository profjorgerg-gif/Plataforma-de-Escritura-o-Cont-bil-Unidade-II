import { useEffect, useMemo, useState } from "react";
import { SEMANAS, AULAS_SEMANA, ETAPAS_LINHA, PRAZOS_LINHA, DICAS_QUADRO, indiceSemana, textoDoQuadro } from "../../lib/diretrizSemana.js";

// Diretriz da semana (somente professor): o quadro de cada semana, para ler no celular e escrever no quadro da sala.
// Conteúdo fixo; não lê nem grava nada no Firestore. O tamanho do texto fica só neste navegador.
function hoje() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
const lerTam = () => { try { const v = Number(localStorage.getItem("diretriz.tam")); return v >= 0 && v <= 2 ? v : 0; } catch (e) { return 0; } };

export default function DiretrizSemana() {
  const [i, setI] = useState(() => indiceSemana(hoje()));
  const [tam, setTam] = useState(lerTam);
  const [copiado, setCopiado] = useState("");
  const [dicas, setDicas] = useState(false);
  const s = SEMANAS[i];
  const texto = useMemo(() => textoDoQuadro(s), [s]);
  // mantém a semana escolhida visível na fileira de semanas (celular)
  useEffect(() => {
    const el = document.querySelector(".diretriz-chip.on");
    if (el && el.scrollIntoView) { try { el.scrollIntoView({ inline: "center", block: "nearest" }); } catch (e) { /* navegador antigo */ } }
  }, [i]);

  function mudarTam(v) {
    const n = Math.max(0, Math.min(2, v));
    setTam(n);
    try { localStorage.setItem("diretriz.tam", String(n)); } catch (e) { /* sem armazenamento: segue sem lembrar */ }
  }
  async function copiar() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(texto);
      else {
        const ta = document.createElement("textarea");
        ta.value = texto; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      }
      setCopiado("Texto copiado.");
    } catch (e) { setCopiado("Não foi possível copiar; selecione o texto e copie."); }
    setTimeout(() => setCopiado(""), 2500);
  }

  return (
    <div className={"diretriz diretriz-t" + tam}>
      <h2 className="screen-title">Diretriz da semana</h2>
      <p className="helper-note" style={{ marginBottom: 12 }}>
        O que escrever no quadro em cada semana. Só você vê esta tela, inclusive no celular. Escreva na segunda e deixe valendo até sexta.
      </p>

      <div className="diretriz-semanas" role="tablist" aria-label="Semanas">
        {SEMANAS.map((x, k) => (
          <button key={k} type="button" role="tab" aria-selected={k === i} className={"diretriz-chip" + (k === i ? " on" : "")} onClick={() => setI(k)}>
            {x.periodo}
          </button>
        ))}
      </div>

      <div className="diretriz-barra">
        <div className="diretriz-tam" aria-label="Tamanho do texto">
          <button type="button" className="btn secondary" onClick={() => mudarTam(tam - 1)} disabled={tam === 0} aria-label="Diminuir texto">A−</button>
          <button type="button" className="btn secondary" onClick={() => mudarTam(tam + 1)} disabled={tam === 2} aria-label="Aumentar texto">A+</button>
        </div>
        <button type="button" className="btn secondary" onClick={copiar}>Copiar texto</button>
        <button type="button" className="btn secondary" onClick={() => setDicas(!dicas)}>{dicas ? "Ocultar dicas" : "Dicas para o quadro"}</button>
        {copiado && <span className="diretriz-aviso" role="status">{copiado}</span>}
      </div>

      {dicas && (
        <div className="balance-check" style={{ marginBottom: 12 }}>
          <ul style={{ margin: "0 0 0 18px", padding: 0 }}>
            {DICAS_QUADRO.map((d, k) => <li key={k}>{d}</li>)}
          </ul>
          <div style={{ marginTop: 8 }}><b>Etapas:</b> {ETAPAS_LINHA}</div>
          <div style={{ marginTop: 4 }}><b>Prazos:</b> {PRAZOS_LINHA}</div>
        </div>
      )}

      <article className="diretriz-quadro">
        <div className="diretriz-kicker">Semana · {s.periodo}</div>
        <h3 className="diretriz-titulo">{s.etapa}</h3>
        <div className="diretriz-linha"><b>Aulas da semana:</b> {AULAS_SEMANA}.</div>
        <div className="diretriz-prazo"><b>PRAZO:</b> {s.prazo}</div>
        {s.extra && <div className="diretriz-extra">{s.extra}</div>}

        <section className="diretriz-sec diretriz-meta"><h4>Meta</h4><p>{s.meta}</p></section>

        <section className="diretriz-sec">
          <h4>{s.caminhoTitulo || "Caminho"}</h4>
          <ol>{s.caminho.map((c, k) => <li key={k}>{c}</li>)}</ol>
        </section>

        {s.controle && <section className="diretriz-sec"><h4>Ponto de controle</h4><p>{s.controle}</p></section>}

        {s.erros.length > 0 && (
          <section className="diretriz-sec">
            <h4>Erros comuns</h4>
            <ul>{s.erros.map((e, k) => <li key={k}>{e}</li>)}</ul>
          </section>
        )}

        <section className="diretriz-sec">
          <h4>{s.antesTitulo || "Antes de entregar"}</h4>
          <ul className="diretriz-caixas">{s.antes.map((a, k) => <li key={k}><span aria-hidden="true">☐</span> {a}</li>)}</ul>
        </section>

        <section className="diretriz-sec"><h4>Regras</h4><p>{s.regras}</p></section>

        {s.proxima && <section className="diretriz-sec"><h4>Próxima semana</h4><p>☐ Etapa seguinte liberada pelo professor · {s.proxima}</p></section>}
      </article>

      <div className="diretriz-nav">
        <button type="button" className="btn secondary" disabled={i === 0} onClick={() => setI(i - 1)}>← Semana anterior</button>
        <button type="button" className="btn secondary" disabled={i === SEMANAS.length - 1} onClick={() => setI(i + 1)}>Próxima semana →</button>
      </div>
    </div>
  );
}
