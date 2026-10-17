import { useState } from "react";
import EscolhaCabecalho from "./EscolhaCabecalho.jsx";
import {
  CADERNOS_COM_CAPA, htmlCabecalho, lerEscola, gravarEscola, lerEscrito, gravarEscrito,
  lerEscolha, gravarEscolha, lerNomeProf, gravarNomeProf, prepararImagem,
} from "../../lib/cabecalhosCadernos.js";

// Tela do professor: cria os cabeçalhos (da escola e escrito) e escolhe qual cada caderno usa na capa.
// Só neste navegador; não grava no banco e não mexe em nada dos alunos.
const box = { border: "1px solid var(--line)", background: "var(--surface)", padding: "12px 16px", marginBottom: 14 };

export default function CabecalhosCadernos({ nomePadrao }) {
  const [escola, setEscola] = useState(lerEscola);
  const [escrito, setEscrito] = useState(lerEscrito);
  const [prof, setProf] = useState(() => lerNomeProf(nomePadrao));
  const [escolhas, setEscolhas] = useState(() => Object.fromEntries(CADERNOS_COM_CAPA.map((c) => [c.id, lerEscolha(c.id)])));
  const [erro, setErro] = useState("");

  function mudarEscola(novo) {
    const v = { ...escola, ...novo };
    setEscola(v);
    setErro(gravarEscola(v) ? "" : "Não foi possível guardar neste navegador (a imagem pode ser grande demais). Vale só até recarregar a página.");
  }
  function mudarEscrito(novo) {
    const v = { ...escrito, ...novo };
    setEscrito(v);
    gravarEscrito(v);
  }
  async function escolherLogo(ev) {
    const arq = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!arq) return;
    setErro("");
    try { mudarEscola({ logo: await prepararImagem(arq) }); } catch (e) { setErro(e.message); }
  }
  function mudarEscolha(id, v) { setEscolhas((o) => ({ ...o, [id]: v })); gravarEscolha(id, v); }

  const vazio = (v) => (v === "escola" ? !escola.logo && !escola.linhas.trim() : v === "escrito" ? !escrito.linhas.trim() : false);

  return (
    <>
      <div className="screen-eyebrow">materiais · cadernos para imprimir</div>
      <h2 className="screen-title">Cabeçalho dos cadernos</h2>
      <p className="screen-sub">Crie os cabeçalhos uma vez só. Cada caderno escolhe qual usar na capa (o cabeçalho sai só na capa).</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
        <div style={box}>
          <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>🏫 Cabeçalho da escola</h3>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--ink-soft)" }}>Imagem (brasão, logotipo ou faixa completa, PNG ou JPG) e até 5 linhas de texto; a primeira sai em destaque.</p>
          <input type="file" accept="image/png,image/jpeg" onChange={escolherLogo} />
          {escola.logo && <div style={{ marginTop: 6 }}><img src={escola.logo} alt="" style={{ maxHeight: 60, maxWidth: 160 }} /> <button type="button" className="btn secondary" onClick={() => mudarEscola({ logo: "" })}>Tirar imagem</button></div>}
          <textarea rows={4} value={escola.linhas} onChange={(e) => mudarEscola({ linhas: e.target.value })} placeholder={"Ex.:\nGoverno do Estado\nSecretaria de Estado da Educação\nCEDUP Hermann Hering"} style={{ width: "100%", boxSizing: "border-box", marginTop: 8 }} />
        </div>
        <div style={box}>
          <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>✍ Cabeçalho escrito</h3>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--ink-soft)" }}>Só texto, até 5 linhas, sem imagem. A primeira sai em destaque.</p>
          <textarea rows={6} value={escrito.linhas} onChange={(e) => mudarEscrito({ linhas: e.target.value })} placeholder={"Ex.:\nProjeto Interdisciplinar CI–CA–AGB\nProf. Nome Sobrenome\nCurso Técnico em Contabilidade"} style={{ width: "100%", boxSizing: "border-box" }} />
        </div>
      </div>
      {erro && <div style={{ color: "var(--red, #b00020)", fontSize: 13, marginBottom: 10 }}>{erro}</div>}

      <div style={box}>
        <label style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Nome do professor (aparece na capa)</label>
        <input type="text" value={prof} maxLength={80} onChange={(e) => { setProf(e.target.value); gravarNomeProf(e.target.value); }} placeholder="Ex.: Prof. Nome Sobrenome" style={{ width: "100%", maxWidth: 420 }} />
      </div>

      <div style={box}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Qual cabeçalho cada caderno usa</h3>
        {CADERNOS_COM_CAPA.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <b style={{ minWidth: 150 }}>{c.nome}</b>
            <EscolhaCabecalho value={escolhas[c.id]} onChange={(v) => mudarEscolha(c.id, v)} vazio={vazio(escolhas[c.id])} />
          </div>
        ))}
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "8px 0 0" }}>Os próximos cadernos já nascem com esta mesma escolha. Guardado só neste navegador; a escolha também pode ser trocada dentro de cada caderno.</p>
      </div>

      <div style={box}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Prévia</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
          {[["escola", "Da escola"], ["escrito", "Escrito"]].map(([k, t]) => {
            const h = htmlCabecalho(k);
            return (
              <div key={k}>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 4 }}>{t}</div>
                <div style={{ background: "#fff", color: "#111", border: "1px solid #bbb", padding: 14, minHeight: 60 }}>
                  {h ? <div dangerouslySetInnerHTML={{ __html: h }} /> : <span style={{ fontSize: 13, color: "#777" }}>Ainda vazio.</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
