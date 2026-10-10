import { useState } from "react";
import { addDoc, collection, doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useChamados } from "../../hooks/useChamados.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { formatarDataHora, rotuloSituacao } from "../aluno/SuporteAluno.jsx";
import { devolverNota, ETAPAS_DEVOLUCAO, MODELO_ORIENTACAO } from "../../lib/devolucao.js";

// Suporte — visão do professor (2026-10-09). Caixa de entrada de chamados da
// turma. Só escreve na coleção "chamados".

const RESPOSTAS_RAPIDAS = [
  "Recebi seu chamado. Já estou verificando e retorno em breve.",
  "Corrigi o gabarito da nota. Atualize a página (Ctrl+F5) e refaça a conferência.",
  "Reabri essa nota para você refazer. Comece pela Digitação e análise fiscal.",
  "Não consegui reproduzir o problema. Pode me enviar um print da tela e dizer o que você clicou?",
];

function Bolha({ m }) {
  const prof = m.autor === "professor";
  if (m.tipo === "sistema") return <div style={{ textAlign: "center", color: "#7a7466", fontSize: 12, margin: "8px 0" }}>{m.texto} · {formatarDataHora(m.em)}</div>;
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 8, margin: "8px 0", maxWidth: "88%", fontSize: 14, whiteSpace: "pre-wrap",
      background: prof ? "#E5EFEA" : "#fff", border: "1px solid " + (prof ? "#b9d3c7" : "#d9d2c0"), marginLeft: prof ? "auto" : 0,
    }}>
      <small style={{ display: "block", color: "#7a7466", fontSize: 11, marginBottom: 3 }}>{prof ? "Professor" : "Aluno"} · {formatarDataHora(m.em)}</small>
      {m.tipo === "devolucao" && <div style={{ marginBottom: 4 }}><b>↩ Devolução da NF {m.documentoNumero || ""}:</b> {(m.etapas || []).join(", ")}</div>}
      {m.texto}
    </div>
  );
}

