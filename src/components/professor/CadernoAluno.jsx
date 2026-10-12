import { useEffect, useMemo, useRef, useState } from "react";
import { CADERNO_PAGINAS } from "../../lib/cadernoPaginas.js";

// Caderno do Aluno para impressão. Só aparece no menu do professor/admin.
// Conteúdo fixo (sem Firestore): não lê nem grava nada dos alunos.
const CHAVE_NOME = "caderno.nomeProfessor";
const LARGURA = 794; // página A4 a 96 dpi

function lerNome(padrao) {
  try { const v = window.localStorage.getItem(CHAVE_NOME); if (v !== null) return v; } catch (e) { /* sem armazenamento */ }
  return padrao || "";
}

function esc(t) {
  return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function CadernoAluno({ nomePadrao }) {
  const [nome, setNome] = useState(() => lerNome(nomePadrao));
  const [escala, setEscala] = useState(1);
  const caixa = useRef(null);

  // A4 retrato, sem margem do navegador, só enquanto esta tela está aberta.
  useEffect(() => {
    const st = document.createElement("style");
    st.setAttribute("data-caderno", "1");
    st.textContent = "@page{size:A4 portrait;margin:0;}";
    document.head.appendChild(st);
    return () => { if (st.parentNode) st.parentNode.removeChild(st); };
  }, []);

  // Largura da tela: reduz as páginas no celular/tablet (na impressão a escala é sempre 1).
  useEffect(() => {
    const el = caixa.current;
    if (!el) return undefined;
    const medir = () => setEscala(Math.min(1, (el.clientWidth || LARGURA) / LARGURA));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  function mudarNome(v) {
    setNome(v);
    try { window.localStorage.setItem(CHAVE_NOME, v); } catch (e) { /* ignora */ }
  }

  const paginas = useMemo(() => CADERNO_PAGINAS.map((p) => ({
    n: p.n, titulo: p.titulo, html: p.html.split("%%PROFESSOR%%").join(esc(nome.trim())),
  })), [nome]);

  function irPara(n) {
    const el = document.getElementById("caderno-pg-" + n);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="no-print" style={{ marginBottom: 12 }}>
        <div className="balance-check" style={{ marginBottom: 12 }}>
          Material para você imprimir ou salvar em PDF e entregar aos alunos. Os alunos não veem esta tela. No diálogo de impressão escolha papel <b>A4</b>, margens <b>Nenhuma</b> e, se quiser o arquivo, o destino <b>Salvar como PDF</b>. São {paginas.length} páginas.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 260px", minWidth: 220 }}>
            <label>Nome do professor (sai na capa e no rodapé)</label>
            <input type="text" value={nome} maxLength={80} onChange={(e) => mudarNome(e.target.value)} placeholder="Ex.: Prof. Nome Sobrenome" />
          </div>
          <div>
            <label>Ir para a página</label>
            <select value="" onChange={(e) => { if (e.target.value) irPara(Number(e.target.value)); }}>
              <option value="">Escolher…</option>
              {paginas.map((p) => <option key={p.n} value={p.n}>{p.n} · {p.titulo}</option>)}
            </select>
          </div>
          <button className="btn" onClick={() => window.print()}>🖨️ Imprimir / Salvar PDF</button>
        </div>
        {!nome.trim() && <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>Sem nome preenchido, a linha do professor fica em branco na capa.</div>}
      </div>

      <div ref={caixa} className="caderno-lista">
        {paginas.map((p) => (
          <div key={p.n} id={"caderno-pg-" + p.n} className="caderno-moldura" style={{ width: LARGURA * escala, height: 1122 * escala }}>
            <div className={"caderno-pagina cd-p" + p.n} style={{ transform: "scale(" + escala + ")" }} dangerouslySetInnerHTML={{ __html: p.html }} />
          </div>
        ))}
      </div>
    </>
  );
}
