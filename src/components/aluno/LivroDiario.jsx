import { Fragment, useEffect, useState } from "react";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { fmt } from "../../lib/contabil.js";
import { StatusBadge } from "../shared/UI.jsx";

// Status em que o próprio aluno ainda pode editar o lançamento:
// - rascunho: nunca foi enviado
// - correcao: o professor devolveu para ajustes
const EDITAVEIS = ["rascunho", "correcao"];

// Aviso pedagógico (nunca bloqueia o envio): compara o lado escolhido (D/C)
// com a natureza da conta (já cadastrada no Plano de Contas) para chamar
// atenção do aluno quando parecer uma troca de débito/crédito — o erro mais
// comum de quem está começando.
function avisoNaturezaPartida(conta, tipo) {
  if (!conta || !conta.natureza) return null;
  const ladoEsperado = conta.natureza === "devedora" ? "D" : "C";
  if (tipo === ladoEsperado) return null;
  const ladoEscolhido = tipo === "D" ? "débito" : "crédito";
  return `"${conta.nome}" costuma ter natureza ${conta.natureza} — confira se faz sentido lançá-la a ${ladoEscolhido} aqui.`;
}

// Aviso pedagógico de regime de competência: se a data do lançamento cai num
// mês/ano diferente do da emissão do documento de origem, vale reconferir se
// o fato não deveria ser reconhecido no período do documento.
function avisoCompetencia(dataLancamento, docSelecionado) {
  if (!dataLancamento || !docSelecionado?.data) return null;
  if (dataLancamento.slice(0, 7) === docSelecionado.data.slice(0, 7)) return null;
  return `A data deste lançamento (${dataLancamento}) é de um mês diferente da emissão do documento de origem (${docSelecionado.data}) — pelo regime de competência, confira se o fato deveria ser reconhecido no período do documento.`;
}

