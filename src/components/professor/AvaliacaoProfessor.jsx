import { useState } from "react";
import { ETAPAS, etapaPorId, notaDaEtapa, limitaNota, fmtNota, faixaDaNota, DESCONTO_ATRASO, entregaEmAtraso, aplicaDesconto } from "../../lib/avaliacao.js";
import { resumoAtividade } from "../../lib/folhaAtividade.js";
import { casoDoEmpregado, opcoesDoEmpregado } from "../../lib/enunciadosCA.js";
import { folhaEmUso } from "../../lib/folha.js";
import { sugestaoEtapa } from "../../lib/notasAuto.js";
import { etapasEfetivas } from "../../lib/roteiro.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useCaTurma, useTrabalhosCaDaTurma } from "../../hooks/useCa.js";
import { useAgbTurma, useTrabalhosAgbDaTurma } from "../../hooks/useAgb.js";
import { useRescisaoTurma } from "../../hooks/useRescisao.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { useRoteiroTurma, useRoteiroDosAlunos, salvarAvaliacao, useLancamentosDaTurma } from "../../hooks/useRoteiro.js";

const fmtD = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

function Linha({ turmaId, aluno, etapa, salva, sugestoes, prazo, entregaISO, onSalvo }) {
  const [notas, setNotas] = useState(() => Object.fromEntries(etapa.criterios.map((c) => {
    const s = salva && salva.criterios && salva.criterios[c.key];
    const v = s && s.nota !== undefined ? s.nota : (sugestoes[c.key] ?? "");
    return [c.key, v === null ? "" : String(v).replace(".", ",")];
  })));
  const [coms, setComs] = useState(() => Object.fromEntries(etapa.criterios.map((c) => [c.key, (salva && salva.criterios && salva.criterios[c.key] && salva.criterios[c.key].comentario) || ""])));
  const [geral, setGeral] = useState((salva && salva.comentario) || "");
  const [lib, setLib] = useState(!!(salva && salva.liberada));
  const atrasado = !etapa.semAtraso && entregaEmAtraso(prazo, entregaISO);
  const [descontar, setDescontar] = useState(salva && salva.desconto !== undefined ? salva.desconto > 0 : atrasado);
  const [msg, setMsg] = useState("");
  const valores = Object.fromEntries(etapa.criterios.map((c) => [c.key, limitaNota(notas[c.key])]));
  const notaCrit = notaDaEtapa(etapa, valores);
  const desconto = descontar && !etapa.semAtraso ? DESCONTO_ATRASO : 0;
  const nota = aplicaDesconto(notaCrit, desconto);
  const f = faixaDaNota(nota);

  async function salvar() {
    setMsg("salvando…");
    try {
      const criterios = Object.fromEntries(etapa.criterios.map((c) => [c.key, { nota: valores[c.key], comentario: coms[c.key] }]));
      await salvarAvaliacao(turmaId, aluno.matricula, etapa.id, { criterios, notaCriterios: notaCrit, desconto, nota, comentario: geral, liberada: lib && nota !== null });
      setMsg("✓ salvo" + (lib && nota !== null ? " (o aluno já vê)" : "")); onSalvo();
    } catch (e) { setMsg("✗ não salvou: " + (e.message || e.code)); }
  }
  return (
    <div className="panel">
      <div className="panel-head"><h3>{aluno.nome || aluno.matricula}{aluno.contaTeste ? " (teste)" : ""}</h3><span className={"tag-pill " + (f ? f.classe : "")}>{fmtNota(nota)}{f ? " · " + f.nome : ""}</span></div>
      <div className="panel-body">
        {!etapa.semAtraso && (
          <div style={{ fontSize: 13, marginBottom: 8, color: atrasado ? "var(--red)" : "var(--ink-soft)" }}>
            Prazo: {prazo ? fmtD(prazo + "T12:00:00") : "não definido"} · Primeira entrega: {entregaISO ? fmtD(entregaISO) : "ainda não entregou"}{atrasado ? " · ATRASADA" : ""}
          </div>
        )}
        <table>
          <thead><tr><th>Critério</th><th className="num">Peso</th><th className="num">Nota 0–10</th><th>Retorno ao aluno</th></tr></thead>
          <tbody>
            {etapa.criterios.map((c) => (
              <tr key={c.key}>
                <td>{c.nome}{c.tipo === "auto" && sugestoes[c.key] !== null && sugestoes[c.key] !== undefined && <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>sugestão automática: {fmtNota(sugestoes[c.key])}</div>}</td>
                <td className="num mono">{c.peso}%</td>
                <td className="num"><input className="mono" inputMode="decimal" style={{ width: 64, textAlign: "right" }} value={notas[c.key]} onChange={(e) => setNotas({ ...notas, [c.key]: e.target.value })} /></td>
                <td><input style={{ width: "100%", minWidth: 180 }} value={coms[c.key]} onChange={(e) => setComs({ ...coms, [c.key]: e.target.value })} placeholder="o que ajustar" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 8, fontSize: 13.5 }}>
          Nota pelos critérios: <b>{fmtNota(notaCrit)}</b>
          {!etapa.semAtraso && <> · <label><input type="checkbox" checked={descontar} onChange={(e) => setDescontar(e.target.checked)} /> descontar {DESCONTO_ATRASO},0 pontos por entrega em atraso</label></>}
          {desconto > 0 && <> → nota da etapa <b>{fmtNota(nota)}</b></>}
        </div>
        <div className="field" style={{ marginTop: 8 }}><label>Comentário geral</label><textarea rows={2} value={geral} onChange={(e) => setGeral(e.target.value)} /></div>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={lib} onChange={(e) => setLib(e.target.checked)} /> Mostrar esta nota e o retorno ao aluno</label>
        <div className="btn-row" style={{ marginTop: 8 }}><button className="btn green" onClick={salvar}>Salvar avaliação</button>{msg && <span style={{ alignSelf: "center", fontSize: 13 }}>{msg}</span>}</div>
      </div>
    </div>
  );
}

export default function AvaliacaoProfessor({ turma }) {
  const tid = turma ? turma.id : null;
  const [etapaId, setEtapaId] = useState("fp");
  const alunos = useAlunosDaTurma(tid);
  const { mapa, recarregar } = useRoteiroDosAlunos(tid, alunos);
  const ca = useCaTurma(tid);
  const agb = useAgbTurma(tid);
  const resc = useRescisaoTurma(tid);
  const rotCfg = useRoteiroTurma(tid);
  const { contas } = usePlanoContas();
  const { mapa: trabCa } = useTrabalhosCaDaTurma(tid, alunos);
  const { mapa: trabAgb } = useTrabalhosAgbDaTurma(tid, alunos);
  const precisaLanc = ["ca", "resc", "agb"].includes(etapaId);
  const lancs = useLancamentosDaTurma(tid, alunos, precisaLanc);
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  const etapa = etapaPorId(etapaId);
  const ordem = (alunos || []).filter((a) => !a.contaTeste).concat((alunos || []).filter((a) => a.contaTeste));
  const ids = ((ca.config && ca.config.empregados) || []).map((e) => e.id);
  const prazo = (etapasEfetivas(rotCfg || null).find((e) => e.id === etapaId) || {}).prazo || "";

  function sugestoes(a) {
    if (etapaId === "fp") {
      const comp = folhaEmUso(ca.folha).competencia;
      const r = resumoAtividade(((trabCa || {})[a.matricula] || {}).fp || {}, ids, ids.length, (id) => casoDoEmpregado(a.matricula, id, comp, opcoesDoEmpregado(ca.config, id)));
      return { calculos: r.notaCalculos, quantidade: r.notaQuantidade };
    }
    return sugestaoEtapa(etapaId, {
      trabCa: (trabCa || {})[a.matricula], trabAgb: (trabAgb || {})[a.matricula], folhaCfg: ca.folha, casoCfg: resc.caso,
      lancamentos: (lancs || {})[a.matricula] || [], contas, anterior: agb.anterior, liberados: (agb.config && agb.config.exerciciosLiberados) || [],
    });
  }
  const pronto = alunos && mapa && trabCa && trabAgb && (!precisaLanc || (lancs && contas)) && ca.config !== undefined && agb.anterior !== undefined;
  return (
    <>
      <div className="screen-eyebrow">avaliação</div>
      <h2 className="screen-title">Avaliação das etapas (0,0 a 10,0)</h2>
      <p className="screen-sub">O sistema sugere a nota de cada critério que consegue conferir. Você revisa, ajusta e escreve o retorno. A entrega depois do prazo desconta {DESCONTO_ATRASO},0 pontos (você pode retirar o desconto). O aluno só vê depois que você marcar para mostrar. Não há média entre as etapas.</p>
      <div className="field" style={{ maxWidth: 460 }}>
        <label>Etapa</label>
        <select value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>{ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}</select>
      </div>
      {etapa.semAtraso && <div className="balance-check ok" style={{ marginBottom: 12 }}>Etapa 1: digite a nota que aparece na tela Notas. Ela já traz o desconto por atraso daquela tela; por isso aqui não há desconto de {DESCONTO_ATRASO},0 pontos.</div>}
      <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 10 }}>As sugestões automáticas conferem os números digitados pelo aluno. Pareceres e interpretações só recebem sugestão pelo preenchimento; a qualidade do texto é avaliação sua.</div>
      {!pronto ? <div className="empty-state">Carregando dados dos alunos…</div> : ordem.map((a) => {
        const av = (mapa[a.matricula] || {});
        const ent = av.entregas || {};
        return (
          <Linha key={etapaId + a.matricula + JSON.stringify((av.avaliacoes || {})[etapaId] || {})} turmaId={turma.id} aluno={a} etapa={etapa}
            salva={(av.avaliacoes || {})[etapaId]} sugestoes={sugestoes(a)} prazo={prazo} entregaISO={ent["p_" + etapaId] || ent[etapaId] || null} onSalvo={recarregar} />
        );
      })}
    </>
  );
}
