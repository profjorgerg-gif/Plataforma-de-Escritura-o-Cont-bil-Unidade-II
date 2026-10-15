import { useCallback, useEffect, useRef, useState } from "react";
import { collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { PASSOS_FLUXO } from "../../lib/fluxoLotes.js";

const nomePasso = (k) => (PASSOS_FLUXO.find((p) => p.key === k) || {}).rotulo || k;

// Pré-conferência da DIGITAÇÃO pelo gabarito (mesma regra do "Conferir digitação" do aluno). Só informa; quem decide é o professor.
function preConferir(passo, reg, digs, documentos) {
  if (passo !== "digitacao") return { ok: null, texto: "sem pré-conferência" };
  const ruins = [];
  (reg.documentos || []).forEach((id) => {
    const d = digs[id]; const g = documentos.find((x) => x.id === id);
    const num = g ? g.numero : id;
    if (!d) { ruins.push(num + " (não digitada)"); return; }
    if (!g || ((g.itens || []).length === 0 && !g.valorTotal)) return; // sem gabarito: não dá para conferir
    const soma = (d.itens || []).reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valorUnit) || 0), 0);
    const somaG = (g.itens || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalOk = Math.abs((Number(d.total) || 0) - (Number(g.valorTotal) || 0)) < 0.02;
    const itensOk = Math.abs(soma - somaG) < 0.02;
    if (!totalOk || !itensOk) ruins.push(num);
  });
  return ruins.length === 0 ? { ok: true, texto: "totais batem" } : { ok: false, texto: "não batem: " + ruins.join(", ") };
}

