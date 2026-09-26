import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useCatalogoDocumentos } from "../../hooks/useCatalogoDocumentos.js";
import { contaInfo, fmt } from "../../lib/contabil.js";
import { StatusBadge } from "../shared/UI.jsx";

// A análise por IA chama a Cloud Function `analisarLancamento` (ver
// functions/index.js) — substitui a capacidade `sample` que só existe no
// runtime do Claude.ai. Sem essa function implantada (e sem o secret
// ANTHROPIC_API_KEY configurado), a chamada falha com um erro que o botão
// mostra — o fluxo de aprovar/devolver continua funcionando normalmente.

const analisarLancamentoFn = httpsCallable(functions, "analisarLancamento");

export default function FilaCorrecao({ turmaId }) {
  const { contas } = usePlanoContas();
  const alunos = useAlunosDaTurma(turmaId);
  const catalogo = useCatalogoDocumentos();
  const { todos } = useLancamentosDaTurma(turmaId, alunos);
  const fila = todos.filter(({ lancamento }) => lancamento.status === "enviado");
  const [obs, setObs] = useState({});
  const [analise, setAnalise] = useState({}); // { [chave]: {loading, resultado:{status,feedback}, erro} }

  function chave(matricula, id) { return matricula + "-" + id; }

  async function aprovar(matricula, id) {
    await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula, "lancamentos", id), { status: "aprovado" });
  }
  async function devolver(matricula, id) {
    const k = chave(matricula, id);
    await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula, "lancamentos", id), {
      status: "correcao", obsCorrecao: obs[k] || "Revisar lançamento.",
    });
  }

  async function analisarComIA(aluno, l) {
    const k = chave(aluno.matricula, l.id);
    setAnalise((prev) => ({ ...prev, [k]: { loading: true } }));
    const documentoInfo = catalogo?.find((d) => d.id === l.documento) || null;
    const partidasComNome = l.partidas.map((p) => ({ ...p, contaNome: contaInfo(p.conta, contas)?.nome }));
    try {
      const { data: resultado } = await analisarLancamentoFn({
        historico: l.historico, partidas: partidasComNome,
        documento: documentoInfo ? { numero: documentoInfo.numero, direcao: documentoInfo.direcao, natureza: documentoInfo.natureza, cfop: documentoInfo.cfop } : null,
      });
      setAnalise((prev) => ({ ...prev, [k]: { loading: false, resultado } }));
      if (resultado.status === "inconsistencias" && resultado.feedback) {
        setObs((prev) => ({ ...prev, [k]: resultado.feedback }));
      }
    } catch (e) {
      setAnalise((prev) => ({ ...prev, [k]: { loading: false, erro: e.message || "Não foi possível concluir a análise agora." } }));
    }
  }

  if (!contas || alunos === null) return <div className="empty-state">Carregando…</div>;

  return (
    <>
      <div className="screen-eyebrow">fila de correção</div>
      <h2 className="screen-title">Lançamentos enviados para análise</h2>
      <p className="screen-sub">De todos os alunos da turma. Compare cada lançamento com o documento de origem antes de aprovar ou devolver.</p>
      {fila.length === 0 && <div className="panel"><div className="empty-state">Nenhum lançamento pendente no momento.</div></div>}
      {fila.map(({ aluno, lancamento: l }) => {
        const k = chave(aluno.matricula, l.id);
        return (
          <div className="panel" key={k}>
            <div className="panel-head">
              <div>
                <div className="mono" style={{ fontSize: "10.5px", color: "var(--ink-faint)", marginBottom: 2 }}>{aluno.nome}</div>
                <h3 style={{ margin: 0 }}>{l.data} · {l.documento} — {l.historico}</h3>
              </div>
              <StatusBadge status={l.status} />
            </div>
            <div className="panel-body">
              <table>
                <thead><tr><th>Conta</th><th className="num">Débito</th><th className="num">Crédito</th></tr></thead>
                <tbody>
                  {l.partidas.map((p, i) => (
                    <tr key={i}>
                      <td className="mono">{p.conta} — {contaInfo(p.conta, contas)?.nome || ""}</td>
                      <td className="num mono">{p.tipo === "D" ? fmt(p.valor) : ""}</td>
                      <td className="num mono">{p.tipo === "C" ? fmt(p.valor) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn secondary" disabled={analise[k]?.loading} onClick={() => analisarComIA(aluno, l)}>
                  {analise[k]?.loading ? "Analisando…" : "Analisar com IA"}
                </button>
              </div>
              {analise[k]?.erro && <div className="balance-check bad" style={{ marginTop: 10 }}>{analise[k].erro}</div>}
              {analise[k]?.resultado && (
                <div className={"balance-check " + (analise[k].resultado.status === "ok" ? "ok" : "bad")} style={{ marginTop: 10, display: "block" }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", marginBottom: 4 }}>
                    {analise[k].resultado.status === "ok" ? "✓ parecer da IA — sem inconsistências aparentes" : "✗ parecer da IA — possíveis inconsistências"}
                  </div>
                  <div style={{ fontFamily: "'Source Serif 4', serif" }}>{analise[k].resultado.feedback}</div>
                </div>
              )}
              <div className="field" style={{ marginTop: 12 }}>
                <label>Observação (caso devolva para correção)</label>
                <textarea value={obs[k] || ""} onChange={(e) => setObs({ ...obs, [k]: e.target.value })} />
              </div>
              <div className="btn-row">
                <button className="btn green" onClick={() => aprovar(aluno.matricula, l.id)}>Aprovar</button>
                <button className="btn red" onClick={() => devolver(aluno.matricula, l.id)}>Devolver para correção</button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
