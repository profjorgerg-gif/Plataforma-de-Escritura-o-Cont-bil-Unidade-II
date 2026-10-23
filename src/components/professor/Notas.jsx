import { useState, Fragment } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useProgressoTurma } from "../../hooks/useProgressoTurma.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { CriteriosAvaliacao } from "../shared/UI.jsx";
import {
  prazoEfetivo, diasAtraso, fmtData, descontoEfetivo, fmt,
  completudeCiclo, autonomiaCorrecoes, notaFinalPonderada, qualidadeTecnicaAutomatica,
} from "../../lib/contabil.js";
import { parecerEtapa1 } from "../../lib/parecerNota.js";


// Ficha do aluno: nota sugerida com a conta aberta + parecer técnico editável (2026-10-23).
// O parecer fica no documento do aluno (campo "parecer") e o aluno o vê junto com a nota, quando ela é liberada.
function FichaParecer({ aluno, d, onSalvar }) {
  const [texto, setTexto] = useState(aluno.parecer ?? "");
  const [msg, setMsg] = useState("");
  const linhas = [
    ["Completude", d.completudePct === null ? "—" : d.completudePct + "%", d.completudePct === null ? "—" : fmt(d.completudePct / 10), "45%", d.completudePct === null ? "—" : fmt((d.completudePct / 10) * 0.45)],
    ["Qualidade técnica", d.qualidadeNota === null || d.qualidadeNota === undefined ? "sem nota" : "nota digitada", d.qualidadeNota === null || d.qualidadeNota === undefined ? "—" : fmt(Number(d.qualidadeNota)), "35%", d.qualidadeNota === null || d.qualidadeNota === undefined ? "—" : fmt(Number(d.qualidadeNota) * 0.35)],
    ["Autonomia nas correções", d.autonomiaPct === null ? "—" : d.autonomiaPct + "%", fmt((d.autonomiaPct === null ? 100 : d.autonomiaPct) / 10), "20%", fmt(((d.autonomiaPct === null ? 100 : d.autonomiaPct) / 10) * 0.2)],
  ];
  async function gravar(t) { setMsg("salvando…"); try { await onSalvar(t); setMsg("✓ parecer salvo"); } catch (e) { setMsg("✗ não salvou: " + (e.message || e.code)); } }
  return (
    <div className="panel-body" style={{ background: "var(--paper)" }}>
      <div className="grid-2">
        <div>
          <b style={{ fontSize: 12.5 }}>Como a nota foi composta</b>
          <table>
            <thead><tr><th>Critério</th><th>Resultado</th><th className="num">Nota</th><th className="num">Peso</th><th className="num">Pontos</th></tr></thead>
            <tbody>
              {linhas.map((l) => <tr key={l[0]}><td>{l[0]}</td><td>{l[1]}</td><td className="num mono">{l[2]}</td><td className="num mono">{l[3]}</td><td className="num mono">{l[4]}</td></tr>)}
              {d.desconto > 0 && <tr><td colSpan={4}>Desconto por atraso ({d.dias} dia(s))</td><td className="num mono">−{fmt(d.desconto)}</td></tr>}
              <tr><td colSpan={4}><b>Nota final sugerida</b></td><td className="num mono"><b>{d.notaFinal === null ? "—" : fmt(d.notaFinal)}</b></td></tr>
            </tbody>
          </table>
          {d.qualidadeNota === null || d.qualidadeNota === undefined ? <div className="helper-note">Digite a qualidade técnica (ou clique em "usar" na sugestão) para fechar a nota final e o parecer.</div> : null}
        </div>
        <div>
          <b style={{ fontSize: 12.5 }}>Parecer técnico (o aluno vê junto com a nota liberada)</b>
          <textarea rows={11} style={{ width: "100%", boxSizing: "border-box", marginTop: 4 }} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Clique em “Gerar parecer” e ajuste o texto." />
          <div className="btn-row" style={{ marginTop: 6 }}>
            <button className="btn secondary" onClick={() => setTexto(parecerEtapa1(d))}>Gerar parecer</button>
            <button className="btn green" onClick={() => gravar(texto)}>Salvar parecer</button>
            {aluno.parecer && <button className="btn secondary" onClick={() => { setTexto(""); gravar(""); }}>Apagar</button>}
            {msg && <span style={{ alignSelf: "center", fontSize: 13 }}>{msg}</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 4 }}>{aluno.notaLiberada ? "Nota liberada: o aluno já vê o parecer salvo." : "Nota ainda não liberada: o aluno não vê nada."}</div>
        </div>
      </div>
    </div>
  );
}

