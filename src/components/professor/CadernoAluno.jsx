import { useEffect, useMemo, useRef, useState } from "react";
import { CADERNO_PAGINAS } from "../../lib/cadernoPaginas.js";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";

// Caderno do Aluno para impressão. Só aparece no menu do professor/admin.
// Conteúdo fixo; a capa sai com nome, turma e matrícula do aluno escolhido (lidos da turma, só leitura).
const CHAVE_NOME = "caderno.nomeProfessor";
const CHAVE_CAB = "caderno.cabecalhoEscola";
const LARGURA = 794; // página A4 a 96 dpi
const FONTE = "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,700&display=swap";

function lerNome(padrao) {
  try { const v = window.localStorage.getItem(CHAVE_NOME); if (v !== null) return v; } catch (e) { /* sem armazenamento */ }
  return padrao || "";
}
function esc(t) {
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function lerCab() {
  try { const v = JSON.parse(window.localStorage.getItem(CHAVE_CAB) || "null"); if (v && typeof v === "object") return { ativo: !!v.ativo, linhas: String(v.linhas || ""), logo: String(v.logo || "") }; } catch (e) { /* sem armazenamento */ }
  return { ativo: false, linhas: "", logo: "" };
}
function htmlCabecalho(c) {
  const linhas = c.linhas.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 5);
  if (!linhas.length && !c.logo) return "";
  // Imagem na largura útil da página (proporcional, centralizada); texto centralizado abaixo dela.
  const img = c.logo ? '<img src="' + esc(c.logo) + '" alt="" style="display:block;margin:0 auto;width:100%;max-height:118px;object-fit:contain">' : "";
  const txt = linhas.map((l, i) => '<div style="' + (i === 0 ? "font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;" : "font-size:12.5px;") + 'line-height:1.35">' + esc(l) + "</div>").join("");
  return '  <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;border-bottom:3px solid #1B1F1C;padding-bottom:12px">' + img + (txt ? '<div style="width:100%;text-align:center">' + txt + "</div>" : "") + "</div>\n";
}
function montar(pagina, d) {
  let h = pagina.html;
  if (d.cabecalho) h = h.replace(/<!--CAB-->[\s\S]*?<!--\/CAB-->/, d.cabecalho);
  return h
    .split("%%PROFESSOR%%").join(esc(d.professor))
    .split("%%NOME%%").join(esc(d.nome))
    .split("%%TURMA%%").join(esc(d.turma))
    .split("%%MATRICULA%%").join(esc(d.matricula));
}

