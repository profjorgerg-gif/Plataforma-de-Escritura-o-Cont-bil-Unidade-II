import { useState } from "react";
import { serverTimestamp } from "firebase/firestore";
import { criarChamadoNumerado } from "../../lib/chamados.js";
import DashboardCiclo from "./DashboardCiclo.jsx";
import { GRUPOS_ETAPAS, ETAPAS as ETAPAS_BASE, notaDaEtapa, fmtNota, limitaNota } from "../../lib/avaliacao.js";
import { resumoAtividade, situacaoEmpregado, PASSOS_CONTRACHEQUE } from "../../lib/folhaAtividade.js";
import { casoDoEmpregado, opcoesDoEmpregado } from "../../lib/enunciadosCA.js";
import { folhaEmUso } from "../../lib/folha.js";
import { folhaDoAluno } from "../../lib/folhaAluno.js";
import { sugestaoEtapa } from "../../lib/notasAuto.js";
import { situacaoPrazo } from "../../lib/fechamento.js";
import { etapasEfetivas } from "../../lib/roteiro.js";
import { orientacaoEtapa, NOTA_OK } from "../../lib/orientacaoEtapas.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useCaTurma, useTrabalhosCaDaTurma } from "../../hooks/useCa.js";
import { useAgbTurma, useTrabalhosAgbDaTurma } from "../../hooks/useAgb.js";
import { useRescisaoTurma } from "../../hooks/useRescisao.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { useRoteiroTurma, useRoteiroDosAlunos, useLancamentosDaTurma } from "../../hooks/useRoteiro.js";

// Dashboard do ciclo por etapas (pedido do professor, 13/11/2026).
// Etapa 1 = o painel de Entrada × Saída que já existia (inalterado). Etapas 2 a 6 = andamento, nota parcial até o fechamento
// da etapa (prazo) e orientação por aluno, com envio pelo Suporte. Só LÊ dados; nada do aluno é alterado.
const ETAPAS = ETAPAS_BASE.map((e, i) => ({ ...e, n: i + 1 }));
const ROTULOS = { f1: "Escrituração", fp: "Folha de pagamento", ca: "Folha, provisões e contabilização", resc: "Rescisão trabalhista", agb: "Análise gerencial de balanços", comp: "Análise comparativa" };

const dec = (v) => (v === null || v === undefined ? "—" : fmtNota(v));

// Nota parcial: média dos critérios que já têm nota (a avaliação salva vale mais que a sugestão automática).
function notasDoAluno(etapa, sug, salva) {
  const vals = {};
  etapa.criterios.forEach((c) => {
    const s = salva && salva.criterios && salva.criterios[c.key];
    const v = s && s.nota !== undefined && s.nota !== null && s.nota !== "" ? limitaNota(s.nota) : sug && sug[c.key] !== undefined ? sug[c.key] : null;
    vals[c.key] = v === undefined ? null : v;
  });
  const dispon = etapa.criterios.filter((c) => vals[c.key] !== null);
  const peso = dispon.reduce((s, c) => s + c.peso, 0);
  const parcial = peso > 0 ? Math.round(dispon.reduce((s, c) => s + Number(vals[c.key]) * c.peso, 0) / peso * 10) / 10 : null;
  const completa = notaDaEtapa(etapa, vals);
  const final = salva && salva.nota !== undefined && salva.nota !== null ? salva.nota : null;
  return { vals, parcial, completa, final, cobertura: peso };
}

export default function DashboardEtapas({ turma, onSelecionarAluno }) {
  const [aba, setAba] = useState("g1");
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  const abas = [{ id: "geral", t: "Visão geral", s: "todas as etapas" }, ...GRUPOS_ETAPAS.map((g) => ({ id: g.id, t: g.titulo.split(" · ")[0], s: g.titulo.split(" · ")[1] }))];
  return (
    <>
      <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }} role="tablist">
        {abas.map((a) => (
          <button key={a.id} role="tab" aria-selected={aba === a.id} className={"btn " + (aba === a.id ? "" : "secondary")} onClick={() => setAba(a.id)}
            style={{ textAlign: "left", padding: "7px 12px", lineHeight: 1.25 }}>
            <b>{a.t}</b><br /><span style={{ fontSize: 11.5, fontWeight: 400 }}>{a.s}</span>
          </button>
        ))}
      </div>
      {aba === "g1" ? <DashboardCiclo turma={turma} onSelecionarAluno={onSelecionarAluno} /> : <PainelEtapas turma={turma} aba={aba} onSelecionarAluno={onSelecionarAluno} />}
    </>
  );
}