// Mesma tabela de avaliação que antes ficava lá embaixo em "Painel do
// professor" — agora com item próprio no menu, pra acesso rápido sem rolar
// a página (pedido do professor em 2026-10-08).
export default function Notas({ turma }) {
  const alunos = useAlunosReaisDaTurma(turma?.id);
  const { todos } = useLancamentosDaTurma(turma?.id, alunos);
  const documentos = useDocumentosDaTurma(turma?.id);
  const progressoTurma = useProgressoTurma(turma?.id, alunos);
  const { contas } = usePlanoContas();

  const [prorrogando, setProrrogando] = useState(null); // matricula
  const [fichaDe, setFichaDe] = useState(null); // matricula com a ficha de parecer aberta
  const [novoPrazoData, setNovoPrazoData] = useState("");
  const [novoPrazoMotivo, setNovoPrazoMotivo] = useState("");

  function alunoRef(matricula) { return doc(db, "turmas", turma.id, "alunos", matricula); }

  async function setNota(matricula, valor) {
    await updateDoc(alunoRef(matricula), { nota: valor === "" ? null : Number(valor) });
  }
  async function setDesconto(matricula, valor) {
    await updateDoc(alunoRef(matricula), { desconto: valor === "" ? 0 : Number(valor), descontoManual: true });
  }
  async function toggleLiberada(matricula, atual) {
    await updateDoc(alunoRef(matricula), { notaLiberada: !atual });
  }
  async function usarSugestaoAutomatica(matricula) {
    await updateDoc(alunoRef(matricula), { descontoManual: false });
  }
  async function usarSugestaoQualidade(matricula, notaSugerida) {
    await setNota(matricula, notaSugerida);
  }
  function abrirProrrogacao(a) {
    setProrrogando(a.matricula); setNovoPrazoData(prazoEfetivo(a, turma)); setNovoPrazoMotivo("");
  }
  async function confirmarProrrogacao() {
    if (!novoPrazoData) return;
    await updateDoc(alunoRef(prorrogando), {
      prazoIndividual: novoPrazoData,
      prazoHistorico: arrayUnion({ data: novoPrazoData, motivo: novoPrazoMotivo }),
    });
    setProrrogando(null);
  }

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (alunos === null) return <div className="empty-state">Carregando…</div>;

  const alunoProrrogando = alunos.find((a) => a.matricula === prorrogando);

  return (
    <>
      <div className="screen-eyebrow">avaliação</div>
      <h2 className="screen-title">Notas — Etapa 1 · Escrituração</h2>
      <p className="screen-sub">Avaliação da turma {turma.nome}.</p>

      <CriteriosAvaliacao turma={turma} />

      <div className="panel">
        <div className="panel-body">
          <div className="helper-note">
            Digite apenas a nota de <b>qualidade técnica</b> (coluna abaixo) — completude, autonomia e nota final são calculados sozinhos. O aluno só vê os números depois de liberada.
          </div>
          {!turma.prazoUnidadeII && <div className="balance-check bad" style={{ marginBottom: 14 }}>Nenhum prazo definido para esta turma ainda — configure em Turmas.</div>}

          {prorrogando && alunoProrrogando && (
            <div className="panel" style={{ marginBottom: 14 }}>
              <div className="panel-head"><h3>Novo prazo — {alunoProrrogando.nome}</h3></div>
              <div className="panel-body">
                <div className="grid-2">
                  <div className="field"><label>Novo prazo individual</label><input type="date" className="mono" value={novoPrazoData} onChange={(e) => setNovoPrazoData(e.target.value)} /></div>
                  <div className="field"><label>Motivo (opcional)</label><input value={novoPrazoMotivo} onChange={(e) => setNovoPrazoMotivo(e.target.value)} /></div>
                </div>
                {(alunoProrrogando.prazoHistorico || []).length > 0 && (
                  <div className="helper-note">Histórico: {alunoProrrogando.prazoHistorico.map((p) => fmtData(p.data) + (p.motivo ? " (" + p.motivo + ")" : "")).join(" · ")}</div>
                )}
                <div className="btn-row">
                  <button className="btn" onClick={confirmarProrrogacao}>Salvar novo prazo</button>
                  <button className="btn secondary" onClick={() => setProrrogando(null)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          <table>
            <thead>
              <tr>
                <th>Aluno</th><th>Prazo</th><th>Entrega</th><th className="num">Atraso</th>
                <th className="num">Completude</th><th className="num">Autonomia</th>
                <th className="num">Sugestão</th><th className="num">Qualidade técnica</th><th className="num">Desconto</th>
                <th className="num">Nota final</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => {
                const prazo = prazoEfetivo(a, turma);
                const dias = diasAtraso(a.dataEntrega, prazo);
                const desconto = descontoEfetivo(a, turma);
                const lancsAluno = todos.filter((t) => t.aluno.matricula === a.matricula).map((t) => t.lancamento);
                const completudePct = completudeCiclo(
                  documentos,
                  progressoTurma.digitacoesPorMatricula[a.matricula],
                  progressoTurma.analisesPorMatricula[a.matricula],
                  progressoTurma.classificacoesPorMatricula[a.matricula],
                  lancsAluno
                );
                const autonomiaPct = autonomiaCorrecoes(lancsAluno);
                const notaFinal = notaFinalPonderada({ completudePct, qualidadeNota: a.nota, autonomiaPct, desconto });
                const qualidadeAuto = qualidadeTecnicaAutomatica({
                  documentos,
                  lancamentos: lancsAluno,
                  analises: progressoTurma.analisesPorMatricula[a.matricula],
                  classificacoes: progressoTurma.classificacoesPorMatricula[a.matricula],
                  contas: contas || [],
                });
                const dadosFicha = {
                  completudePct, autonomiaPct, qual: qualidadeAuto, qualidadeNota: a.nota, notaFinal, desconto, dias,
                  prazoTxt: fmtData(prazo),
                  rodadas: lancsAluno.reduce((t, l) => t + (l.historicoCorrecoes?.length || 0), 0),
                };
                return (
                  <Fragment key={a.matricula}>
                  <tr>
                    <td>{a.nome}</td>
                    <td><span className="mono">{fmtData(prazo)}</span>{a.prazoIndividual && <span className="tag-pill" style={{ marginLeft: 6 }}>individual</span>}</td>
                    <td className="mono">{fmtData(a.dataEntrega)}</td>
                    <td className="num mono">{dias > 0 ? dias + "d" : "—"}</td>
                    <td className="num mono">{completudePct === null ? "—" : completudePct + "%"}</td>
                    <td className="num mono">{autonomiaPct === null ? "—" : autonomiaPct + "%"}</td>
                    <td className="num">
                      {qualidadeAuto?.notaSugerida !== null && qualidadeAuto?.notaSugerida !== undefined ? (
                        <>
                          <div className="mono">{fmt(qualidadeAuto.notaSugerida)}</div>
                          <button className="btn secondary" style={{ padding: "2px 6px", fontSize: "10.5px", marginTop: 3 }} onClick={() => usarSugestaoQualidade(a.matricula, qualidadeAuto.notaSugerida)}>usar</button>
                        </>
                      ) : <span className="mono">—</span>}
                    </td>
                    <td><input type="number" min={0} max={10} step={0.1} className="mono" style={{ width: 70, padding: "5px 6px" }} value={a.nota ?? ""} onChange={(e) => setNota(a.matricula, e.target.value)} /></td>
                    <td>
                      <input type="number" min={0} step={0.1} className="mono" style={{ width: 60, padding: "5px 6px" }} value={desconto} onChange={(e) => setDesconto(a.matricula, e.target.value)} />
                      <div style={{ fontSize: "10.5px", color: "var(--ink-faint)", marginTop: 3 }}>
                        {a.descontoManual ? "manual" : (dias > 0 ? "automático" : "—")}
                        {a.descontoManual && <button className="btn secondary" style={{ marginLeft: 6, padding: "2px 6px", fontSize: "10.5px" }} onClick={() => usarSugestaoAutomatica(a.matricula)}>usar automático</button>}
                      </div>
                    </td>
                    <td className="num mono">{notaFinal === null ? "—" : fmt(notaFinal)}</td>
                    <td><span className={"status " + (a.notaLiberada ? "aprovado" : "rascunho")}>{a.notaLiberada ? "liberada" : "não liberada"}</span></td>
                    <td>
                      <button className="btn secondary" style={{ marginRight: 6 }} onClick={() => setFichaDe(fichaDe === a.matricula ? null : a.matricula)}>{a.parecer ? "📝 parecer ✓" : "📝 parecer"}</button>
                      <button className="btn secondary" style={{ marginRight: 6 }} onClick={() => abrirProrrogacao(a)}>novo prazo</button>
                      <button className={a.notaLiberada ? "btn red" : "btn green"} disabled={a.nota === null || a.nota === undefined} onClick={() => toggleLiberada(a.matricula, a.notaLiberada)}>{a.notaLiberada ? "ocultar" : "liberar"}</button>
                    </td>
                  </tr>
                  {fichaDe === a.matricula && <tr><td colSpan={12} style={{ padding: 0 }}><FichaParecer key={a.matricula} aluno={a} d={dadosFicha} onSalvar={(t) => updateDoc(alunoRef(a.matricula), { parecer: t })} /></td></tr>}
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