export default function CadernoAluno({ nomePadrao, turma }) {
  const [professor, setProfessor] = useState(() => lerNome(nomePadrao));
  const [modo, setModo] = useState("branco"); // branco | aluno | todos
  const [matricula, setMatricula] = useState("");
  const [cab, setCab] = useState(lerCab);
  const [erroLogo, setErroLogo] = useState("");
  const [escala, setEscala] = useState(1);
  const [imprimindo, setImprimindo] = useState(false);
  const caixa = useRef(null);

  const turmaId = turma && turma.id;
  const alunos = useAlunosReaisDaTurma(turmaId);
  const lista = useMemo(() => (alunos || []).slice().sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")), [alunos]);
  const turmaNome = (turma && turma.nome) || "";

  // A4 retrato, sem margem do navegador, só enquanto esta tela está aberta. Carrega a fonte do caderno.
  useEffect(() => {
    const st = document.createElement("style");
    st.setAttribute("data-caderno", "1");
    st.textContent = "@page{size:A4 portrait;margin:0;}";
    document.head.appendChild(st);
    const ln = document.createElement("link");
    ln.rel = "stylesheet"; ln.href = FONTE; ln.setAttribute("data-caderno", "1");
    document.head.appendChild(ln);
    return () => { [st, ln].forEach((e) => { if (e.parentNode) e.parentNode.removeChild(e); }); };
  }, []);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return undefined;
    const medir = () => setEscala(Math.min(1, (el.clientWidth || LARGURA) / LARGURA));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  function mudarProfessor(v) {
    setProfessor(v);
    try { window.localStorage.setItem(CHAVE_NOME, v); } catch (e) { /* ignora */ }
  }

  function mudarCab(novo) {
    const v = { ...cab, ...novo };
    setCab(v);
    try { window.localStorage.setItem(CHAVE_CAB, JSON.stringify(v)); } catch (e) { setErroLogo("Não foi possível guardar o cabeçalho neste navegador (a imagem pode ser grande demais). Ele vale só até recarregar a página."); }
  }
  function escolherLogo(ev) {
    const arq = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!arq) return;
    setErroLogo("");
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const f = Math.min(1, 1400 / img.width, 400 / img.height);
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * f)); c.height = Math.max(1, Math.round(img.height * f));
        const g = c.getContext("2d");
        g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        let url = c.toDataURL("image/png");
        if (url.length > 1500000) url = c.toDataURL("image/jpeg", 0.88);
        mudarCab({ logo: url, ativo: true });
      };
      img.onerror = () => setErroLogo("Não consegui abrir essa imagem. Use PNG ou JPG.");
      img.src = String(leitor.result);
    };
    leitor.onerror = () => setErroLogo("Não consegui ler o arquivo.");
    leitor.readAsDataURL(arq);
  }
  const cabecalhoHtml = cab.ativo ? htmlCabecalho(cab) : "";

  // Quem aparece na capa
  const alunoEscolhido = lista.find((a) => a.matricula === matricula) || null;
  const fichas = useMemo(() => {
    const base = { professor: professor.trim(), nome: "", turma: "", matricula: "", cabecalho: cabecalhoHtml };
    if (modo === "aluno" && alunoEscolhido) return [{ ...base, nome: alunoEscolhido.nome || "", turma: turmaNome, matricula: alunoEscolhido.matricula }];
    if (modo === "todos" && lista.length) {
      const todos = lista.map((a) => ({ ...base, nome: a.nome || "", turma: turmaNome, matricula: a.matricula }));
      return imprimindo ? todos : todos.slice(0, 1); // na tela só a prévia do primeiro; ao imprimir, todos
    }
    return [base];
  }, [modo, alunoEscolhido, lista, turmaNome, professor, imprimindo, cabecalhoHtml]);

  const paginas = useMemo(() => fichas.flatMap((d, k) => CADERNO_PAGINAS.map((p) => ({
    chave: k + "-" + p.n, n: p.n, titulo: p.titulo, html: montar(p, d),
  }))), [fichas]);

  function dispararImpressao() {
    const ir = () => window.print();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ir); else ir();
  }
  function imprimir() {
    if (modo === "todos" && lista.length > 1) setImprimindo(true); else dispararImpressao();
  }
  useEffect(() => {
    if (!imprimindo) return undefined;
    const fim = () => setImprimindo(false);
    window.addEventListener("afterprint", fim);
    const t = setTimeout(dispararImpressao, 600);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", fim); };
  }, [imprimindo]);

  function irPara(n) {
    const el = document.getElementById("caderno-pg-" + n);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const bloqueia = (modo === "aluno" && !alunoEscolhido) || (modo === "todos" && !lista.length);
  const totalCadernos = modo === "todos" ? lista.length : 1;

  return (
    <>
      <div className="no-print" style={{ marginBottom: 12 }}>
        <div className="balance-check" style={{ marginBottom: 12 }}>
          Material para você imprimir ou salvar em PDF e entregar aos alunos. Os alunos não veem esta tela. No diálogo de impressão escolha papel <b>A4</b>, margens <b>Nenhuma</b> e, se quiser o arquivo, o destino <b>Salvar como PDF</b>. Cada caderno tem {CADERNO_PAGINAS.length} páginas.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 240px", minWidth: 200 }}>
            <label>Nome do professor (capa)</label>
            <input type="text" value={professor} maxLength={80} onChange={(e) => mudarProfessor(e.target.value)} placeholder="Ex.: Prof. Nome Sobrenome" />
          </div>
          <div style={{ flex: "1 1 220px", minWidth: 200 }}>
            <label>Capa preenchida para</label>
            <select value={modo === "aluno" ? "aluno" : modo} onChange={(e) => setModo(e.target.value)}>
              <option value="branco">Em branco (aluno escreve)</option>
              <option value="aluno">Um aluno da turma</option>
              <option value="todos">Todos os alunos da turma (um caderno por aluno)</option>
            </select>
          </div>
          {modo === "aluno" && (
            <div style={{ flex: "1 1 240px", minWidth: 200 }}>
              <label>Aluno{turmaNome ? " — " + turmaNome : ""}</label>
              <select value={matricula} onChange={(e) => setMatricula(e.target.value)}>
                <option value="">Escolher…</option>
                {lista.map((a) => <option key={a.matricula} value={a.matricula}>{(a.nome || "(sem nome)") + " · " + a.matricula}</option>)}
              </select>
            </div>
          )}
          <div>
            <label>Ir para a página</label>
            <select value="" onChange={(e) => { if (e.target.value) irPara(Number(e.target.value)); }}>
              <option value="">Escolher…</option>
              {CADERNO_PAGINAS.map((p) => <option key={p.n} value={p.n}>{p.n} · {p.titulo}</option>)}
            </select>
          </div>
          <button className="btn" disabled={bloqueia || imprimindo} onClick={imprimir}>🖨️ Imprimir / Salvar PDF</button>
        </div>
        <div style={{ marginTop: 10, border: "1px solid var(--line, #c9c4b4)", borderRadius: 6, padding: 10 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
            <input type="checkbox" checked={cab.ativo} onChange={(e) => mudarCab({ ativo: e.target.checked })} /> Cabeçalho da escola na capa (só na capa)
          </label>
          {cab.ativo && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, alignItems: "flex-start" }}>
              <div style={{ flex: "2 1 300px" }}>
                <label>Linhas do cabeçalho (uma por linha, até 5; a primeira sai em destaque)</label>
                <textarea rows={4} value={cab.linhas} onChange={(e) => mudarCab({ linhas: e.target.value })} placeholder={"Ex.:\nGoverno do Estado\nSecretaria de Estado da Educação\nCEDUP Hermann Hering"} style={{ width: "100%" }} />
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label>Imagem do cabeçalho: brasão, logotipo ou faixa completa (opcional, PNG ou JPG)</label>
                <input type="file" accept="image/png,image/jpeg" onChange={escolherLogo} />
                {cab.logo && <div style={{ marginTop: 6 }}><img src={cab.logo} alt="" style={{ maxHeight: 60, maxWidth: 120 }} /> <button className="btn secondary" onClick={() => mudarCab({ logo: "" })}>Tirar imagem</button></div>}
              </div>
            </div>
          )}
          {erroLogo && <div style={{ color: "var(--red, #b00020)", fontSize: 13, marginTop: 6 }}>{erroLogo}</div>}
          <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>A imagem ocupa a largura da página, centralizada, e o texto fica centralizado abaixo dela. O cabeçalho fica guardado só neste navegador e substitui a faixa padrão do topo da capa. Se ficar em branco, a capa usa a faixa padrão.</div>
        </div>
        {modo === "todos" && (
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            {lista.length ? "Serão gerados " + lista.length + " cadernos (" + lista.length * CADERNO_PAGINAS.length + " páginas) em um único arquivo, na ordem alfabética dos nomes. Abaixo aparece só a prévia do primeiro. Para um arquivo por aluno, use a opção “Um aluno da turma”."
              : "Esta turma ainda não tem alunos cadastrados" + (turmaNome ? " (" + turmaNome + ")" : "") + "."}
          </div>
        )}
        {modo === "aluno" && !alunoEscolhido && <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>Escolha o aluno para preencher nome, turma e matrícula na capa.</div>}
        {modo === "branco" && <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>Nome, turma e matrícula ficam em branco para o aluno escrever.</div>}
        {turma ? null : <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>Selecione uma turma no topo para preencher a capa com os dados dos alunos.</div>}
      </div>

      <div ref={caixa} className="caderno-lista">
        {paginas.map((p) => (
          <div key={p.chave} id={p.chave.startsWith("0-") ? "caderno-pg-" + p.n : undefined} className="caderno-moldura" style={{ width: LARGURA * escala, height: 1122 * escala }}>
            <div className={"caderno-pagina cd-p" + p.n} style={{ transform: "scale(" + escala + ")" }} dangerouslySetInnerHTML={{ __html: p.html }} />
          </div>
        ))}
      </div>
    </>
  );
}
