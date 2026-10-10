import { useState } from "react";
import { addDoc, collection, doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useChamados } from "../../hooks/useChamados.js";

// Suporte — visão do aluno (2026-10-09). Abre chamados para o professor e
// acompanha as respostas. Só escreve na coleção "chamados"; nunca toca em
// digitações, análises, classificações ou lançamentos.

export const ASSUNTOS_SUPORTE = [
  "Erro na nota fiscal / gabarito",
  "Dúvida sobre o exercício",
  "Problema técnico na plataforma",
  "Perdi / não encontro algo que fiz",
  "Outro assunto",
];

export function formatarDataHora(v) {
  const d = v?.toDate ? v.toDate() : (v ? new Date(v) : null);
  if (!d || isNaN(d)) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function rotuloSituacao(c, visao) {
  if (c.status === "resolvido") return { cls: "aprovado", txt: "resolvido" };
  if (visao === "aluno") return c.status === "respondido" ? { cls: "aprovado", txt: "respondido" } : { cls: "enviado", txt: "aguardando professor" };
  return c.status === "aberto" ? { cls: "correcao", txt: "novo" } : { cls: "enviado", txt: "aguardando aluno" };
}

const ROTULO_ETAPA = { digitacao: "Digitação da NF-e", analise: "Análise fiscal", classificacao: "Classificação contábil", lancamento: "Lançamento no diário" };

function Conversa({ c }) {
  return (
    <div>
      {(c.mensagens || []).map((m, i) => m.tipo === "sistema" ? (
        <div key={i} style={{ textAlign: "center", color: "#7a7466", fontSize: 12, margin: "8px 0" }}>{m.texto} · {formatarDataHora(m.em)}</div>
      ) : (
        <div key={i} style={{
          padding: "10px 12px", borderRadius: 8, margin: "8px 0", maxWidth: "88%", fontSize: 14, whiteSpace: "pre-wrap",
          background: m.tipo === "devolucao" ? "#FBF1DC" : m.autor === "professor" ? "#E5EFEA" : "#fff",
          border: "1px solid " + (m.tipo === "devolucao" ? "#e2c27a" : m.autor === "professor" ? "#b9d3c7" : "#d9d2c0"),
          marginLeft: m.autor === "professor" ? "auto" : 0,
        }}>
          <small style={{ display: "block", color: "#7a7466", fontSize: 11, marginBottom: 3 }}>
            {m.autor === "professor" ? "Professor" : "Você"} · {formatarDataHora(m.em)}
          </small>
          {m.tipo === "devolucao" && (
            <div style={{ marginBottom: 6 }}>
              <b>↩ Nota {m.documentoNumero || ""} devolvida para você refazer</b>
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(m.etapas || []).map((e) => <span key={e} className="tag-pill warn">{ROTULO_ETAPA[e] || e}</span>)}
              </div>
            </div>
          )}
          {m.texto}
          {m.tipo === "devolucao" && <div className="helper-note" style={{ marginTop: 8 }}>Refaça as etapas na ordem do menu. Ao terminar, responda este chamado.</div>}
        </div>
      ))}
    </div>
  );
}

