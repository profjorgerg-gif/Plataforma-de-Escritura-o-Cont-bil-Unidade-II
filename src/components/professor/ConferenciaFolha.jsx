import { useState } from "react";
import { fmt } from "../../lib/contabil.js";
import { folhaEmUso } from "../../lib/folha.js";
import { casoDoEmpregado, textoDoCaso, opcoesDoEmpregado } from "../../lib/enunciadosCA.js";
import { detalheEmpregado, resumoAtividade } from "../../lib/folhaAtividade.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useCaTurma, useTrabalhosCaDaTurma } from "../../hooks/useCa.js";

// Etapa 2 — conferência da folha por aluno (SÓ LEITURA). Mostra, para cada aluno e cada empregado: os dados do caso,
// o valor correto de cada linha do contracheque, o valor que o aluno digitou e se está certo. Não grava nada.
export default function ConferenciaFolha({ turma }) {
  const tid = turma ? turma.id : null;
  const alunos = useAlunosDaTurma(tid);
  const ca = useCaTurma(tid);
  const { mapa, recarregar } = useTrabalhosCaDaTurma(tid, alunos);
  const [mat, setMat] = useState(null);
  const [empId, setEmpId] = useState(null);

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (!alunos || !mapa || ca.config === undefined) return <div className="empty-state">Carregando…</div>;
  const empregados = (ca.config && ca.config.empregados) || [];
  const { competencia, parametros } = folhaEmUso(ca.folha);
  const ids = empregados.map((e) => e.id);
  const ordem = alunos.filter((a) => !a.contaTeste).concat(alunos.filter((a) => a.contaTeste));
  const fpDe = (a) => ((mapa[a.matricula] || {}).fp) || {};
  const baseDe = (a) => (id) => casoDoEmpregado(a.matricula, id, competencia, opcoesDoEmpregado(ca.config, id));

  if (empregados.length === 0) return (
    <>
      <div className="screen-eyebrow">etapa 2 · folha de pagamento</div>
      <h2 className="screen-title">Conferência da folha</h2>
      <div className="empty-state">A lista de empregados ainda não foi publicada. Publique em "Atividade da folha".</div>
    </>
  );

  const aluno = ordem.find((a) => a.matricula === mat) || null;
  const emp = aluno ? (empregados.find((e) => e.id === empId) || empregados[0]) : null;

  const certo = { color: "var(--green-dark)", fontWeight: 700 };
  const errado = { color: "var(--red, #b3261e)", fontWeight: 700 };

  function quadro() {
    return (
      <div className="panel"><div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Aluno</th><th className="num">Contracheques conferidos</th><th className="num">Nota dos cálculos</th><th>Resumo</th><th></th></tr></thead>
          <tbody>
            {ordem.map((a) => {
              const fp = fpDe(a);
              const r = resumoAtividade(fp, ids, ids.length, baseDe(a), parametros);
              const resumo = String(fp.resumo || "").trim();
              return (
                <tr key={a.matricula}>
                  <td>{a.nome}{a.contaTeste ? " (conta de teste)" : ""}</td>
                  <td className="num">{r.concluidos} de {r.minimo} {r.pronto ? <span className="tag-pill ok">pronto</span> : r.tentados ? <span className="tag-pill warn">em andamento</span> : <span className="tag-pill">não começou</span>}</td>
                  <td className="num">{r.notaCalculos === null ? "—" : String(r.notaCalculos).replace(".", ",")}</td>
                  <td>{resumo ? "escreveu" : "—"}</td>
                  <td><button className="btn secondary" style={{ padding: "3px 10px", fontSize: 12.5 }} onClick={() => { setMat(a.matricula); setEmpId(null); }}>Conferir</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div></div>
    );
  }

  function detalhe() {
    const fp = fpDe(aluno);
    const base = baseDe(aluno);
    const d = detalheEmpregado(fp, emp.id, undefined, base(emp.id), parametros);
    const resumo = String(fp.resumo || "").trim();
    return (
      <>
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <button className="btn secondary" onClick={() => setMat(null)}>← Voltar à lista</button>
        </div>
        <div className="panel"><div className="panel-head"><h3>{aluno.nome}</h3></div><div className="panel-body">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {empregados.map((e) => {
              const s = detalheEmpregado(fp, e.id, undefined, base(e.id), parametros);
              return <button key={e.id} className={"btn" + (e.id === emp.id ? "" : " secondary")} style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={() => setEmpId(e.id)}>{e.nome}{s.concluido ? " ✓" : s.iniciado ? " …" : ""}</button>;
            })}
          </div>
        </div></div>
        <div className="panel"><div className="panel-head"><h3>Empregado: {emp.nome}</h3></div><div className="panel-body">
          <p style={{ marginTop: 0, fontSize: 13.5 }}>{textoDoCaso(emp.nome, d.dados, competencia, "")}</p>
          <div className="helper-note">Os dados acima são os que o aluno está usando (o enunciado, ou o que ele alterou).</div>
        </div></div>
        <div className="panel"><div className="panel-head"><h3>Contracheque · {d.acertos} de {d.linhas.length} linhas certas {d.iniciado ? "" : "(ainda sem digitar)"}</h3></div>
          <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
            <table>
              <thead><tr><th>Item</th><th className="num">Correto</th><th className="num">O aluno digitou</th><th>Situação</th></tr></thead>
              <tbody>
                {d.linhas.map((l) => (
                  <tr key={l.k} style={l.k === "liq" ? { fontWeight: 700 } : null}>
                    <td>{l.nome}</td>
                    <td className="num">{fmt(l.esperado)}</td>
                    <td className="num">{l.digitado === null ? "—" : fmt(l.digitado)}</td>
                    <td>{l.digitado === null ? <span style={{ color: "var(--ink-faint)" }}>não digitou</span> : l.ok ? <span style={certo}>✓ certo</span> : <span style={errado}>✗ diferente</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel"><div className="panel-head"><h3>Resumo do aluno sobre a folha</h3></div><div className="panel-body">
          {resumo ? <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{resumo}</p> : <span style={{ color: "var(--ink-faint)" }}>O aluno ainda não escreveu o resumo.</span>}
        </div></div>
      </>
    );
  }

  return (
    <>
      <div className="screen-eyebrow">etapa 2 · folha de pagamento</div>
      <h2 className="screen-title">Conferência da folha</h2>
      <p className="screen-sub">O que cada aluno calculou em cada empregado, com o valor correto ao lado. Só leitura: a nota é lançada em "Avaliação das etapas".</p>
      <div className="btn-row" style={{ marginBottom: 10 }}>
        <button className="btn secondary" onClick={recarregar}>↻ Atualizar</button>
      </div>
      {aluno ? detalhe() : quadro()}
    </>
  );
}