export default function EnviosPorLote({ turma }) {
  const turmaId = turma?.id;
  const alunos = useAlunosDaTurma(turmaId);
  const documentos = useDocumentosDaTurma(turmaId);
  const [linhas, setLinhas] = useState(null);
  const [sel, setSel] = useState({});
  const [devolvendo, setDevolvendo] = useState(false);
  const [orient, setOrient] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  // refs: a lista só é relida ao abrir a tela, ao trocar de turma e no botão "Atualizar lista"
  // (uma mudança qualquer em outro lugar da turma não zera a seleção do professor).
  const alunosRef = useRef(alunos); alunosRef.current = alunos;
  const docsRef = useRef(documentos); docsRef.current = documentos;
  const prontos = !!(alunos && documentos);
  const carregar = useCallback(async () => {
    const alunos = alunosRef.current, documentos = docsRef.current;
    if (!turmaId || !alunos || !documentos) return;
    setErro(""); setLinhas(null);
    try {
      const out = [];
      for (const a of alunos) {
        const f = await getDocs(collection(db, "turmas", turmaId, "alunos", a.matricula, "fluxo"));
        const enviados = f.docs.filter((d) => d.data().status === "enviado");
        if (enviados.length === 0) continue;
        const ds = await getDocs(collection(db, "turmas", turmaId, "alunos", a.matricula, "digitacoesNFe"));
        const digs = Object.fromEntries(ds.docs.map((d) => [d.id, d.data()]));
        enviados.forEach((d) => {
          const reg = d.data();
          out.push({ chave: a.matricula + "|" + d.id, matricula: a.matricula, nome: a.nome, teste: !!a.contaTeste, fluxoId: d.id, reg, pre: preConferir(reg.passo, reg, digs, documentos) });
        });
      }
      setLinhas(out);
      setSel(Object.fromEntries(out.map((l) => [l.chave, l.pre.ok !== false])));
    } catch (e) { setErro("Não foi possível ler os envios: " + e.message); setLinhas([]); }
  }, [turmaId]);

  useEffect(() => { if (prontos) carregar(); }, [prontos, carregar]);

  if (!turma) return <div className="empty-state">Selecione uma turma em "Turmas" primeiro.</div>;

  const marcados = (linhas || []).filter((l) => sel[l.chave]);

  async function decidir(acao) {
    if (marcados.length === 0) return;
    if (acao === "devolvido" && !orient.trim()) { setErro("Escreva a orientação para o aluno antes de devolver."); return; }
    setOcupado(true); setErro(""); setMsg("");
    let feitos = 0;
    try {
      for (const l of marcados) {
        const historico = [...(Array.isArray(l.reg.historico) ? l.reg.historico : []), { acao: acao === "aprovado" ? "aprovado" : "devolvido", em: new Date().toISOString(), ...(acao === "devolvido" ? { orientacao: orient.trim() } : {}) }];
        await updateDoc(doc(db, "turmas", turmaId, "alunos", l.matricula, "fluxo", l.fluxoId), {
          status: acao, orientacao: acao === "devolvido" ? orient.trim() : "", decididoEm: serverTimestamp(), historico,
        });
        feitos++;
      }
      setMsg(feitos + " envio(s) " + (acao === "aprovado" ? "aprovado(s). O próximo passo já abre para esses alunos." : "devolvido(s) com a sua orientação."));
      setDevolvendo(false); setOrient("");
    } catch (e) { setErro("Parou depois de " + feitos + " envio(s): " + e.message + ". Atualize a lista e confira."); }
    setOcupado(false);
    carregar();
  }

  return (
    <>
      <div className="screen-eyebrow">fluxo por etapas · 2027.1</div>
      <h2 className="screen-title">Envios por lote</h2>
      <p className="screen-sub">Passos que os alunos enviaram e aguardam a sua decisão. A pré-conferência compara a digitação com o gabarito e é só uma ajuda: quem aprova é você.</p>

      <div className="btn-row" style={{ marginTop: 0, marginBottom: 12 }}>
        <button className="btn secondary" onClick={carregar} disabled={ocupado}>Atualizar lista</button>
      </div>

      {linhas === null && <div className="empty-state">Carregando envios…</div>}
      {linhas && linhas.length === 0 && !erro && <div className="empty-state">Nenhum envio aguardando. Quando um aluno enviar um passo, ele aparece aqui.</div>}

      {linhas && linhas.length > 0 && (
        <div className="panel">
          <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
            <table>
              <thead><tr><th></th><th>Aluno</th><th>Passo · lote</th><th>Pré-conferência</th><th>Notas</th></tr></thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.chave}>
                    <td><input type="checkbox" aria-label={"selecionar " + l.nome} checked={!!sel[l.chave]} onChange={(e) => setSel((s) => ({ ...s, [l.chave]: e.target.checked }))} /></td>
                    <td>{l.nome || l.matricula}{l.teste ? " (teste)" : ""}</td>
                    <td>{nomePasso(l.reg.passo)} · {l.reg.lote}</td>
                    <td><span className={"tag-pill " + (l.pre.ok === true ? "ok" : l.pre.ok === false ? "bad" : "")}>{l.pre.texto}</span></td>
                    <td className="num">{(l.reg.documentos || []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {linhas && linhas.length > 0 && (
        <>
          {devolvendo && (
            <div className="panel"><div className="panel-body">
              <div className="field"><label htmlFor="orient-fluxo">Orientação para o(s) aluno(s) selecionado(s)</label>
                <textarea id="orient-fluxo" value={orient} onChange={(e) => setOrient(e.target.value)} placeholder="ex.: confira o valor unitário dos itens e as outras despesas da nota" /></div>
            </div></div>
          )}
          <div className="btn-row">
            <button className="btn green" disabled={ocupado || marcados.length === 0} onClick={() => decidir("aprovado")}>Aprovar selecionados ({marcados.length})</button>
            {!devolvendo
              ? <button className="btn secondary" disabled={ocupado || marcados.length === 0} onClick={() => setDevolvendo(true)}>Devolver…</button>
              : <>
                  <button className="btn red" disabled={ocupado || marcados.length === 0} onClick={() => decidir("devolvido")}>Devolver selecionados ({marcados.length})</button>
                  <button className="btn secondary" disabled={ocupado} onClick={() => { setDevolvendo(false); setOrient(""); }}>Cancelar</button>
                </>}
          </div>
          <div className="helper-note">Quem tem divergência na pré-conferência não vem marcado.</div>
        </>
      )}
      {msg && <div className="helper-note">{msg}</div>}
      {erro && <div className="aviso-pedagogico">{erro}</div>}
    </>
  );
}
