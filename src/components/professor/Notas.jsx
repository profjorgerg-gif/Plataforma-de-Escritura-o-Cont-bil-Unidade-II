import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useProgressoTurma } from "../../hooks/useProgressoTurma.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { CriteriosAvaliacao } from "../shared/UI.jsx";
import {
  prazoEfetivo, diasAtraso, fmtData, descontoEfetivo, fmt,
  completudeCiclo, autonomiaCorrecoes, notaFinalPonderada, qualidadeTecnicaAutomatica,
} from "../../lib/contabil.js";

// Mesma tabela de avaliação que antes ficava lá embaixo em "Painel do
// professor" — agora com item próprio no menu, pra acesso rápido sem rolar
// a página (pedido do professor em 2026-10-08).
export default function Notas({ turma }) {
  const alunos = useAlunosDaTurma(turma?.id);
  const { todos } = useLancamentosDaTurma(turma?.id, alunos);
  const documentos = useDocumentosDaTurma(turma?.id);
  const progressoTurma = useProgressoTurma(turma?.id, alunos);
  const { contas } = usePlanoContas();

  const [prorrogando, setProrrogando] = useState(null); // matricula
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
      <h2 className="screen-title">Notas — Unidade II</h2>
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
                return (
                  <tr key={a.matricula}>
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
                      <button className="btn secondary" style={{ marginRight: 6 }} onClick={() => abrirProrrogacao(a)}>novo prazo</button>
                      <button className={a.notaLiberada ? "btn red" : "btn green"} disabled={a.nota === null || a.nota === undefined} onClick={() => toggleLiberada(a.matricula, a.notaLiberada)}>{a.notaLiberada ? "ocultar" : "liberar"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
