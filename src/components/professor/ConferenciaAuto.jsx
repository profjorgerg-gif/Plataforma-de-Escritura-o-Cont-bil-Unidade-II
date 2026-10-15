import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { contaInfo, fmt } from "../../lib/contabil.js";
import { conferirAluno } from "../../lib/conferenciaFila.js";

// Conferência automática da Fila, aluno por aluno. Só SUGERE (✅ / ❌ / ⚪);
// nada é aprovado ou devolvido sem o clique do professor. Usa as mesmas gravações da Fila.
export default function ConferenciaAuto({ turmaId, fila, todos, catalogo, contas }) {
  const [matricula, setMatricula] = useState("");
  const [troca, setTroca] = useState({}); // id -> "ok" | "no" (decisão do professor)
  const [exc, setExc] = useState({}); // id -> true/false (professor muda o "pode excluir")
  const [orient, setOrient] = useState("");
  const [confirmar, setConfirmar] = useState(null); // "ap" | "de"
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const porAluno = useMemo(() => {
    const m = {};
    fila.forEach(({ aluno, lancamento }) => {
      (m[aluno.matricula] = m[aluno.matricula] || { aluno, itens: [] }).itens.push(lancamento);
    });
    return m;
  }, [fila]);
  const lista = Object.values(porAluno).sort((a, b) => (a.aluno.nome || "").localeCompare(b.aluno.nome || ""));
  const atual = porAluno[matricula];

  const auto = useMemo(() => {
    if (!atual) return {};
    const todosDele = todos.filter((t) => t.aluno.matricula === matricula).map((t) => t.lancamento);
    return conferirAluno(atual.itens, todosDele, catalogo);
  }, [atual, todos, catalogo, matricula]);

  const estadoDe = (l) => troca[l.id] || (auto[l.id] || { estado: "sem" }).estado;
  const aprovar = (atual?.itens || []).filter((l) => estadoDe(l) === "ok");
  const devolver = (atual?.itens || []).filter((l) => estadoDe(l) === "no");

  const podeExcDe = (l) => (l.id in exc ? exc[l.id] : !!(auto[l.id] && auto[l.id].podeExcluir));
  function escolher(m) { setMatricula(m); setTroca({}); setExc({}); setConfirmar(null); setMsg(""); setOrient(""); }
  function alternar(l) {
    const e = estadoDe(l);
    setTroca((t) => ({ ...t, [l.id]: e === "ok" ? "no" : "ok" })); setConfirmar(null); setMsg("");
  }
  const orientacaoDe = (l) => {
    const a = auto[l.id];
    const sug = a && troca[l.id] !== "no" && a.estado === "no";
    return [sug && "Motivo: " + a.motivo + ".", sug && a.acao && "O que fazer: " + a.acao, orient].filter(Boolean).join(" ") || "Revisar lançamento.";
  };

  async function executar(qual) {
    setOcupado(true); setMsg("");
    try {
      if (qual === "ap") {
        for (const l of aprovar) await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula, "lancamentos", l.id), { status: "aprovado" });
        setMsg(aprovar.length + " lançamento(s) aprovado(s).");
      } else {
        for (const l of devolver) {
          const o = orientacaoDe(l);
          const historico = [...(l.historicoCorrecoes || []), { obs: o, em: new Date().toISOString() }];
          await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula, "lancamentos", l.id), { status: "correcao", obsCorrecao: o, historicoCorrecoes: historico, ...(podeExcDe(l) ? { podeExcluir: true } : {}) });
        }
        setMsg(devolver.length + " lançamento(s) devolvido(s).");
      }
    } catch (e) { setMsg("Não foi possível gravar: " + (e.message || e)); }
    setConfirmar(null); setOcupado(false);
  }

  const cor = { ok: "var(--green)", no: "var(--red)", sem: "var(--ink-faint)" };
  const simb = { ok: "✓", no: "✗", sem: "○" };
  return (
    <div className="panel" style={{ marginBottom: 14 }}>
      <div className="panel-head"><h3 style={{ margin: 0 }}>Conferência automática</h3></div>
      <div className="panel-body">
        <p className="screen-sub" style={{ marginTop: 0 }}>Escolha um aluno. O sistema sugere o que aprovar (✓) e o que devolver (✗) comparando com o gabarito da nota. Nada é gravado sem o seu clique.</p>
        <div className="field">
          <label>Aluno</label>
          <select value={matricula} onChange={(e) => escolher(e.target.value)}>
            <option value="">— escolha —</option>
            {lista.map(({ aluno, itens }) => <option key={aluno.matricula} value={aluno.matricula}>{aluno.nome} · {itens.length} lançamento(s)</option>)}
          </select>
        </div>
        {atual && (
          <>
            <div className="helper-note" style={{ margin: "10px 0" }}>
              <b>{aprovar.length}</b> para aprovar · <b>{devolver.length}</b> para devolver · {atual.itens.length - aprovar.length - devolver.length} para você conferir (○)
            </div>
            <table>
              <tbody>
                {atual.itens.map((l) => {
                  const e = estadoDe(l); const r = auto[l.id] || { motivo: "" };
                  const valor = (l.partidas || []).filter((p) => p.tipo === "D").reduce((s, p) => s + (Number(p.valor) || 0), 0);
                  return (
                    <tr key={l.id}>
                      <td style={{ width: 28, fontWeight: 700, color: cor[e] }}>{simb[e]}</td>
                      <td>
                        <b>{l.documento}</b> — {l.historico}<br />
                        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                          {(l.partidas || []).map((p) => (p.tipo === "D" ? "D " : "C ") + (contaInfo(p.conta, contas)?.nome || p.conta)).join(" / ")}
                        </span><br />
                        <span style={{ fontSize: 12, color: cor[e] }}>
                          {troca[l.id] ? "Decisão sua · sistema sugeriu: " : ""}{r.motivo}
                        </span>
                        {e === "no" && r.acao && !troca[l.id] && (
                          <><br /><span style={{ fontSize: 12 }}><b>O que fazer:</b> {r.acao}</span></>
                        )}
                        {e === "no" && (
                          <><br /><label style={{ fontSize: 12 }}><input type="checkbox" checked={podeExcDe(l)} onChange={(ev) => setExc((x) => ({ ...x, [l.id]: ev.target.checked }))} /> Permitir que o aluno exclua este lançamento</label></>
                        )}
                      </td>
                      <td className="num mono">{fmt(valor)}</td>
                      <td><button className="btn secondary" onClick={() => alternar(l)}>{e === "ok" ? "devolver" : "aprovar"}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Orientação extra ao aluno (acompanha o motivo, ao devolver)</label>
              <textarea value={orient} onChange={(e) => setOrient(e.target.value)} />
            </div>
            <div className="btn-row">
              <button className="btn green" disabled={!aprovar.length || ocupado} onClick={() => setConfirmar("ap")}>Aprovar os {aprovar.length} ✓</button>
              <button className="btn red" disabled={!devolver.length || ocupado} onClick={() => setConfirmar("de")}>Devolver os {devolver.length} ✗</button>
            </div>
            {confirmar && (
              <div className="helper-note" style={{ marginTop: 10 }}>
                Confirma {confirmar === "ap" ? "aprovar " + aprovar.length : "devolver " + devolver.length} lançamento(s) de <b>{atual.aluno.nome}</b>?{" "}
                <button className="btn" disabled={ocupado} onClick={() => executar(confirmar)}>Sim, confirmar</button>{" "}
                <button className="btn secondary" onClick={() => setConfirmar(null)}>Cancelar</button>
              </div>
            )}
            {msg && <div className="helper-note" style={{ marginTop: 10 }}>{msg}</div>}
          </>
        )}
      </div>
    </div>
  );
}