function ChamadoItem({ c, turmaId }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const sit = rotuloSituacao(c, "aluno");

  async function abrir() {
    const novo = !aberto;
    setAberto(novo);
    if (novo && c.naoLidoAluno) {
      try { await updateDoc(doc(db, "turmas", turmaId, "chamados", c.id), { naoLidoAluno: false }); } catch (e) { /* silencioso */ }
    }
  }
  async function responder() {
    if (!texto.trim()) return;
    setEnviando(true); setErro("");
    try {
      await updateDoc(doc(db, "turmas", turmaId, "chamados", c.id), {
        mensagens: arrayUnion({ autor: "aluno", texto: texto.trim(), em: new Date().toISOString() }),
        status: "aberto", naoLidoProfessor: true, atualizadoEm: serverTimestamp(),
      });
      setTexto("");
    } catch (e) { setErro("Não foi possível enviar: " + e.message); }
    setEnviando(false);
  }

  return (
    <div style={{ borderBottom: "1px solid #e4dfd0", padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", gap: 8 }} onClick={abrir}>
        <b>{c.assunto}{c.documentoNumero ? " · NF " + c.documentoNumero : ""}</b>
        <span className={"status " + sit.cls}>{sit.txt}{c.naoLidoAluno && <span className="nav-badge" style={{ marginLeft: 6 }}>1</span>}</span>
      </div>
      {aberto && (
        <>
          <Conversa c={c} />
          {c.status !== "resolvido" ? (
            <>
              <div className="field"><textarea rows={2} style={{ width: "100%" }} placeholder="Escreva uma resposta…" value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
              {erro && <div className="balance-check bad">{erro}</div>}
              <div className="btn-row"><button className="btn" disabled={enviando || !texto.trim()} onClick={responder}>{enviando ? "Enviando…" : "Responder"}</button></div>
            </>
          ) : <div className="helper-note">Chamado resolvido pelo professor. Se precisar, abra um novo chamado.</div>}
        </>
      )}
    </div>
  );
}

export default function SuporteAluno({ turmaId, matricula, nome, documentos }) {
  const { chamados, erro: erroLeitura } = useChamados(turmaId, matricula);
  const [assunto, setAssunto] = useState(ASSUNTOS_SUPORTE[0]);
  const [docId, setDocId] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  async function enviar() {
    if (!texto.trim()) { setErro("Escreva a mensagem."); return; }
    setEnviando(true); setErro(""); setOk("");
    try {
      const d = (documentos || []).find((x) => x.id === docId);
      await addDoc(collection(db, "turmas", turmaId, "chamados"), {
        matricula, alunoNome: nome || "", assunto,
        documentoId: docId || null, documentoNumero: d?.numero || null,
        status: "aberto", iniciadoPor: "aluno",
        mensagens: [{ autor: "aluno", texto: texto.trim(), em: new Date().toISOString() }],
        naoLidoProfessor: true, naoLidoAluno: false,
        criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      });
      setTexto(""); setDocId(""); setOk("Chamado enviado. A resposta do professor aparece aqui mesmo, em \"Meus chamados\".");
    } catch (e) { setErro("Não foi possível enviar o chamado: " + e.message); }
    setEnviando(false);
  }

  return (
    <>
      <div className="screen-eyebrow">apoio e consulta</div>
      <h2 className="screen-title">Suporte</h2>
      <p className="screen-sub">Fale com o professor sobre dúvidas ou problemas. Você vê a resposta aqui mesmo, em "Meus chamados" — o menu mostra um número vermelho quando há resposta nova.</p>

      {erroLeitura && <div className="balance-check bad">O Suporte ainda não está liberado no banco de dados. Avise o professor.</div>}

      <div className="panel">
        <div className="panel-head"><h3>Novo chamado</h3></div>
        <div className="panel-body">
          <div className="field"><label>Assunto</label>
            <select value={assunto} onChange={(e) => setAssunto(e.target.value)}>{ASSUNTOS_SUPORTE.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="field"><label>Nota relacionada (opcional)</label>
            <select value={docId} onChange={(e) => setDocId(e.target.value)}>
              <option value="">— nenhuma —</option>
              {(documentos || []).map((d) => <option key={d.id} value={d.id}>Nº {d.numero} — {d.direcao === "entrada" ? "entrada" : "saída"}</option>)}
            </select></div>
          <div className="field"><label>Mensagem</label><textarea rows={3} style={{ width: "100%" }} value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
          {erro && <div className="balance-check bad">{erro}</div>}
          {ok && <div className="balance-check ok">{ok}</div>}
          <div className="btn-row"><button className="btn" disabled={enviando} onClick={enviar}>{enviando ? "Enviando…" : "Enviar chamado"}</button></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Meus chamados</h3></div>
        <div className="panel-body">
          {chamados === null ? <div className="empty-state">Carregando…</div>
            : chamados.length === 0 ? <div className="empty-state">Você ainda não abriu nenhum chamado.</div>
            : chamados.map((c) => <ChamadoItem key={c.id} c={c} turmaId={turmaId} />)}
        </div>
      </div>
    </>
  );
}
