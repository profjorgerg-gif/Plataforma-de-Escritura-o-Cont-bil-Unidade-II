import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useCatalogoDocumentos } from "../../hooks/useCatalogoDocumentos.js";
import { contaInfo, fmt } from "../../lib/contabil.js";
import { StatusBadge } from "../shared/UI.jsx";

// ANÁLISE POR IA — sem Cloud Function, sem custo, sem chave secreta.
// Em vez do sistema chamar uma API de IA (o que exigiria guardar uma chave
// num servidor — daí o plano Blaze, que decidimos evitar), é o PRÓPRIO
// PROFESSOR quem chama, usando uma ferramenta que já tem à mão: monta-se
// um texto com o lançamento e o documento de origem, copia para a área de
// transferência, e o professor cola no Claude.ai (ou outro assistente) na
// sua própria conta. Se achar o parecer útil, cola de volta no campo de
// observação abaixo.

function montarPromptIA(l, contas, documentoInfo) {
  const partidasTexto = l.partidas
    .map((p) => `${p.tipo === "D" ? "Débito" : "Crédito"} — ${p.conta} ${contaInfo(p.conta, contas)?.nome || ""} — R$ ${fmt(p.valor)}`)
    .join("\n");
  const docTexto = documentoInfo
    ? `Documento de origem: NF-e nº ${documentoInfo.numero}, ${documentoInfo.direcao === "entrada" ? "entrada" : "saída"}, natureza "${documentoInfo.natureza}", CFOP ${documentoInfo.cfop}.`
    : "Sem documento de origem vinculado.";

  return `Você é um professor de Contabilidade Intermediária revisando o lançamento de um aluno do ensino técnico, na Unidade II (Operações com Mercadorias e Operações Financeiras).

${docTexto}

Histórico informado pelo aluno: "${l.historico}"

Partidas do lançamento:
${partidasTexto}

Avalie se a classificação contábil (contas escolhidas, natureza débito/crédito, separação de efeitos quando aplicável — ex.: em vendas, receita e CMV lançados separadamente) está coerente com o fato descrito e com o documento de origem. Não é preciso bater com uma única "resposta certa" — aceite soluções tecnicamente corretas ainda que diferentes da mais óbvia.

Se estiver tudo certo, diga em poucas palavras o que o aluno acertou. Se houver inconsistência, aponte o que reconsiderar sem revelar a conta ou o lançamento corretos — apenas oriente.`;
}

export default function FilaCorrecao({ turmaId }) {
  const { contas } = usePlanoContas();
  const alunos = useAlunosDaTurma(turmaId);
  const catalogo = useCatalogoDocumentos();
  const { todos } = useLancamentosDaTurma(turmaId, alunos);
  const fila = todos.filter(({ lancamento }) => lancamento.status === "enviado");
  const [obs, setObs] = useState({});
  const [copiado, setCopiado] = useState({}); // chave -> true por alguns segundos, feedback visual

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

  async function copiarPromptIA(l) {
    const k = chave(l._matricula, l.id);
    const documentoInfo = catalogo?.find((d) => d.id === l.documento) || null;
    const prompt = montarPromptIA(l, contas, documentoInfo);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado((prev) => ({ ...prev, [k]: true }));
      setTimeout(() => setCopiado((prev) => ({ ...prev, [k]: false })), 3000);
    } catch (e) {
      window.prompt("Não copiou automaticamente — selecione e copie manualmente (Ctrl+C):", prompt);
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
              {l.obsCorrecao && (
                <div className="helper-note" style={{ marginBottom: 12, borderColor: "var(--red, #c0392b)" }}>
                  <b>Já devolvido antes, com esta observação:</b> {l.obsCorrecao}
                </div>
              )}
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
                <button className="btn secondary" onClick={() => copiarPromptIA({ ...l, _matricula: aluno.matricula })}>
                  {copiado[k] ? "✓ copiado!" : "📋 Copiar prompt para IA"}
                </button>
                <a className="btn secondary" href="https://claude.ai" target="_blank" rel="noopener noreferrer">Abrir Claude.ai ↗</a>
                <a className="btn secondary" href="https://chatgpt.com" target="_blank" rel="noopener noreferrer">Abrir ChatGPT ↗</a>
              </div>
              <div className="helper-note" style={{ marginTop: 8 }}>
                Cole no Claude.ai, no ChatGPT ou em outro assistente de IA que preferir, para um parecer rápido sobre este lançamento. Se achar útil, cole a resposta no campo de observação abaixo.
              </div>
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
