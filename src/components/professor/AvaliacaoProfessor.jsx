import { useState } from "react";
import { ETAPAS, etapaPorId, notaDaEtapa, limitaNota, fmtNota, faixaDaNota } from "../../lib/avaliacao.js";
import { resumoAtividade } from "../../lib/folhaAtividade.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useCaTurma, useTrabalhosCaDaTurma } from "../../hooks/useCa.js";
import { useRoteiroDosAlunos, salvarAvaliacao } from "../../hooks/useRoteiro.js";

function Linha({ turmaId, aluno, etapa, salva, sugestoes, onSalvo }) {
  const [notas, setNotas] = useState(() => Object.fromEntries(etapa.criterios.map((c) => {
    const s = salva && salva.criterios && salva.criterios[c.key];
    const v = s && s.nota !== undefined ? s.nota : (sugestoes[c.key] ?? "");
    return [c.key, v === null ? "" : String(v).replace(".", ",")];
  })));
  const [coms, setComs] = useState(() => Object.fromEntries(etapa.criterios.map((c) => [c.key, (salva && salva.criterios && salva.criterios[c.key] && salva.criterios[c.key].comentario) || ""])));
  const [geral, setGeral] = useState((salva && salva.comentario) || "");
  const [lib, setLib] = useState(!!(salva && salva.liberada));
  const [msg, setMsg] = useState("");
  const valores = Object.fromEntries(etapa.criterios.map((c) => [c.key, limitaNota(notas[c.key])]));
  const nota = notaDaEtapa(etapa, valores);
  const f = faixaDaNota(nota);

  async function salvar() {
    setMsg("salvando…");
    try {
      const criterios = Object.fromEntries(etapa.criterios.map((c) => [c.key, { nota: valores[c.key], comentario: coms[c.key] }]));
      await salvarAvaliacao(turmaId, aluno.matricula, etapa.id, { criterios, nota, comentario: geral, liberada: lib && nota !== null });
      setMsg("✓ salvo" + (lib && nota !== null ? " (o aluno já vê)" : "")); onSalvo();
    } catch (e) { setMsg("✗ não salvou: " + (e.message || e.code)); }
  }
  return (
    <div className="panel">
      <div className="panel-head"><h3>{aluno.nome || aluno.matricula}{aluno.contaTeste ? " (teste)" : ""}</h3><span className={"tag-pill " + (f ? f.classe : "")}>{fmtNota(nota)}{f ? " · " + f.nome : ""}</span></div>
      <div className="panel-body">
        <table>
          <thead><tr><th>Critério</th><th className="num">Peso</th><th className="num">Nota 0–10</th><th>Retorno ao aluno</th></tr></thead>
          <tbody>
            {etapa.criterios.map((c) => (
              <tr key={c.key}>
                <td>{c.nome}{c.tipo === "auto" && <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>sugestão automática</div>}</td>
                <td className="num mono">{c.peso}%</td>
                <td className="num"><input className="mono" inputMode="decimal" style={{ width: 64, textAlign: "right" }} value={notas[c.key]} onChange={(e) => setNotas({ ...notas, [c.key]: e.target.value })} /></td>
                <td><input style={{ width: "100%", minWidth: 180 }} value={coms[c.key]} onChange={(e) => setComs({ ...coms, [c.key]: e.target.value })} placeholder="o que ajustar" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="field" style={{ marginTop: 8 }}><label>Comentário geral</label><textarea rows={2} value={geral} onChange={(e) => setGeral(e.target.value)} /></div>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={lib} onChange={(e) => setLib(e.target.checked)} /> Mostrar esta nota e o retorno ao aluno</label>
        <div className="btn-row" style={{ marginTop: 8 }}><button className="btn green" onClick={salvar}>Salvar avaliação</button>{msg && <span style={{ alignSelf: "center", fontSize: 13 }}>{msg}</span>}</div>
      </div>
    </div>
  );
}

export default function AvaliacaoProfessor({ turma }) {
  const [etapaId, setEtapaId] = useState("fp");
  const alunos = useAlunosDaTurma(turma ? turma.id : null);
  const { mapa, recarregar } = useRoteiroDosAlunos(turma ? turma.id : null, alunos);
  const ca = useCaTurma(turma ? turma.id : null);
  const { mapa: trabCa } = useTrabalhosCaDaTurma(turma ? turma.id : null, alunos);
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  const etapa = etapaPorId(etapaId);
  const ordem = (alunos || []).filter((a) => !a.contaTeste).concat((alunos || []).filter((a) => a.contaTeste));
  const ids = ((ca.config && ca.config.empregados) || []).map((e) => e.id);

  function sugestoes(a) {
    if (etapaId !== "fp" || !trabCa) return {};
    const fp = (trabCa[a.matricula] || {}).fp || {};
    const r = resumoAtividade(fp, ids, (ca.config && ca.config.fpMinimo) || 3);
    return { calculos: r.notaCalculos, quantidade: r.notaQuantidade };
  }
  return (
    <>
      <div className="screen-eyebrow">avaliação</div>
      <h2 className="screen-title">Avaliação das etapas (0,0 a 10,0)</h2>
      <p className="screen-sub">Cada etapa tem critérios com peso. Digite a nota de cada critério e o retorno; o sistema calcula a nota da etapa. O aluno só vê depois que você marcar para mostrar. Não há média entre as etapas.</p>
      <div className="field" style={{ maxWidth: 420 }}>
        <label>Etapa</label>
        <select value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>{ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}</select>
      </div>
      {etapaId === "fp" && <div className="balance-check ok" style={{ marginBottom: 12 }}>Para esta etapa, "Cálculos conferidos" e "Quantidade de contracheques" vêm preenchidos com a sugestão do sistema (você pode alterar).</div>}
      {!alunos || !mapa || !trabCa ? <div className="empty-state">Carregando…</div> : ordem.map((a) => (
        <Linha key={etapaId + a.matricula + JSON.stringify((mapa[a.matricula] || {}).avaliacoes?.[etapaId] || {})} turmaId={turma.id} aluno={a} etapa={etapa}
          salva={(mapa[a.matricula] || {}).avaliacoes?.[etapaId]} sugestoes={sugestoes(a)} onSalvo={recarregar} />
      ))}
    </>
  );
}
