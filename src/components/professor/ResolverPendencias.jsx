import { useState } from "react";
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "../../firebase.js";
import { formatarDataHora } from "../aluno/SuporteAluno.jsx";
import { conferirAluno } from "../../lib/conferenciaFila.js";
import { TIPOS_PEND, parseItens, sugerirClassificacao, candidatosDuplicado, candidatosDivergente, orientacaoDuplicado, orientacaoDivergencia } from "../../lib/resolverPendencias.js";

// Resolução assistida das pendências do professor (2026-10-15).
// Cada item do chamado "Pendência do professor" ganha o botão Resolver. SEMPRE abre uma janela
// com os dados atuais do aluno e só grava depois do clique de confirmação do professor.
// Nunca mexe em lançamento aprovado. Classificação removida vai antes para a lixeira de segurança.

const moeda = (v) => { const n = Number(v); return isNaN(n) ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };
const totalD = (l) => (l.partidas || []).filter((p) => p.tipo === "D").reduce((s, p) => s + (Number(p.valor) || 0), 0);
const partidasTxt = (l) => (l.partidas || []).map((p) => p.tipo + " " + p.conta + " " + moeda(p.valor)).join(" · ");

export default function ResolverPendencias({ turmaId, chamado, documentos }) {
  const [aberto, setAberto] = useState(null); // item em resolução
  const [dados, setDados] = useState(null);   // {lista, sugestao...}
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [gravando, setGravando] = useState(false);
  const [conf, setConf] = useState(false);
  const [manterId, setManterId] = useState("");
  const [alvoId, setAlvoId] = useState("");
  const [orient, setOrient] = useState("");

  const itens = parseItens((chamado.mensagens || []).find((m) => m.texto)?.texto || "");
  const mat = chamado.alunoMatricula || chamado.matricula;
  const feitos = chamado.resolvidosAuto || [];
  if (!itens.length || !mat) return null;
  const base = ["turmas", turmaId, "alunos", mat];
  const notaDe = (num) => (documentos || []).find((d) => String(d.numero) === String(num));
  const nResolvidos = itens.filter((i) => feitos.includes(i.chave)).length;

  function fechar() { setAberto(null); setDados(null); setErro(""); setConf(false); setGravando(false); }

  async function abrir(it) {
    setAberto(it); setDados(null); setErro(""); setAviso(""); setConf(false); setCarregando(true);
    try {
      const nota = notaDe(it.num);
      if (!nota) throw new Error("não achei a NF " + it.num + " nas notas desta turma");
      if (it.tipo === "classificacao") {
        const s = await getDocs(query(collection(db, ...base, "classificacoes"), where("documento", "==", nota.id)));
        const lista = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        const sug = sugerirClassificacao(lista);
        setManterId(sug.manterId || ""); setDados({ nota, lista, sug });
      } else {
        const s = await getDocs(collection(db, ...base, "lancamentos"));
        const todos = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        const daNota = todos.filter((l) => l.documento === nota.id);
        const res = conferirAluno(daNota.filter((l) => l.status === "enviado" || l.status === "aprovado"), todos, documentos);
        const cand = it.tipo === "lancdup" ? candidatosDuplicado(daNota.filter((l) => l.status === "enviado"), res) : candidatosDivergente(daNota.filter((l) => l.status === "enviado"), res);
        const primeiro = cand[0];
        setAlvoId(primeiro ? primeiro.id : "");
        setOrient(primeiro ? (it.tipo === "lancdup" ? orientacaoDuplicado(it.num) : orientacaoDivergencia(res[primeiro.id])) : "");
        setDados({ nota, daNota, res, cand });
      }
    } catch (e) { setErro("Não foi possível carregar: " + (e.message || e)); }
    setCarregando(false);
  }

  async function registrar(it, texto) {
    await updateDoc(doc(db, "turmas", turmaId, "chamados", chamado.id), {
      resolvidosAuto: arrayUnion(it.chave), atualizadoEm: serverTimestamp(),
      mensagens: arrayUnion({ autor: "sistema", tipo: "sistema", texto: "NF " + it.num + " — " + texto, em: new Date().toISOString() }),
    });
  }

  async function removerClassificacao() {
    const rm = dados.lista.filter((c) => c.id !== manterId);
    setGravando(true); setErro("");
    try {
      for (const c of rm) {
        const { id, ...resto } = c;
        await addDoc(collection(db, ...base, "lixeira"), {
          tipo: "classificacao", colecao: "classificacoes", origemId: id, documento: dados.nota.id,
          documentoNumero: dados.nota.numero || null, dados: resto,
          excluidoEm: serverTimestamp(), excluidoPor: auth.currentUser?.email || "",
        });
        await deleteDoc(doc(db, ...base, "classificacoes", id));
      }
      await registrar(aberto, "classificação duplicada resolvida: removida(s) " + rm.length + " (cópia na lixeira de segurança).");
      setAviso("Pronto: " + rm.length + " classificação(ões) removida(s), cópia na lixeira de segurança."); fechar();
    } catch (e) { setErro("Não foi possível remover: " + (e.message || e) + ". Nada é apagado se a cópia falhou."); setGravando(false); }
  }

  async function devolver() {
    const l = dados.daNota.find((x) => x.id === alvoId);
    if (!l || l.status === "aprovado") return;
    setGravando(true); setErro("");
    try {
      const o = orient.trim() || "Revisar lançamento.";
      const historico = [...(l.historicoCorrecoes || []), { obs: o, em: new Date().toISOString() }];
      await updateDoc(doc(db, ...base, "lancamentos", l.id), { status: "correcao", obsCorrecao: o, historicoCorrecoes: historico, ...(aberto.tipo === "lancdup" ? { podeExcluir: true } : {}) });
      await registrar(aberto, (aberto.tipo === "lancdup" ? "lançamento duplicado" : "divergência") + " devolvido ao aluno pela Fila de correção.");
      setAviso("Pronto: lançamento devolvido ao aluno."); fechar();
    } catch (e) { setErro("Não foi possível devolver: " + (e.message || e)); setGravando(false); }
  }

  async function soMarcar() {
    setGravando(true);
    try { await registrar(aberto, "marcado como resolvido pelo professor, sem alterar dados."); fechar(); }
    catch (e) { setErro("Não foi possível marcar: " + (e.message || e)); setGravando(false); }
  }

  const cardC = (c, mant) => (
    <div key={c.id} style={{ border: mant ? "2px solid var(--green)" : "2px dashed var(--red)", padding: "8px 10px", fontSize: 13.5, flex: "1 1 260px" }}>
      <b style={{ fontSize: 11 }}>{mant ? "MANTER" : "REMOVER"}</b><br />
      Criada em {formatarDataHora(c.criadoEm)}<br />
      Situação: <b>{c.status || "—"}</b>{c.status === "lançada" ? " (virou lançamento)" : ""}<br />
      {(c.fato || c.historico || "")} · valor {c.valor ?? "—"}
    </div>
  );

  return (
    <div style={{ margin: "10px 0" }}>
      <div className="helper-note" style={{ marginBottom: 8 }}>
        <b>Resolução assistida:</b> {nResolvidos} de {itens.length} item(ns) resolvido(s). O sistema sugere, você confirma; nada é gravado sem o seu clique.
        {nResolvidos === itens.length && " Todos resolvidos: pode marcar o chamado como resolvido."}
      </div>
      {aviso && <div className="helper-note" role="status" style={{ color: "var(--green)", marginBottom: 8 }}>{aviso}</div>}
      {itens.map((it) => {
        const ok = feitos.includes(it.chave);
        return (
          <div key={it.chave} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", border: "1px solid var(--line)", padding: "8px 10px", marginBottom: 6, background: ok ? "var(--green-bg, transparent)" : undefined }}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{it.tipo ? TIPOS_PEND[it.tipo].rotulo : "OUTRO"}</span>
            <span style={{ flex: 1, minWidth: 220 }}>Nº {it.num} — {it.titulo}</span>
            {ok ? <b style={{ color: "var(--green)" }}>✓ Resolvido</b>
              : it.tipo ? <button className="btn" onClick={() => abrir(it)}>Resolver</button>
                : <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>resolver à mão</span>}
          </div>
        );
      })}

      {aberto && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 1000 }}>
          <div style={{ background: "var(--card, #fff)", border: "2px solid var(--green)", maxWidth: 760, width: "100%", maxHeight: "92vh", overflow: "auto", padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{TIPOS_PEND[aberto.tipo].rotulo} · NF {aberto.num}</h3>
            {carregando && <p>Carregando dados do aluno…</p>}
            {erro && <div className="aviso-pedagogico">{erro}</div>}
            {dados && aberto.tipo === "classificacao" && (
              dados.lista.length < 2 ? (
                <>
                  <p>Hoje só existe {dados.lista.length} classificação desta nota: nada a remover (talvez já tenha sido resolvido).</p>
                  <div className="btn-row"><button className="btn" disabled={gravando} onClick={soMarcar}>Marcar este item como resolvido</button> <button className="btn secondary" onClick={fechar}>Fechar</button></div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{dados.lista.map((c) => cardC(c, c.id === manterId))}</div>
                  <div className="helper-note" style={{ margin: "10px 0" }}>Sugestão: {dados.sug.motivo}. A(s) outra(s) vai(vão) para a lixeira de segurança e pode(m) ser restaurada(s). Nenhum lançamento é alterado.{dados.sug.incerto ? " Confira com atenção." : ""}</div>
                  {dados.lista.length > 1 && <div className="field"><label>Manter a classificação</label>
                    <select value={manterId} onChange={(e) => { setManterId(e.target.value); setConf(false); }}>
                      {dados.lista.map((c, i) => <option key={c.id} value={c.id}>{String.fromCharCode(65 + i)} · {c.status || "—"} · {formatarDataHora(c.criadoEm)}</option>)}
                    </select></div>}
                  <label style={{ display: "block", margin: "8px 0" }}><input type="checkbox" checked={conf} onChange={(e) => setConf(e.target.checked)} /> Conferi e quero remover as demais.</label>
                  <div className="btn-row"><button className="btn red" disabled={!conf || gravando} onClick={removerClassificacao}>{gravando ? "Removendo…" : "Remover e guardar cópia"}</button> <button className="btn secondary" onClick={fechar}>Cancelar</button></div>
                </>
              )
            )}
            {dados && aberto.tipo !== "classificacao" && (
              !dados.cand.length ? (
                <>
                  <p>Não encontrei lançamento <b>enviado</b> {aberto.tipo === "lancdup" ? "repetido" : "com divergência"} nesta nota. Talvez já tenha sido devolvido, corrigido ou aprovado.</p>
                  <div className="btn-row"><button className="btn" disabled={gravando} onClick={soMarcar}>Marcar este item como resolvido</button> <button className="btn secondary" onClick={fechar}>Fechar</button></div>
                </>
              ) : (
                <>
                  {dados.cand.length > 1 && <div className="field"><label>Lançamento a devolver</label>
                    <select value={alvoId} onChange={(e) => { setAlvoId(e.target.value); const r = dados.res[e.target.value] || {}; setOrient(aberto.tipo === "lancdup" ? orientacaoDuplicado(aberto.num) : orientacaoDivergencia(r)); }}>
                      {dados.cand.map((l) => <option key={l.id} value={l.id}>{l.historico || l.id} · {moeda(totalD(l))}</option>)}
                    </select></div>}
                  {dados.cand.filter((l) => l.id === alvoId).map((l) => (
                    <div key={l.id} style={{ border: "2px dashed var(--red)", padding: "8px 10px", fontSize: 13.5, marginBottom: 8 }}>
                      <b style={{ fontSize: 11 }}>DEVOLVER</b><br />Enviado em {formatarDataHora(l.enviadoEm || l.criadoEm)} · <b>{l.status}</b><br />{l.historico}<br /><span style={{ fontSize: 12 }}>{partidasTxt(l)}</span>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Conferência: {(dados.res[l.id] || {}).motivo}</div>
                    </div>
                  ))}
                  {aberto.tipo === "lancdup" && dados.daNota.filter((l) => l.status === "aprovado").length > 0 && <div className="helper-note">Já existe lançamento aprovado desta nota; ele não será alterado.</div>}
                  {aberto.tipo === "diverg" && <div className="helper-note">A decisão é sua: pode ser erro do aluno ou do gabarito. Se for do gabarito, cancele e corrija o gabarito.</div>}
                  <div className="field"><label>Orientação ao aluno (editável){aberto.tipo === "lancdup" ? " · o aluno poderá excluir o lançamento" : ""}</label>
                    <textarea rows={4} style={{ width: "100%" }} value={orient} onChange={(e) => setOrient(e.target.value)} /></div>
                  <div className="btn-row"><button className="btn" disabled={gravando || !alvoId || !orient.trim()} onClick={devolver}>{gravando ? "Devolvendo…" : "Devolver ao aluno"}</button> <button className="btn secondary" onClick={fechar}>Cancelar</button></div>
                </>
              )
            )}
            {!dados && !carregando && <div className="btn-row"><button className="btn secondary" onClick={fechar}>Fechar</button></div>}
          </div>
        </div>
      )}
    </div>
  );
}