export default function SuporteProfessor({ turma }) {
  const turmaId = turma?.id;
  const { chamados, erro: erroLeitura } = useChamados(turmaId, null);
  const alunos = useAlunosDaTurma(turmaId);
  const documentos = useDocumentosDaTurma(turmaId);
  const [aba, setAba] = useState("abertos");
  const [selId, setSelId] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [devAberto, setDevAberto] = useState(false);
  const [devDoc, setDevDoc] = useState("");
  const [devEtapas, setDevEtapas] = useState([]);
  const [devTexto, setDevTexto] = useState(MODELO_ORIENTACAO);
  const [devOk, setDevOk] = useState("");
  const [novo, setNovo] = useState(false);
  const [nMat, setNMat] = useState("");
  const [nAssunto, setNAssunto] = useState("");
  const [nTexto, setNTexto] = useState("");

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;

  const lista = (chamados || []).filter((c) =>
    aba === "abertos" ? c.status === "aberto" : aba === "respondidos" ? c.status === "respondido" : c.status === "resolvido");
  const nAbertos = (chamados || []).filter((c) => c.status === "aberto").length;
  const sel = (chamados || []).find((c) => c.id === selId) || null;

  async function abrirChamado(c) {
    setSelId(c.id); setTexto(""); setErro("");
    if (c.naoLidoProfessor) {
      try { await updateDoc(doc(db, "turmas", turmaId, "chamados", c.id), { naoLidoProfessor: false }); } catch (e) { /* silencioso */ }
    }
  }
  async function responder() {
    if (!texto.trim() || !sel) return;
    setEnviando(true); setErro("");
    try {
      await updateDoc(doc(db, "turmas", turmaId, "chamados", sel.id), {
        mensagens: arrayUnion({ autor: "professor", texto: texto.trim(), em: new Date().toISOString() }),
        status: "respondido", naoLidoAluno: true, atualizadoEm: serverTimestamp(),
      });
      setTexto("");
    } catch (e) { setErro("Não foi possível enviar: " + e.message); }
    setEnviando(false);
  }
  async function mudarStatus(status) {
    if (!sel) return;
    try {
      const msgSistema = { autor: "sistema", tipo: "sistema", texto: status === "resolvido" ? "Chamado marcado como resolvido pelo professor" : "Chamado reaberto pelo professor", em: new Date().toISOString() };
      await updateDoc(doc(db, "turmas", turmaId, "chamados", sel.id), { status, atualizadoEm: serverTimestamp(), mensagens: arrayUnion(msgSistema), naoLidoAluno: true });
    }
    catch (e) { setErro("Não foi possível alterar: " + e.message); }
  }
  function alternarEtapa(k) { setDevEtapas((e) => (e.includes(k) ? e.filter((x) => x !== k) : [...e, k])); }
  function marcarTodas() { setDevEtapas(devEtapas.length === ETAPAS_DEVOLUCAO.length ? [] : ETAPAS_DEVOLUCAO.map((e) => e.key)); }
  async function devolver() {
    const docId = devDoc || sel?.documentoId;
    const nota = (documentos || []).find((d) => d.id === docId);
    if (!sel || !docId || devEtapas.length === 0 || !devTexto.trim()) { setErro("Escolha a nota, ao menos uma etapa e escreva a orientação."); return; }
    if (!window.confirm("Devolver a NF " + (nota?.numero || docId) + " para " + (sel.alunoNome || sel.matricula) + "? Etapas: " + devEtapas.join(", ") + ". Lançamentos aprovados voltam para correção e classificações devolvidas vão para a lixeira de segurança. Você já baixou o backup da turma?")) return;
    setEnviando(true); setErro(""); setDevOk("");
    try {
      const feitos = await devolverNota({ turmaId, matricula: sel.matricula, alunoNome: sel.alunoNome, docId, docNumero: nota?.numero, etapas: devEtapas, orientacao: devTexto.trim(), chamado: sel });
      setDevOk("Nota devolvida. " + (feitos.length ? feitos.join("; ") + "." : "O aluno foi avisado pelo Suporte."));
      setDevAberto(false); setDevEtapas([]); setDevTexto(MODELO_ORIENTACAO);
    } catch (e) { setErro("Não foi possível devolver: " + e.message + ". Confira se as regras novas do Firestore foram publicadas."); }
    setEnviando(false);
  }
  async function iniciar() {
    if (!nMat || !nTexto.trim()) { setErro("Escolha o aluno e escreva a mensagem."); return; }
    setEnviando(true); setErro("");
    try {
      const a = (alunos || []).find((x) => x.matricula === nMat);
      await addDoc(collection(db, "turmas", turmaId, "chamados"), {
        matricula: nMat, alunoNome: a?.nome || "", assunto: nAssunto.trim() || "Mensagem do professor",
        documentoId: null, documentoNumero: null, status: "respondido", iniciadoPor: "professor",
        mensagens: [{ autor: "professor", texto: nTexto.trim(), em: new Date().toISOString() }],
        naoLidoProfessor: false, naoLidoAluno: true,
        criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      });
      setNovo(false); setNMat(""); setNAssunto(""); setNTexto(""); setAba("respondidos");
    } catch (e) { setErro("Não foi possível enviar: " + e.message); }
    setEnviando(false);
  }

  return (
    <>
      <div className="screen-eyebrow">gestão da turma</div>
      <h2 className="screen-title">Suporte — chamados da turma</h2>
      <p className="screen-sub">Turma {turma.nome}. O aluno vê a sua resposta no menu "Suporte" dele, com um número vermelho quando há resposta nova.</p>
      {erroLeitura && <div className="balance-check bad">O Suporte ainda não funciona: cole as regras novas do Firestore no Console (veja as instruções da atualização).</div>}

      <div className="btn-row" style={{ marginBottom: 8, flexWrap: "wrap" }}>
        <button className={"btn" + (aba === "abertos" ? "" : " secondary")} onClick={() => setAba("abertos")}>Abertos ({nAbertos})</button>
        <button className={"btn" + (aba === "respondidos" ? "" : " secondary")} onClick={() => setAba("respondidos")}>Respondidos</button>
        <button className={"btn" + (aba === "resolvidos" ? "" : " secondary")} onClick={() => setAba("resolvidos")}>Resolvidos</button>
        <button className="btn secondary" onClick={() => { setNovo(!novo); setErro(""); }}>+ Mensagem ao aluno</button>
      </div>

      {novo && (
        <div className="panel"><div className="panel-head"><h3>Nova mensagem ao aluno</h3></div><div className="panel-body">
          <div className="field"><label>Aluno</label>
            <select value={nMat} onChange={(e) => setNMat(e.target.value)}>
              <option value="">— escolha —</option>
              {(alunos || []).map((a) => <option key={a.matricula} value={a.matricula}>{a.nome || a.matricula}</option>)}
            </select></div>
          <div className="field"><label>Assunto</label><input value={nAssunto} onChange={(e) => setNAssunto(e.target.value)} placeholder="Mensagem do professor" /></div>
          <div className="field"><label>Mensagem</label><textarea rows={3} style={{ width: "100%" }} value={nTexto} onChange={(e) => setNTexto(e.target.value)} /></div>
          {erro && <div className="balance-check bad">{erro}</div>}
          <div className="btn-row"><button className="btn" disabled={enviando} onClick={iniciar}>Enviar</button><button className="btn secondary" onClick={() => setNovo(false)}>Cancelar</button></div>
        </div></div>
      )}

      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        {chamados === null ? <div className="empty-state">Carregando…</div> : lista.length === 0 ? <div className="empty-state">Nenhum chamado nesta aba.</div> : (
          <table>
            <thead><tr><th>Aluno</th><th>Assunto</th><th>Nota</th><th>Atualizado</th><th>Situação</th></tr></thead>
            <tbody>
              {lista.map((c) => {
                const s = rotuloSituacao(c, "professor");
                return (
                  <tr key={c.id} style={{ cursor: "pointer", background: c.id === selId ? "#efe9d8" : undefined }} onClick={() => abrirChamado(c)}>
                    <td>{c.naoLidoProfessor ? <b>{c.alunoNome || c.matricula}</b> : (c.alunoNome || c.matricula)}</td>
                    <td>{c.assunto}</td>
                    <td className="mono">{c.documentoNumero || "—"}</td>
                    <td>{formatarDataHora(c.atualizadoEm)}</td>
                    <td><span className={"status " + s.cls}>{s.txt}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div></div>

      {sel && (
        <div className="panel">
          <div className="panel-head"><h3>{sel.alunoNome || sel.matricula} — {sel.assunto}{sel.documentoNumero ? " · NF " + sel.documentoNumero : ""}</h3></div>
          <div className="panel-body">
            {(sel.mensagens || []).map((m, i) => <Bolha key={i} m={m} />)}
            <div className="field"><textarea rows={2} style={{ width: "100%" }} placeholder="Responder ao aluno…" value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {RESPOSTAS_RAPIDAS.map((r, i) => <button key={i} className="btn secondary" style={{ fontSize: 12 }} onClick={() => setTexto(r)}>{r.length > 38 ? r.slice(0, 38) + "…" : r}</button>)}
            </div>
            {erro && <div className="balance-check bad">{erro}</div>}
            {devOk && <div className="balance-check ok">{devOk}</div>}
            {devAberto && (
              <div className="panel" style={{ borderColor: "var(--amber)", borderWidth: 2 }}>
                <div className="panel-head"><h3>Devolver nota ao aluno</h3></div>
                <div className="panel-body">
                  <div className="field"><label>Nota fiscal</label>
                    <select value={devDoc || sel.documentoId || ""} onChange={(e) => setDevDoc(e.target.value)}>
                      <option value="">— escolha —</option>
                      {(documentos || []).map((d) => <option key={d.id} value={d.id}>Nº {d.numero} — {d.direcao === "entrada" ? "entrada" : "saída"}</option>)}
                    </select></div>
                  <div className="field"><label>Etapas a devolver (na ordem do aluno)</label>
                    <label style={{ display: "block", margin: "4px 0" }}><input type="checkbox" checked={devEtapas.length === ETAPAS_DEVOLUCAO.length} onChange={marcarTodas} /> <b>Todas, do início ao fim</b></label>
                    {ETAPAS_DEVOLUCAO.map((e) => <label key={e.key} style={{ display: "block", margin: "4px 0" }}><input type="checkbox" checked={devEtapas.includes(e.key)} onChange={() => alternarEtapa(e.key)} /> {e.rotulo}</label>)}</div>
                  <div className="field"><label>Orientação ao aluno</label><textarea rows={3} style={{ width: "100%" }} value={devTexto} onChange={(e) => setDevTexto(e.target.value)} /></div>
                  <div className="aviso-pedagogico">⚠ Análise reabre como rascunho · Classificação vai para a lixeira de segurança (restaurável) · Lançamento volta como "correção necessária". Digitação o aluno já pode reeditar.</div>
                  <div className="btn-row"><button className="btn red" disabled={enviando} onClick={devolver}>{enviando ? "Devolvendo…" : "Devolver ao aluno"}</button><button className="btn secondary" onClick={() => setDevAberto(false)}>Cancelar</button></div>
                </div>
              </div>
            )}
            <div className="btn-row">
              <button className="btn" disabled={enviando || !texto.trim()} onClick={responder}>{enviando ? "Enviando…" : "Responder"}</button>
              <button className="btn secondary" onClick={() => { setDevAberto(!devAberto); setDevOk(""); }}>↩ Devolver nota ao aluno</button>
              {sel.status !== "resolvido"
                ? <button className="btn secondary" onClick={() => mudarStatus("resolvido")}>Marcar como resolvido</button>
                : <button className="btn secondary" onClick={() => mudarStatus("aberto")}>Reabrir</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