function PainelEtapas({ turma, aba, onSelecionarAluno }) {
  const tid = turma.id;
  const alunos = useAlunosDaTurma(tid);
  const ca = useCaTurma(tid);
  const agb = useAgbTurma(tid);
  const resc = useRescisaoTurma(tid);
  const rotCfg = useRoteiroTurma(tid);
  const { contas } = usePlanoContas();
  const { mapa } = useRoteiroDosAlunos(tid, alunos);
  const { mapa: trabCa } = useTrabalhosCaDaTurma(tid, alunos);
  const { mapa: trabAgb } = useTrabalhosAgbDaTurma(tid, alunos);
  const lancs = useLancamentosDaTurma(tid, alunos, true);
  const [orient, setOrient] = useState(null); // { aluno, etapa, texto }
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const pronto = alunos && mapa && trabCa && trabAgb && lancs && contas && ca.config !== undefined && agb.anterior !== undefined;
  if (!pronto) return <div className="empty-state">Carregando dados dos alunos…</div>;

  const idsEmp = ((ca.config && ca.config.empregados) || []).map((e) => e.id);
  const prazos = Object.fromEntries(etapasEfetivas(rotCfg || null).map((e) => [e.id, e.prazo]));

  function sugestoes(a, etapaId) {
    if (etapaId === "f1") return {};
    if (etapaId === "fp") {
      const { competencia: comp, parametros: parFolha } = folhaEmUso(ca.folha);
      const r = resumoAtividade(((trabCa || {})[a.matricula] || {}).fp || {}, idsEmp, idsEmp.length, (id) => casoDoEmpregado(a.matricula, id, comp, opcoesDoEmpregado(ca.config, id)), parFolha);
      return { calculos: r.notaCalculos, quantidade: r.notaQuantidade };
    }
    return sugestaoEtapa(etapaId, {
      trabCa: (trabCa || {})[a.matricula], trabAgb: (trabAgb || {})[a.matricula], folhaCfg: folhaDoAluno(ca.folha, ca.config, a.matricula), folhaTurma: ca.folha, casoCfg: resc.caso,
      lancamentos: (lancs || {})[a.matricula] || [], contas, anterior: agb.anterior, liberados: (agb.config && agb.config.exerciciosLiberados) || [],
    });
  }
  // contracheques com linhas erradas ou não iniciados (Etapa 2): itens extras da orientação
  function extraFp(a) {
    const { competencia: comp, parametros: parFolha } = folhaEmUso(ca.folha);
    const fp = ((trabCa || {})[a.matricula] || {}).fp || {};
    const nomeDe = (id) => ((ca.config.empregados || []).find((e) => e.id === id) || {}).nome || id;
    const pend = [], vazios = [];
    idsEmp.forEach((id) => {
      const s = situacaoEmpregado(fp, id, undefined, casoDoEmpregado(a.matricula, id, comp, opcoesDoEmpregado(ca.config, id)), parFolha);
      if (!s.iniciado) vazios.push(nomeDe(id));
      else if (!s.concluido) {
        const erradas = s.passos.map((p, i) => (p.digitado && !p.ok ? PASSOS_CONTRACHEQUE[i].nome.replace(/\s*\(.*$/, "") : null)).filter(Boolean);
        const faltam = s.passos.filter((p) => !p.digitado).length;
        pend.push(nomeDe(id).split(" ").slice(0, 2).join(" ") + ": " + (erradas.length ? "revisar " + erradas.join(", ") : "") + (faltam ? (erradas.length ? "; " : "") + faltam + " linha(s) em branco" : ""));
      }
    });
    const ex = [];
    if (pend.length) ex.push({ criterio: "Contracheques com linhas para revisar", nota: null, orientacao: pend.slice(0, 8).join(" | ") + (pend.length > 8 ? " | e mais " + (pend.length - 8) : ""), onde: "Etapa 2 · Folha de pagamento → Atividade · Elaborar a folha" });
    if (vazios.length) ex.push({ criterio: "Contracheques ainda não iniciados (" + vazios.length + ")", nota: null, orientacao: vazios.slice(0, 8).map((n) => n.split(" ").slice(0, 2).join(" ")).join(", ") + (vazios.length > 8 ? " e mais " + (vazios.length - 8) : ""), onde: "Etapa 2 · Folha de pagamento → Atividade · Elaborar a folha" });
    return ex;
  }

  const linhaDe = (a, etapa) => {
    const salva = ((mapa[a.matricula] || {}).avaliacoes || {})[etapa.id];
    const sug = sugestoes(a, etapa.id);
    return { a, sug, salva, ...notasDoAluno(etapa, sug, salva) };
  };
  const ordem = [...alunos].sort((x, y) => (x.nome || "").localeCompare(y.nome || "", "pt-BR"));

  function abrirOrient(a, etapa, l, fechada) {
    const o = orientacaoEtapa({ etapa, aluno: a, sug: l.sug, extra: etapa.id === "fp" ? extraFp(a) : [], fechada, nota: l.final !== null ? l.final : l.parcial });
    setMsg(""); setOrient({ aluno: a, etapa, texto: o.texto, n: o.itens.length });
  }
  async function enviar() {
    if (!orient || !orient.texto.trim()) return;
    setOcupado(true); setMsg("");
    try {
      const r = await criarChamadoNumerado(tid, {
        matricula: orient.aluno.matricula, alunoNome: orient.aluno.nome || "", assunto: "Orientação do professor · Etapa " + orient.etapa.n,
        documentoId: null, documentoNumero: null, status: "respondido", iniciadoPor: "professor",
        mensagens: [{ autor: "professor", texto: orient.texto.trim(), em: new Date().toISOString() }],
        naoLidoProfessor: false, naoLidoAluno: true, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      });
      setOrient(null);
      setMsg("Orientação enviada pelo Suporte" + (r && r.numero ? " (chamado Nº " + String(r.numero).padStart(4, "0") + ")" : "") + ". O aluno vê no menu Suporte.");
    } catch (e) { setMsg("Não foi possível enviar: " + (e.message || e)); }
    setOcupado(false);
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(orient.texto); setMsg("Texto copiado."); }
    catch (e) { setMsg("Não copiou automaticamente: selecione o texto e use Ctrl+C."); }
  }

  const painelOrient = orient && (
    <div className="panel" style={{ borderColor: "var(--amber)", borderWidth: 2, marginBottom: 12 }}>
      <div className="panel-body">
        <b>Orientação de {orient.aluno.nome} · Etapa {orient.etapa.n}</b> Vai para o Suporte dele como mensagem. Você pode editar o texto antes.
        <textarea style={{ width: "100%", minHeight: 200, marginTop: 8 }} value={orient.texto} onChange={(e) => setOrient({ ...orient, texto: e.target.value })} />
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn" disabled={ocupado || !orient.texto.trim()} onClick={enviar}>{ocupado ? "Enviando…" : "Enviar pelo Suporte"}</button>
          <button className="btn secondary" onClick={copiar}>Copiar texto</button>
          <button className="btn secondary" onClick={() => setOrient(null)}>Cancelar</button>
        </div>
      </div>
    </div>
  );
  const aviso = msg && <div className="balance-check ok" style={{ marginBottom: 12 }}>{msg}</div>;

  if (aba === "geral") {
    const dados = ordem.map((a) => ({ a, por: Object.fromEntries(ETAPAS.map((e) => { const l = linhaDe(a, e); return [e.id, l.final !== null ? { v: l.final, fim: true } : { v: l.parcial, fim: false }]; })) }));
    const medias = dados.map((d) => { const v = ETAPAS.map((e) => d.por[e.id].v).filter((x) => x !== null && x !== undefined); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; });
    const mt = medias.filter((x) => x !== null);
    const fechadas = ETAPAS.filter((e) => situacaoPrazo(e.id, rotCfg || null).fechada).length;
    return (
      <>
        <div className="screen-eyebrow">dashboard do ciclo</div>
        <h2 className="screen-title">Visão geral por etapa — {turma.nome}</h2>
        <p className="screen-sub">Nota de cada aluno em cada etapa. Em <i>itálico</i> é nota parcial (etapa aberta ou ainda sem a sua avaliação); em negrito é a nota avaliada por você. A média usa só as etapas que já têm nota.</p>
        {aviso}
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-v">{fechadas} de {ETAPAS.length}</div><div className="kpi-l">etapas com prazo vencido</div></div>
          <div className="kpi"><div className="kpi-v">{mt.length ? fmtNota(mt.reduce((s, x) => s + x, 0) / mt.length) : "—"}</div><div className="kpi-l">média parcial da turma</div></div>
          <div className="kpi"><div className="kpi-v">{medias.filter((x) => x !== null && x < 5).length}</div><div className="kpi-l">alunos com média abaixo de 5,0</div></div>
        </div>
        <div className="panel"><div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
          <table>
            <thead><tr><th>Aluno</th>{ETAPAS.map((e) => <th key={e.id} className="num" title={ROTULOS[e.id]}>E{e.n}</th>)}<th className="num">Média parcial</th></tr></thead>
            <tbody>{dados.map((d, i) => (
              <tr key={d.a.matricula}>
                <td><button className="btn secondary" style={{ padding: "2px 8px" }} onClick={() => onSelecionarAluno && onSelecionarAluno(d.a)}>{d.a.nome}</button></td>
                {ETAPAS.map((e) => <td key={e.id} className="num mono" style={{ fontWeight: d.por[e.id].fim ? 700 : 400, fontStyle: d.por[e.id].fim ? "normal" : "italic" }}>{dec(d.por[e.id].v)}</td>)}
                <td className="num mono"><b>{dec(medias[i] === null ? null : Math.round(medias[i] * 10) / 10)}</b></td>
              </tr>))}</tbody>
          </table>
        </div></div>
      </>
    );
  }

  const grupo = GRUPOS_ETAPAS.find((g) => g.id === aba);
  const renderEtapa = (etapa) => {
  const sp = situacaoPrazo(etapa.id, rotCfg || null);
  const fechada = sp.fechada;
  const linhas = ordem.map((a) => linhaDe(a, etapa));
  const auto = etapa.criterios.filter((c) => c.tipo === "auto");
  const iniciaram = linhas.filter((l) => l.parcial !== null && l.parcial > 0).length;
  const avaliados = linhas.filter((l) => l.final !== null).length;
  const valores = linhas.map((l) => (l.final !== null ? l.final : l.parcial)).filter((x) => x !== null);
  const media = valores.length ? valores.reduce((s, x) => s + x, 0) / valores.length : null;
  const prazoTxt = prazos[etapa.id] ? new Date(prazos[etapa.id] + "T12:00:00").toLocaleDateString("pt-BR") : "sem prazo definido";

  return (
    <>
      <div className="screen-eyebrow">dashboard do ciclo</div>
      <h2 className="screen-title">Etapa {etapa.n} · {etapa.titulo}</h2>
      <p className="screen-sub">
        <span className={"tag-pill " + (fechada ? "" : "ok")}>{fechada ? "fechada em " + prazoTxt : "aberta · prazo " + prazoTxt}</span>{" "}
        {fechada ? "A nota é final depois da sua avaliação; enquanto isso, é a nota parcial com o que o sistema já confere." : "A nota é parcial até o fechamento da etapa."} Turma: {turma.nome}.
      </p>
      <div className="kpi-row">
        <div className="kpi"><div className="kpi-v">{iniciaram} de {linhas.length}</div><div className="kpi-l">alunos que iniciaram</div></div>
        <div className="kpi"><div className="kpi-v">{avaliados} de {linhas.length}</div><div className="kpi-l">já avaliados por você</div></div>
        <div className="kpi"><div className="kpi-v">{media === null ? "—" : fmtNota(media)}</div><div className="kpi-l">média {avaliados === linhas.length && avaliados > 0 ? "final" : "parcial"} da turma</div></div>
        <div className="kpi"><div className="kpi-v">{linhas.length - iniciaram}</div><div className="kpi-l">ainda sem nada conferido</div></div>
      </div>
      <div className="panel"><div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Aluno</th>{auto.map((c) => <th key={c.key} className="num" title={c.nome}>{c.nome.split(" (")[0].slice(0, 22)}</th>)}<th className="num">{fechada || avaliados ? "Nota" : "Nota parcial"}</th><th>Situação</th><th></th></tr></thead>
          <tbody>{linhas.map((l) => {
            const sit = l.final !== null ? ["avaliado", "ok"] : !l.parcial ? ["não iniciou", "bad"] : fechada ? ["aguarda sua avaliação", "warn"] : ["em andamento", "warn"];
            const pend = auto.some((c) => l.sug[c.key] === null || l.sug[c.key] === undefined || l.sug[c.key] < NOTA_OK);
            return (
              <tr key={l.a.matricula}>
                <td><button className="btn secondary" style={{ padding: "2px 8px" }} onClick={() => onSelecionarAluno && onSelecionarAluno(l.a)}>{l.a.nome}</button></td>
                {auto.map((c) => <td key={c.key} className="num mono">{dec(l.sug[c.key])}</td>)}
                <td className="num mono" style={{ fontWeight: l.final !== null ? 700 : 400, fontStyle: l.final !== null ? "normal" : "italic" }}>{dec(l.final !== null ? l.final : l.parcial)}</td>
                <td><span className={"tag-pill " + sit[1]}>{sit[0]}</span></td>
                <td><button className={"btn " + (pend ? "" : "secondary")} style={{ padding: "2px 10px", fontSize: 12.5 }} onClick={() => abrirOrient(l.a, etapa, l, fechada)}>{pend ? "Orientação" : "Ver orientação"}</button></td>
              </tr>);
          })}</tbody>
        </table>
      </div></div>
      <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 8 }}>
        As colunas mostram a nota sugerida pelo sistema em cada critério automático (0 a 10). A parte que depende de você (pareceres) entra na nota quando você avalia em Avaliação das etapas.
        “Orientação” gera o texto para o aluno com o que ajustar e onde; você edita e envia pelo Suporte.
      </div>
    </>
  );
  };
  return <>{aviso}{painelOrient}{grupo.etapas.map((id) => <div key={id}>{renderEtapa(ETAPAS.find((e) => e.id === id))}</div>)}</>;
}
