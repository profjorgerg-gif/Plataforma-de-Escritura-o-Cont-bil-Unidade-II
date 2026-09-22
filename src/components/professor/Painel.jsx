import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { Kpi } from "../shared/UI.jsx";
import { prazoEfetivo, diasAtraso, fmtData, descontoEfetivo, fmt } from "../../lib/contabil.js";

export default function Painel({ turma }) {
  const alunos = useAlunosDaTurma(turma?.id);
  const { todos } = useLancamentosDaTurma(turma?.id, alunos);
  const pendentes = todos.filter(({ lancamento }) => lancamento.status === "enviado");
  const emCorrecao = todos.filter(({ lancamento }) => lancamento.status === "correcao");
  const aprovadosTotal = todos.filter(({ lancamento }) => lancamento.status === "aprovado").length;

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
      <div className="screen-eyebrow">painel do professor</div>
      <h2 className="screen-title">Painel do Professor — Unidade II</h2>
      <p className="screen-sub">Visão geral da turma {turma.nome}, lançamentos pendentes e avaliação.</p>

      <div className="kpi-row">
        <Kpi label="Alunos na turma" value={alunos.length} />
        <Kpi label="Lançamentos pendentes" value={pendentes.length} tone="warn" />
        <Kpi label="Correções em aberto" value={emCorrecao.length} tone="bad" />
        <Kpi label="Aprovados na turma" value={aprovadosTotal} tone="ok" />
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Turma — {turma.nome}</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Aluno</th><th className="num">Pendentes</th><th className="num">Aprovados</th></tr></thead>
            <tbody>
              {alunos.map((a) => {
                const lancsAluno = todos.filter((t) => t.aluno.matricula === a.matricula).map((t) => t.lancamento);
                return (
                  <tr key={a.matricula}>
                    <td>{a.nome}</td>
                    <td className="num mono">{lancsAluno.filter((l) => l.status === "enviado").length}</td>
                    <td className="num mono">{lancsAluno.filter((l) => l.status === "aprovado").length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Avaliação — Nota da Unidade II</h3></div>
        <div className="panel-body">
          <div className="helper-note">Uma nota única por aluno para o ciclo completo da Unidade II. Desconto de pontualidade é calculado automaticamente a partir da política da turma (editável em Turmas), mas pode ser sobrescrito aqui. O aluno só vê a nota final depois de liberada.</div>
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
                <th className="num">Nota bruta</th><th className="num">Desconto</th><th className="num">Final</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => {
                const prazo = prazoEfetivo(a, turma);
                const dias = diasAtraso(a.dataEntrega, prazo);
                const desconto = descontoEfetivo(a, turma);
                const notaFinal = a.nota === null || a.nota === undefined ? null : Math.max(0, a.nota - desconto);
                return (
                  <tr key={a.matricula}>
                    <td>{a.nome}</td>
                    <td><span className="mono">{fmtData(prazo)}</span>{a.prazoIndividual && <span className="tag-pill" style={{ marginLeft: 6 }}>individual</span>}</td>
                    <td className="mono">{fmtData(a.dataEntrega)}</td>
                    <td className="num mono">{dias > 0 ? dias + "d" : "—"}</td>
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
