import { useState } from "react";
import { doc, updateDoc, getDoc, getDocs, collection } from "firebase/firestore";
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

// Instante de referência do envio, para ordenar a fila e mostrar "há quanto
// tempo": enviadoEm (gravado a cada envio/reenvio) com fallback para
// criadoEm, para lançamentos antigos que ainda não tinham esse campo.
function millisDoEnvio(l) {
  if (l.enviadoEm?.toMillis) return l.enviadoEm.toMillis();
  if (l.criadoEm?.toMillis) return l.criadoEm.toMillis();
  return 0;
}

function tempoDesde(timestamp) {
  if (!timestamp?.toDate) return null;
  const min = Math.floor((Date.now() - timestamp.toDate().getTime()) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

export default function FilaCorrecao({ turmaId }) {
  const { contas } = usePlanoContas();
  const alunos = useAlunosDaTurma(turmaId);
  const catalogo = useCatalogoDocumentos();
  const { todos } = useLancamentosDaTurma(turmaId, alunos);
  // Mais antigo primeiro — quem está esperando análise há mais tempo aparece
  // no topo da fila.
  const fila = todos
    .filter(({ lancamento }) => lancamento.status === "enviado")
    .sort((a, b) => millisDoEnvio(a.lancamento) - millisDoEnvio(b.lancamento));
  const [obs, setObs] = useState({});
  const [copiado, setCopiado] = useState({}); // chave -> true por alguns segundos, feedback visual
  const [extras, setExtras] = useState({}); // chave -> { aberto, carregando, analise, classificacoes }

  function chave(matricula, id) { return matricula + "-" + id; }

  // Busca (sob demanda, só ao expandir) a análise fiscal e as classificações
  // contábeis que o aluno registrou para o MESMO documento deste lançamento —
  // assim o professor vê o raciocínio completo sem trocar de tela. Usa
  // getDoc/getDocs (não onSnapshot) porque é consultado uma vez por card
  // aberto, não precisa ficar "ao vivo".
  async function alternarDetalhes(k, l, aluno) {
    if (extras[k]) {
      setExtras((prev) => ({ ...prev, [k]: { ...prev[k], aberto: !prev[k].aberto } }));
      return;
    }
    setExtras((prev) => ({ ...prev, [k]: { aberto: true, carregando: true } }));
    let analise = null, classificacoes = [];
    if (l.documento) {
      const analiseSnap = await getDoc(doc(db, "turmas", turmaId, "alunos", aluno.matricula, "analisesFiscais", l.documento));
      analise = analiseSnap.exists() ? analiseSnap.data() : null;
      const classifSnap = await getDocs(collection(db, "turmas", turmaId, "alunos", aluno.matricula, "classificacoes"));
      classificacoes = classifSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.documento === l.documento);
    }
    setExtras((prev) => ({ ...prev, [k]: { aberto: true, carregando: false, analise, classificacoes } }));
  }

  async function aprovar(matricula, id) {
    await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula, "lancamentos", id), { status: "aprovado" });
  }
  async function devolver(matricula, id, historicoAtual) {
    const k = chave(matricula, id);
    const novaObs = obs[k] || "Revisar lançamento.";
    // Cada devolução vira um novo registro no histórico — nunca sobrescreve
    // a observação de uma rodada anterior, para que aluno e professor vejam
    // todo o ciclo de correções, não só a última.
    const historico = [...(historicoAtual || []), { obs: novaObs, em: new Date().toISOString() }];
    await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula, "lancamentos", id), {
      status: "correcao", obsCorrecao: novaObs, historicoCorrecoes: historico,
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
      <div className="helper-note" style={{ borderLeftColor: "var(--green)", background: "var(--green-pale)", color: "var(--green-dark)" }}>
        <b>O que aparece aqui:</b> só os lançamentos já prontos no Livro Diário — a última etapa do fluxo do aluno. Digitação e análise fiscal em andamento (antes de virar lançamento) não entram nesta fila; para acompanhar essas etapas, use <b>Histórico do aluno</b>.
      </div>
      {fila.length === 0 && <div className="panel"><div className="empty-state">Nenhum lançamento pendente no momento.</div></div>}
      {fila.map(({ aluno, lancamento: l }) => {
        const k = chave(aluno.matricula, l.id);
        return (
          <div className="panel" key={k}>
            <div className="panel-head">
              <div>
                <div className="aluno-chip">👤 {aluno.nome} <span className="mono">· matrícula {aluno.matricula}</span></div>
                <h3 style={{ margin: 0 }}>{l.data} · {l.documento} — {l.historico}</h3>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>
                  {l.enviadoEm?.toDate ? "enviado " + tempoDesde(l.enviadoEm) : ""}
                  {l.historicoCorrecoes?.length > 0 && (
                    <span style={{ color: "var(--red)", fontWeight: 700, marginLeft: l.enviadoEm?.toDate ? 10 : 0 }}>
                      🔁 reenvio — correção nº {l.historicoCorrecoes.length}
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={l.status} />
            </div>
            <div className="panel-body">
              {l.historicoCorrecoes?.length > 0 && (
                <div className="helper-note" style={{ marginBottom: 12, borderColor: "var(--red)" }}>
                  <b>Histórico de correções deste lançamento ({l.historicoCorrecoes.length}):</b>
                  <ol style={{ margin: "6px 0 0 18px", padding: 0 }}>
                    {l.historicoCorrecoes.map((h, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                          {new Date(h.em).toLocaleString("pt-BR")}
                        </span>
                        {" — "}{h.obs}
                      </li>
                    ))}
                  </ol>
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

              <button
                className="btn secondary"
                style={{ marginTop: 12 }}
                onClick={() => alternarDetalhes(k, l, aluno)}
              >
                {extras[k]?.aberto ? "▲ Ocultar" : "🔍 Ver"} análise fiscal e classificação deste documento
              </button>

              {extras[k]?.aberto && (
                <div className="panel" style={{ marginTop: 10, background: "var(--paper-deep)" }}>
                  <div className="panel-body">
                    {extras[k].carregando && <div className="empty-state">Carregando…</div>}
                    {!extras[k].carregando && !l.documento && (
                      <div className="helper-note">Este lançamento não tem documento de origem vinculado.</div>
                    )}
                    {!extras[k].carregando && l.documento && (
                      <>
                        <h4 style={{ marginTop: 0 }}>Análise fiscal — {l.documento}</h4>
                        {!extras[k].analise && <div className="helper-note" style={{ marginBottom: 14 }}>O aluno ainda não enviou a análise fiscal deste documento.</div>}
                        {extras[k].analise && (
                          <div className="grid-2" style={{ marginBottom: 14 }}>
                            <div className="field"><label>CFOP correto?</label><div>{extras[k].analise.cfopCorreto || "—"}{extras[k].analise.cfopSugerido ? " (sugerido: " + extras[k].analise.cfopSugerido + ")" : ""}</div></div>
                            <div className="field"><label>NCM correto?</label><div>{extras[k].analise.ncmCorreto || "—"}</div></div>
                            <div className="field"><label>CST correto?</label><div>{extras[k].analise.cstCorreto || "—"}</div></div>
                            <div className="field"><label>Status</label><div><StatusBadge status={extras[k].analise.status === "enviado" ? "aprovado" : "rascunho"} /></div></div>
                            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Justificativa</label><div>{extras[k].analise.justificativa || "—"}</div></div>
                          </div>
                        )}
                        <h4>Classificação contábil vinculada</h4>
                        {extras[k].classificacoes.length === 0 && <div className="helper-note">Nenhuma classificação registrada para este documento.</div>}
                        {extras[k].classificacoes.length > 0 && (
                          <table>
                            <thead><tr><th>Fato</th><th>Débito</th><th>Crédito</th><th className="num">Valor</th><th>Histórico</th></tr></thead>
                            <tbody>
                              {extras[k].classificacoes.map((c) => (
                                <tr key={c.id}>
                                  <td>{c.fato}</td>
                                  <td className="mono">{c.contaDebito}</td>
                                  <td className="mono">{c.contaCredito}</td>
                                  <td className="num mono">{fmt(c.valor)}</td>
                                  <td>{c.historico}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

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
                <button className="btn red" onClick={() => devolver(aluno.matricula, l.id, l.historicoCorrecoes)}>Devolver para correção</button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
