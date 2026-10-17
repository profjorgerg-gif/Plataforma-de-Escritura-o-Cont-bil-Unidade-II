import { useEffect, useMemo, useRef, useState } from "react";
import { CADERNO_PAGINAS } from "../../lib/cadernoPaginas.js";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { htmlCabecalho, lerEscolha, gravarEscolha, lerEscola, lerEscrito } from "../../lib/cabecalhosCadernos.js";
import EscolhaCabecalho from "./EscolhaCabecalho.jsx";

// Caderno do Aluno para impressão. Só aparece no menu do professor/admin.
// Conteúdo fixo; a capa sai com nome, turma e matrícula do aluno escolhido (lidos da turma, só leitura).
const CHAVE_NOME = "caderno.nomeProfessor";
const LARGURA = 794; // página A4 a 96 dpi
const FONTE = "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,700&display=swap";

function lerNome(padrao) {
  try { const v = window.localStorage.getItem(CHAVE_NOME); if (v !== null) return v; } catch (e) { /* sem armazenamento */ }
  return padrao || "";
}
function esc(t) {
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function montar(pagina, d) {
  let h = pagina.html;
  if (d.cabecalho) h = h.replace(/<!--CAB-->[\s\S]*?<!--\/CAB-->/, d.cabecalho);
  return h
    .split("%%PROFESSOR%%").join(esc(d.professor))
    .split("%%NOME%%").join(esc(d.nome))
    .split("%%TURMA%%").join(d.turma)
    .split("%%MATRICULA%%").join(esc(d.matricula));
}

export default function CadernoAluno({ nomePadrao, turma }) {
  const [professor, setProfessor] = useState(() => lerNome(nomePadrao));
  const [modo, setModo] = useState("branco"); // branco | aluno | todos
  const [matricula, setMatricula] = useState("");
  const [escolhaCab, setEscolhaCab] = useState(() => lerEscolha("aluno"));
  const [escala, setEscala] = useState(1);
  const [imprimindo, setImprimindo] = useState(false);
  const caixa = useRef(null);

  const turmaId = turma && turma.id;
  const alunos = useAlunosReaisDaTurma(turmaId);
  const lista = useMemo(() => (alunos || []).slice().sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")), [alunos]);
  const turmaNome = (turma && turma.nome) || "";
  // Turmas por disciplina (digitadas em Organização → Turmas). Se nenhuma foi preenchida, usa o nome da turma.
  const turmaHtml = useMemo(() => {
    const t = turma || {};
    const ds = [["CI", t.turmaCI], ["CA", t.turmaCA], ["AGB", t.turmaAGB]].filter((x) => (x[1] || "").trim());
    if (!ds.length) return esc(turmaNome);
    return ds.map((x) => '<div style="font-size:11.5px;line-height:1.35;white-space:nowrap"><b>' + x[0] + '</b> · ' + esc(x[1].trim()) + "</div>").join("");
  }, [turma, turmaNome]);

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

  function mudarEscolhaCab(v) { setEscolhaCab(v); gravarEscolha("aluno", v); }
  const cabecalhoHtml = htmlCabecalho(escolhaCab); // "" = capa usa a faixa padrão
  const cabVazio = escolhaCab === "escola" ? !lerEscola().logo && !lerEscola().linhas.trim() : escolhaCab === "escrito" ? !lerEscrito().linhas.trim() : false;

  // Quem aparece na capa
  const alunoEscolhido = lista.find((a) => a.matricula === matricula) || null;
  const fichas = useMemo(() => {
    const base = { professor: professor.trim(), nome: "", turma: "", matricula: "", cabecalho: cabecalhoHtml };
    if (modo === "aluno" && alunoEscolhido) return [{ ...base, nome: alunoEscolhido.nome || "", turma: turmaHtml, matricula: alunoEscolhido.matricula }];
    if (modo === "todos" && lista.length) {
      const todos = lista.map((a) => ({ ...base, nome: a.nome || "", turma: turmaHtml, matricula: a.matricula }));
      return imprimindo ? todos : todos.slice(0, 1); // na tela só a prévia do primeiro; ao imprimir, todos
    }
    return [base];
  }, [modo, alunoEscolhido, lista, turmaHtml, professor, imprimindo, cabecalhoHtml]);

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
          <EscolhaCabecalho value={escolhaCab} onChange={mudarEscolhaCab} vazio={cabVazio} />
          <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>O cabeçalho sai só na capa e substitui a faixa padrão do topo. Se o escolhido estiver vazio, a capa usa a faixa padrão.</div>
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
