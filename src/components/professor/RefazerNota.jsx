import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { auth } from "../../firebase.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { formatarDataHora } from "../aluno/SuporteAluno.jsx";

// Refazer nota do aluno (2026-10-09). O professor escolhe aluno + nota fiscal e
// apaga, de uma vez, tudo que o aluno fez sobre aquela nota (digitação, análise,
// classificações e lançamentos do diário) para ele refazer do zero.
// SEGURANÇA: antes de apagar, cada item é COPIADO para
// turmas/{t}/alunos/{m}/lixeira — e pode ser restaurado nesta mesma tela.
// Só mexe nos itens daquela nota e daquele aluno.

const TIPOS = {
  digitacao: { colecao: "digitacoesNFe", rotulo: "Digitação da NF-e" },
  analise: { colecao: "analisesFiscais", rotulo: "Análise fiscal" },
  classificacao: { colecao: "classificacoes", rotulo: "Classificação contábil" },
  lancamento: { colecao: "lancamentos", rotulo: "Lançamento do diário" },
};

function moeda(v) {
  const n = Number(v);
  return isNaN(n) ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function resumo(tipo, d) {
  if (tipo === "digitacao") return "Total digitado: " + (d.total ?? "—");
  if (tipo === "analise") return "Status: " + (d.status || "—");
  if (tipo === "classificacao") return (d.fato || d.historico || "") + " · valor " + (d.valor ?? "—") + " · " + (d.status || "");
  const deb = (d.partidas || []).filter((p) => p.tipo === "D").reduce((t, p) => t + (Number(p.valor) || 0), 0);
  return (d.historico || "") + " · total do lançamento " + moeda(deb) + " · " + (d.status || "");
}

export default function RefazerNota({ turma }) {
  const turmaId = turma?.id;
  const alunos = useAlunosDaTurma(turmaId);
  const documentos = useDocumentosDaTurma(turmaId);
  const [mat, setMat] = useState("");
  const [docId, setDocId] = useState("");
  const [itens, setItens] = useState(null);       // itens existentes
  const [lixeira, setLixeira] = useState(null);   // itens já apagados (restauráveis)
  const [carregando, setCarregando] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [avisar, setAvisar] = useState(true);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [executando, setExecutando] = useState(false);

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;

  const base = (m) => ["turmas", turmaId, "alunos", m];
  const aluno = (alunos || []).find((a) => a.matricula === mat);
  const nota = (documentos || []).find((d) => d.id === docId);

  async function carregar(m = mat, d = docId) {
    if (!m || !d) { setItens(null); setLixeira(null); return; }
    setCarregando(true); setErro("");
    try {
      const lista = [];
      for (const tipo of ["digitacao", "analise"]) {
        const s = await getDoc(doc(db, ...base(m), TIPOS[tipo].colecao, d));
        if (s.exists()) lista.push({ tipo, id: s.id, dados: s.data() });
      }
      for (const tipo of ["classificacao", "lancamento"]) {
        const s = await getDocs(query(collection(db, ...base(m), TIPOS[tipo].colecao), where("documento", "==", d)));
        s.docs.forEach((x) => lista.push({ tipo, id: x.id, dados: x.data() }));
      }
      setItens(lista);
      const l = await getDocs(query(collection(db, ...base(m), "lixeira"), where("documento", "==", d)));
      setLixeira(l.docs.map((x) => ({ lixId: x.id, ...x.data() })).sort((a, b) => (b.excluidoEm?.toMillis?.() || 0) - (a.excluidoEm?.toMillis?.() || 0)));
    } catch (e) {
      setErro("Não foi possível consultar: " + e.message + " (as regras novas do Firestore já foram coladas no Console?)");
      setItens(null); setLixeira(null);
    }
    setCarregando(false);
  }

  async function refazer() {
    if (!itens || itens.length === 0) return;
    setExecutando(true); setErro(""); setMsg("");
    try {
      // 1) copia TUDO para a lixeira; se qualquer cópia falhar, nada é apagado.
      const copias = [];
      for (const it of itens) {
        const ref = await addDoc(collection(db, ...base(mat), "lixeira"), {
          tipo: it.tipo, colecao: TIPOS[it.tipo].colecao, origemId: it.id, documento: docId,
          documentoNumero: nota?.numero || null, dados: it.dados,
          excluidoEm: serverTimestamp(), excluidoPor: auth.currentUser?.email || "",
        });
        copias.push(ref);
      }
      // 2) só então apaga os originais.
      for (const it of itens) await deleteDoc(doc(db, ...base(mat), TIPOS[it.tipo].colecao, it.id));
      // 3) avisa o aluno pelo Suporte (se marcado).
      if (avisar) {
        try {
          await addDoc(collection(db, "turmas", turmaId, "chamados"), {
            matricula: mat, alunoNome: aluno?.nome || "", assunto: "Nota reaberta para refazer",
            documentoId: docId, documentoNumero: nota?.numero || null, status: "respondido", iniciadoPor: "professor",
            mensagens: [{ autor: "professor", em: new Date().toISOString(),
              texto: "Reabri a nota " + (nota?.numero || docId) + " para você refazer. Comece pela Digitação e análise fiscal, depois a Classificação contábil e o Livro diário dessa nota. Qualquer dúvida, responda aqui." }],
            naoLidoProfessor: false, naoLidoAluno: true, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
          });
        } catch (e) { /* o aviso é opcional */ }
      }
      setMsg(itens.length + " item(ns) apagado(s) e guardado(s) na lixeira de segurança. A aluna/o aluno já pode refazer a nota.");
      setConfirmacao("");
      await carregar();
    } catch (e) { setErro("Parou no meio: " + e.message + ". Nada foi perdido: confira a lixeira abaixo."); await carregar(); }
    setExecutando(false);
  }

  async function restaurar(l) {
    setErro(""); setMsg("");
    try {
      const destino = doc(db, ...base(mat), l.colecao, l.origemId);
      if ((await getDoc(destino)).exists()) { setErro("Já existe um item no lugar deste. Para restaurar, apague o atual antes (ou refaça a nota)."); return; }
      await setDoc(destino, l.dados);
      await deleteDoc(doc(db, ...base(mat), "lixeira", l.lixId));
      setMsg("Item restaurado.");
      await carregar();
    } catch (e) { setErro("Não foi possível restaurar: " + e.message); }
  }

  const aprovados = (itens || []).filter((i) => i.tipo === "lancamento" && i.dados.status === "aprovado").length;
  const confirmou = confirmacao.trim().toUpperCase() === "REFAZER";

  return (
    <>
      <div className="screen-eyebrow">gestão da turma</div>
      <h2 className="screen-title">Refazer nota do aluno</h2>
      <p className="screen-sub">Apaga tudo que o aluno fez sobre UMA nota fiscal — digitação, análise fiscal, classificação e lançamentos — para ele refazer do zero. Antes de apagar, tudo é guardado numa lixeira de segurança e pode ser restaurado aqui. Outras notas e outros alunos não são afetados.</p>

      <div className="panel"><div className="panel-body">
        <div className="field"><label>Aluno</label>
          <select value={mat} onChange={(e) => { setMat(e.target.value); setMsg(""); carregar(e.target.value, docId); }}>
            <option value="">— escolha —</option>
            {(alunos || []).map((a) => <option key={a.matricula} value={a.matricula}>{a.nome || a.matricula}</option>)}
          </select></div>
        <div className="field"><label>Nota fiscal</label>
          <select value={docId} onChange={(e) => { setDocId(e.target.value); setMsg(""); carregar(mat, e.target.value); }}>
            <option value="">— escolha —</option>
            {(documentos || []).map((d) => <option key={d.id} value={d.id}>Nº {d.numero} — {d.direcao === "entrada" ? "entrada" : "saída"}</option>)}
          </select></div>
        {carregando && <div className="helper-note">Consultando…</div>}
        {erro && <div className="balance-check bad">{erro}</div>}
        {msg && <div className="balance-check ok">{msg}</div>}
      </div></div>

      {itens && (
        <div className="panel">
          <div className="panel-head"><h3>O que existe hoje — {aluno?.nome || mat} · NF {nota?.numero}</h3></div>
          <div className="panel-body" style={{ padding: 0 }}>
            {itens.length === 0 ? <div className="empty-state">O aluno não tem nada gravado para esta nota.</div> : (
              <table>
                <thead><tr><th>Item</th><th>Resumo</th><th>Situação</th></tr></thead>
                <tbody>{itens.map((i) => (
                  <tr key={i.tipo + i.id}><td>{TIPOS[i.tipo].rotulo}</td><td>{resumo(i.tipo, i.dados)}</td>
                    <td><span className={"status " + (i.dados.status === "aprovado" ? "aprovado" : "rascunho")}>{i.dados.status || "salvo"}</span></td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
          {itens.length > 0 && (
            <div className="panel-body">
              <div className="aviso-pedagogico">⚠ Serão apagados {itens.length} item(ns) desta nota para este aluno.
                {aprovados > 0 && " " + aprovados + " lançamento(s) já está(ão) APROVADO(S): razão, balancete e DRE do aluno vão mudar."} Recomendo "Baixar backup" da turma antes. Tudo fica guardado na lixeira de segurança.</div>
              <label style={{ display: "block", margin: "8px 0" }}><input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} /> Avisar o aluno pelo Suporte</label>
              <div className="field"><label>Para confirmar, digite REFAZER</label><input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} /></div>
              <div className="btn-row"><button className="btn red" disabled={!confirmou || executando} onClick={refazer}>{executando ? "Apagando…" : "Apagar e deixar o aluno refazer"}</button></div>
            </div>
          )}
        </div>
      )}

      {lixeira && lixeira.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Lixeira de segurança desta nota</h3></div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table>
              <thead><tr><th>Item</th><th>Resumo</th><th>Apagado em</th><th></th></tr></thead>
              <tbody>{lixeira.map((l) => (
                <tr key={l.lixId}><td>{TIPOS[l.tipo]?.rotulo || l.tipo}</td><td>{resumo(l.tipo, l.dados || {})}</td><td>{formatarDataHora(l.excluidoEm)}</td>
                  <td><button className="btn secondary" onClick={() => restaurar(l)}>restaurar</button></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