function NovoLancamentoForm({ onSalvar, onCancelar, documentos, contas, lancamentoExistente, valoresIniciais }) {
  const editando = !!lancamentoExistente;
  const base = lancamentoExistente || valoresIniciais || {};
  const [data, setData] = useState(base.data || "");
  const [documento, setDocumento] = useState(base.documento || "");
  const [historico, setHistorico] = useState(base.historico || "");
  const [partidas, setPartidas] = useState(
    base.partidas?.length
      ? base.partidas.map((p) => ({ ...p }))
      : [{ conta: "", tipo: "D", valor: "" }, { conta: "", tipo: "C", valor: "" }]
  );
  const [salvando, setSalvando] = useState(false);

  const docSelecionado = documentos.find((d) => d.id === documento);
  const avisoData = avisoCompetencia(data, docSelecionado);

  const totalD = partidas.filter((p) => p.tipo === "D").reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const totalC = partidas.filter((p) => p.tipo === "C").reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const bate = totalD > 0 && Math.abs(totalD - totalC) < 0.005;

  function updatePartida(i, field, val) {
    const novo = [...partidas]; novo[i] = { ...novo[i], [field]: val }; setPartidas(novo);
  }
  function addPartida() { setPartidas([...partidas, { conta: "", tipo: "D", valor: "" }]); }
  function removePartida(i) { setPartidas(partidas.filter((_, idx) => idx !== i)); }

  async function salvar(status) {
    setSalvando(true);
    const dados = { data, documento, historico, partidas: partidas.filter((p) => p.conta && p.valor), status };
    // Marca o instante do envio (envio inicial ou reenvio após correção) —
    // é o que a Fila de Correção usa para mostrar "enviado há X" e priorizar
    // quem está esperando análise há mais tempo.
    if (status === "enviado") dados.enviadoEm = serverTimestamp();
    await onSalvar(dados);
    setSalvando(false);
  }

  return (
    <div className="panel">
      <div className="panel-head"><h3>{editando ? "Editar lançamento" : "Novo lançamento"}</h3></div>
      <div className="panel-body">
        {!editando && valoresIniciais && (
          <div className="helper-note" style={{ marginBottom: 14 }}>
            Lançamento pré-preenchido a partir da classificação contábil que você salvou. Confira a data e o histórico e complete o que faltar antes de enviar.
          </div>
        )}
        {editando && lancamentoExistente.historicoCorrecoes?.length > 0 && (
          <div className="helper-note" style={{ marginBottom: 14, borderColor: "var(--red)" }}>
            <b>Histórico de correções deste lançamento ({lancamentoExistente.historicoCorrecoes.length}):</b>
            <ol style={{ margin: "6px 0 0 18px", padding: 0 }}>
              {lancamentoExistente.historicoCorrecoes.map((h, i) => (
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
        {editando && lancamentoExistente.status === "correcao" && !lancamentoExistente.historicoCorrecoes?.length && lancamentoExistente.obsCorrecao && (
          <div className="helper-note" style={{ marginBottom: 14, borderColor: "var(--red)" }}>
            <b>Observação do professor:</b> {lancamentoExistente.obsCorrecao}
          </div>
        )}
        <div className="grid-2">
          <div className="field"><label>Data</label><input type="date" className="mono" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="field">
            <label>Documento de origem</label>
            <select value={documento} onChange={(e) => setDocumento(e.target.value)}>
              <option value="">— sem documento —</option>
              {documentos.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}
            </select>
          </div>
        </div>
        {avisoData && <div className="aviso-pedagogico">⚠ {avisoData}</div>}
        <div className="field"><label>Histórico</label><textarea value={historico} onChange={(e) => setHistorico(e.target.value)} /></div>
        <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", color: "var(--ink-faint)" }}>Partidas</label>
        <div style={{ marginTop: 8 }}>
          {partidas.map((p, i) => {
            const contaSel = contas.find((c) => c.codigo === p.conta);
            const avisoNatureza = avisoNaturezaPartida(contaSel, p.tipo);
            return (
              <Fragment key={i}>
                <div className="partida-row">
                  <select value={p.conta} onChange={(e) => updatePartida(i, "conta", e.target.value)}>
                    <option value="">Selecione a conta</option>
                    {contas.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nome}</option>)}
                  </select>
                  <select value={p.tipo} onChange={(e) => updatePartida(i, "tipo", e.target.value)}>
                    <option value="D">Débito</option>
                    <option value="C">Crédito</option>
                  </select>
                  <input className="mono" placeholder="Valor" type="number" value={p.valor} onChange={(e) => updatePartida(i, "valor", e.target.value)} />
                  <div className="mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>{p.tipo === "D" ? "a débito" : "a crédito"}</div>
                  {partidas.length > 2 ? <button className="remove-partida" onClick={() => removePartida(i)}>×</button> : <span />}
                </div>
                {avisoNatureza && <div className="aviso-pedagogico" style={{ marginTop: -4 }}>⚠ {avisoNatureza}</div>}
              </Fragment>
            );
          })}
        </div>
        <button className="btn secondary" style={{ marginTop: 6 }} onClick={addPartida}>+ adicionar partida</button>
        <div className={"balance-check " + (bate ? "ok" : "bad")}>
          <span>Débitos: {fmt(totalD)} · Créditos: {fmt(totalC)}</span>
          <span>{bate ? "✓ Débito = Crédito" : "✗ Lançamento desequilibrado — não pode ser enviado"}</span>
        </div>
        <div className="btn-row">
          {editando && <button className="btn secondary" disabled={salvando} onClick={onCancelar}>Cancelar</button>}
          <button className="btn secondary" disabled={salvando} onClick={() => salvar("rascunho")}>Salvar como rascunho</button>
          <button className="btn" disabled={!bate || !historico || salvando} onClick={() => salvar("enviado")}>
            {editando ? "Reenviar para análise do professor" : "Enviar para análise do professor"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LivroDiario({ turmaId, matricula, lancamentos, contas, documentos = [], rascunhoDeClassificacao, onRascunhoConsumido }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null); // lançamento sendo editado, ou null = novo
  const [valoresIniciais, setValoresIniciais] = useState(null); // pré-preenchimento vindo da Classificação Contábil
  const [historicoAberto, setHistoricoAberto] = useState({}); // id -> bool

  // Quando o aluno clica em "usar esta classificação no lançamento" na tela
  // de Classificação Contábil, chegamos aqui já com o formulário pré-cheio —
  // evita redigitar tudo de novo e mantém a ligação entre as duas etapas.
  useEffect(() => {
    if (!rascunhoDeClassificacao) return;
    setEditando(null);
    setValoresIniciais({
      documento: rascunhoDeClassificacao.documento || "",
      historico: rascunhoDeClassificacao.historico || rascunhoDeClassificacao.fato || "",
      partidas: [
        { conta: rascunhoDeClassificacao.contaDebito || "", tipo: "D", valor: rascunhoDeClassificacao.valor ?? "" },
        { conta: rascunhoDeClassificacao.contaCredito || "", tipo: "C", valor: rascunhoDeClassificacao.valor ?? "" },
      ],
    });
    setMostrarForm(true);
    onRascunhoConsumido?.();
  }, [rascunhoDeClassificacao]);

  async function salvar(novo) {
    if (editando) {
      await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula, "lancamentos", editando.id), novo);
    } else {
      await addDoc(collection(db, "turmas", turmaId, "alunos", matricula, "lancamentos"), {
        ...novo,
        criadoEm: serverTimestamp(),
      });
    }
    setMostrarForm(false);
    setEditando(null);
    setValoresIniciais(null);
  }

  function abrirNovo() {
    setEditando(null);
    setValoresIniciais(null);
    setMostrarForm(true);
  }

  function abrirEdicao(l) {
    setEditando(l);
    setValoresIniciais(null);
    setMostrarForm(true);
  }

  function cancelar() {
    setMostrarForm(false);
    setEditando(null);
    setValoresIniciais(null);
  }

  function alternarHistorico(id) {
    setHistoricoAberto((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <>
      <div className="screen-eyebrow">08 · livro diário</div>
      <h2 className="screen-title">Livro Diário</h2>
      <p className="screen-sub">Registro cronológico dos fatos contábeis da sua empresa didática. Só é enviado para análise quando débitos e créditos coincidem.</p>
      {!mostrarForm && <button className="btn" style={{ marginBottom: 18 }} onClick={abrirNovo}>+ Novo lançamento</button>}
      {mostrarForm && (
        <NovoLancamentoForm
          onSalvar={salvar}
          onCancelar={cancelar}
          documentos={documentos}
          contas={contas}
          lancamentoExistente={editando}
          valoresIniciais={valoresIniciais}
        />
      )}
      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Data</th><th>Doc.</th><th>Histórico</th><th>Partidas</th><th className="num">Valor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {lancamentos.slice().reverse().map((l) => {
                const editavel = EDITAVEIS.includes(l.status);
                const temHistorico = l.historicoCorrecoes?.length > 0;
                return (
                  <Fragment key={l.id}>
                    <tr>
                      <td className="mono">{l.data}</td>
                      <td className="mono">{l.documento}</td>
                      <td>{l.historico}</td>
                      <td>{l.partidas.map((p, i) => <div key={i} className="mono" style={{ fontSize: 12 }}>{(p.tipo === "D" ? "D " : "C ") + p.conta}</div>)}</td>
                      <td className="num mono">{fmt(l.partidas.filter((p) => p.tipo === "D").reduce((s, p) => s + p.valor, 0))}</td>
                      <td><StatusBadge status={l.status} /></td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {editavel && (
                            <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => abrirEdicao(l)}>
                              ✏️ Editar
                            </button>
                          )}
                          {temHistorico && (
                            <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => alternarHistorico(l.id)}>
                              🕘 Histórico ({l.historicoCorrecoes.length})
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {temHistorico && historicoAberto[l.id] && (
                      <tr>
                        <td colSpan={7} style={{ background: "var(--paper-deep)" }}>
                          <ol style={{ margin: "6px 0", paddingLeft: 18 }}>
                            {l.historicoCorrecoes.map((h, i) => (
                              <li key={i} style={{ marginBottom: 4 }}>
                                <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                                  {new Date(h.em).toLocaleString("pt-BR")}
                                </span>
                                {" — "}{h.obs}
                              </li>
                            ))}
                          </ol>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
