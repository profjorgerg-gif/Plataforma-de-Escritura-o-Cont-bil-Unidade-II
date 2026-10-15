import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { FLUXO_VAZIO, PASSOS_FLUXO, documentosSemLote, normalizarFluxo, proximoIdLote } from "../../lib/fluxoLotes.js";

// Fase 1 do fluxo por etapas (2027.1): o professor monta os lotes de notas e escolhe quais estão liberados.
// Nada aqui é lido pelas telas do aluno ainda — por isso não afeta nenhuma turma.
export default function LotesFluxo({ turma }) {
  const turmaId = turma?.id;
  const documentos = useDocumentosDaTurma(turmaId);
  const [salvo, setSalvo] = useState(null);      // o que está gravado (null = carregando)
  const [cfg, setCfg] = useState(FLUXO_VAZIO);   // o que está na tela
  const [sujo, setSujo] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(null);

  useEffect(() => {
    if (!turmaId) return;
    setSalvo(null); setSujo(false); setMsg(""); setErro("");
    return onSnapshot(doc(db, "turmas", turmaId, "roteiro", "lotes"), (snap) => {
      const n = normalizarFluxo(snap.exists() ? snap.data() : null);
      setSalvo(n);
      setCfg((atual) => (sujoRef.current ? atual : n));
    }, (e) => setErro("Não foi possível ler os lotes: " + e.message));
  }, [turmaId]);
  // ref para o snapshot não sobrescrever o que o professor está editando
  const sujoRef = useRefSujo(sujo);

  if (!turma) return <div className="empty-state">Selecione uma turma em "Turmas" primeiro.</div>;
  if (salvo === null || documentos === null) return <div className="empty-state">Carregando…</div>;

  const alterar = (fn) => { setCfg((c) => fn(c)); setSujo(true); setMsg(""); };
  const semLote = documentosSemLote(documentos, cfg.lotes);
  const numeroDe = (id) => { const d = documentos.find((x) => x.id === id); return d ? "Nº " + d.numero : id; };

  function novoLote() {
    alterar((c) => ({ ...c, lotes: [...c.lotes, { id: proximoIdLote(c.lotes), nome: "Lote " + (c.lotes.length + 1), documentos: [], liberado: false, prazo: "" }] }));
  }
  function editarLote(id, campos) {
    alterar((c) => ({ ...c, lotes: c.lotes.map((l) => (l.id === id ? { ...l, ...campos } : l)) }));
  }
  function alternarDoc(loteId, docId) {
    alterar((c) => ({
      ...c,
      lotes: c.lotes.map((l) => {
        if (l.id !== loteId) return l;
        const tem = l.documentos.includes(docId);
        return { ...l, documentos: tem ? l.documentos.filter((x) => x !== docId) : [...l.documentos, docId] };
      }),
    }));
  }
  function removerLote(id) {
    alterar((c) => ({ ...c, lotes: c.lotes.filter((l) => l.id !== id) }));
    setRemovendo(null);
  }

  async function salvar() {
    setSalvando(true); setErro(""); setMsg("");
    try {
      await setDoc(doc(db, "turmas", turmaId, "roteiro", "lotes"), {
        fluxoAtivo: cfg.fluxoAtivo === true,
        lotes: cfg.lotes.map((l) => ({ id: l.id, nome: (l.nome || "").trim() || l.id, documentos: l.documentos, liberado: l.liberado === true, prazo: (l.prazo || "").trim() })),
        atualizadoEm: serverTimestamp(),
      });
      setSujo(false); setMsg("Lotes salvos.");
    } catch (e) { setErro("Não foi possível salvar: " + e.message + ". O que você editou continua na tela."); }
    setSalvando(false);
  }
  function descartar() { setCfg(salvo); setSujo(false); setMsg(""); setErro(""); }

  return (
    <>
      <div className="screen-eyebrow">planejamento · 2027.1</div>
      <h2 className="screen-title">Lotes da Etapa 1</h2>
      <p className="screen-sub">Agrupe as notas em lotes. No fluxo com aprovação, o aluno envia cada passo de um lote ({PASSOS_FLUXO.map((p) => p.rotulo).join(" → ")}) e só avança depois da sua aprovação.</p>

      <div className="aviso-pedagogico">⚠ Esta é a configuração do fluxo. As telas do aluno ainda <b>não</b> usam estes lotes: nada muda para os alunos, mesmo com o fluxo ligado. As turmas atuais devem ficar desligadas.</div>

      <div className="panel">
        <div className="panel-head"><h3>{turma.nome}</h3></div>
        <div className="panel-body">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={cfg.fluxoAtivo} onChange={(e) => alterar((c) => ({ ...c, fluxoAtivo: e.target.checked }))} />
            Fluxo com aprovação ligado nesta turma <span style={{ color: "#7a7466" }}>(ainda sem efeito para os alunos)</span>
          </label>
        </div>
      </div>

      {cfg.lotes.length === 0 && <div className="empty-state">Nenhum lote criado. Clique em "+ Novo lote".</div>}

      {cfg.lotes.map((l) => (
        <div className="panel" key={l.id}>
          <div className="panel-head"><h3>{l.nome || l.id}</h3><span className={"status " + (l.liberado ? "aprovado" : "rascunho")}>{l.liberado ? "liberado" : "bloqueado"}</span></div>
          <div className="panel-body">
            <div className="grid-2">
              <div className="field"><label htmlFor={"nome-" + l.id}>Nome do lote</label><input id={"nome-" + l.id} value={l.nome} onChange={(e) => editarLote(l.id, { nome: e.target.value })} /></div>
              <div className="field"><label htmlFor={"prazo-" + l.id}>Prazo (texto livre)</label><input id={"prazo-" + l.id} value={l.prazo} placeholder="ex.: 20/02" onChange={(e) => editarLote(l.id, { prazo: e.target.value })} /></div>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0 10px" }}>
              <input type="checkbox" checked={l.liberado} onChange={(e) => editarLote(l.id, { liberado: e.target.checked })} /> Lote liberado para a turma
            </label>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, color: "#8B8477", marginBottom: 6 }}>Notas deste lote ({l.documentos.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
                {documentos.length === 0 && <span style={{ color: "#7a7466" }}>Esta turma ainda não tem documentos fiscais.</span>}
                {[...documentos].sort((a, b) => String(a.numero).localeCompare(String(b.numero), "pt-BR", { numeric: true })).map((d) => {
                  const emOutro = cfg.lotes.find((x) => x.id !== l.id && x.documentos.includes(d.id));
                  return (
                    <label key={d.id} style={{ display: "flex", gap: 5, alignItems: "center", opacity: emOutro ? 0.45 : 1 }} title={emOutro ? "Já está em " + emOutro.nome : ""}>
                      <input type="checkbox" disabled={!!emOutro} checked={l.documentos.includes(d.id)} onChange={() => alternarDoc(l.id, d.id)} />
                      Nº {d.numero}{emOutro ? " (" + emOutro.nome + ")" : ""}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="btn-row">
              {removendo === l.id ? (
                <>
                  <span>Remover o {l.nome || l.id}?</span>
                  <button className="btn secondary" onClick={() => removerLote(l.id)}>Sim, remover</button>
                  <button className="btn secondary" onClick={() => setRemovendo(null)}>Não</button>
                </>
              ) : (
                <button className="btn secondary" onClick={() => setRemovendo(l.id)}>Remover lote</button>
              )}
            </div>
          </div>
        </div>
      ))}

      {semLote.length > 0 && cfg.lotes.length > 0 && (
        <div className="helper-note">Notas ainda sem lote ({semLote.length}): {semLote.map((d) => "Nº " + d.numero).join(", ")}.</div>
      )}

      <div className="btn-row">
        <button className="btn secondary" onClick={novoLote}>+ Novo lote</button>
        <button className="btn" disabled={!sujo || salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar lotes"}</button>
        {sujo && <button className="btn secondary" disabled={salvando} onClick={descartar}>Descartar alterações</button>}
        {sujo && <span style={{ color: "#7a7466" }}>● alterações não salvas</span>}
      </div>
      {msg && <div className="helper-note">{msg}</div>}
      {erro && <div className="aviso-pedagogico">{erro}</div>}
    </>
  );
}

function useRefSujo(valor) { const r = useRef(valor); r.current = valor; return r; }
