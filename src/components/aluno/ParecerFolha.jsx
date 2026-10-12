import { EstadoGravacao, CaixaTexto, Carregando, useCampos } from "../shared/AgbUI.jsx";

// "Linhas" do parecer: conta cada parágrafo em linhas de ~100 caracteres (aproximação de uma página).
export function contarLinhas(txt) {
  return String(txt || "").split("\n").reduce((s, l) => s + (l.trim() === "" ? 0 : Math.ceil(l.length / 100)), 0);
}

export default function ParecerFolha({ trab }) {
  const campos = useCampos(trab, false);
  if (trab.carregando) return <Carregando />;
  const p = (trab.dados || {}).parecer || {};
  const texto = campos.get("parecer", "texto");
  const linhas = contarLinhas(texto);
  const ok = linhas >= 15 && linhas <= 25;
  const enviado = !!p.enviado;
  function enviar() {
    trab.setCampo("parecer", "enviado", true);
    trab.setCampo("parecer", "enviadoEm", new Date().toISOString());
    trab.salvarAgora();
  }
  const devolutiva = (trab.dados || {}).devolutiva;
  return (
    <>
      <div className="screen-eyebrow">fase 2 · contabilidade avançada</div>
      <h2 className="screen-title">Parecer técnico</h2>
      <p className="screen-sub">Escreva um parecer de 15 a 20 linhas sobre as provisões trabalhistas, usando o que você calculou e contabilizou.</p>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />
      {devolutiva && <div className="panel"><div className="panel-head"><h3>Retorno do professor</h3></div><div className="panel-body" style={{ whiteSpace: "pre-wrap" }}>{devolutiva}</div></div>}
      <div className="panel"><div className="panel-body">
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 10 }}>
          Aborde: (1) a importância do regime de competência para reconhecer as provisões; (2) os princípios e normas que fundamentam o procedimento; (3) os riscos de não contabilizá-las; (4) os impactos no patrimônio, no resultado e nas demonstrações; (5) a relevância dessa informação para administradores, investidores, credores e demais usuários.
        </div>
        <CaixaTexto rotulo="Parecer técnico" linhas={14} valor={texto} onChange={(v) => campos.set("parecer", "texto", v)} />
        <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span className={"tag-pill " + (ok ? "ok" : "warn")}>{linhas} linhas (meta: 15 a 20)</span>
          {enviado
            ? <><span className="tag-pill ok">✓ Enviado ao professor</span><button className="btn secondary" onClick={() => { trab.setCampo("parecer", "enviado", false); trab.salvarAgora(); }}>Reabrir para editar</button></>
            : <button className="btn green" disabled={!ok} onClick={enviar}>Enviar parecer ao professor</button>}
          <button className="btn secondary" onClick={() => window.print()}>Imprimir / salvar em PDF</button>
        </div>
      </div></div>
    </>
  );
}
