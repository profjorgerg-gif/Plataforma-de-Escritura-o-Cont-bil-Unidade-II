import { useState } from "react";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../../firebase.js";
import { ETAPAS, RESERVA_TEXTO } from "../../lib/avaliacao.js";
import { etapasEfetivas, situacaoEtapa } from "../../lib/roteiro.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useCaTurma, salvarConfigCa } from "../../hooks/useCa.js";
import { useRoteiroTurma, salvarRoteiroConfig, useRoteiroDosAlunos, salvarEstadoEtapa } from "../../hooks/useRoteiro.js";
import { Abas } from "../shared/AgbUI.jsx";

const classe = (c) => (c === "ok" ? "ok" : c === "bad" ? "bad" : c === "warn" ? "warn" : c === "info" ? "ok" : "");
const ROT = { aprovada: "aprov.", ajustar: "ajustar", entregue: "entregue", liberada: "liberada", bloqueada: "bloq." };

function EtapasEPrazos({ turma, config }) {
  const lista = etapasEfetivas(config);
  const todas = ETAPAS.map((e) => lista.find((x) => x.id === e.id) || { ...e, prazo: "", ativa: false });
  const [edit, setEdit] = useState(() => Object.fromEntries(todas.map((e) => [e.id, { prazo: e.prazo || "", descricao: e.descricao, entrega: e.entrega, ativa: e.ativa !== false }])));
  const [msg, setMsg] = useState("");
  const up = (id, k, v) => setEdit({ ...edit, [id]: { ...edit[id], [k]: v } });
  async function salvar() {
    setMsg("salvando…");
    try { await salvarRoteiroConfig(turma.id, { etapas: ETAPAS.map((e) => ({ id: e.id, ...edit[e.id] })) }); setMsg("✓ salvo — os alunos já veem os prazos"); }
    catch (e) { setMsg("✗ não salvou: " + (e.message || e.code)); }
  }
  return (
    <div className="panel">
      <div className="panel-head"><h3>Etapas e prazos da turma</h3></div>
      <div className="panel-body">
        <p style={{ marginTop: 0, color: "var(--ink-soft)", fontSize: 13.5 }}>Preencha o prazo de cada etapa e, se quiser, ajuste o texto. Etapas desmarcadas não aparecem para os alunos. Os prazos já vêm preenchidos pelo plano de 8 semanas; altere quando precisar. {RESERVA_TEXTO} Enquanto você não salvar aqui, os alunos <b>não veem</b> o roteiro por etapas.</p>
        {ETAPAS.map((e, i) => (
          <div key={e.id} style={{ borderBottom: "1px solid var(--line)", padding: "8px 0" }}>
            <label style={{ fontWeight: 700 }}><input type="checkbox" checked={edit[e.id].ativa} onChange={(ev) => up(e.id, "ativa", ev.target.checked)} /> Etapa {i + 1} · {e.titulo} <span style={{ fontWeight: 400, color: "var(--ink-soft)", fontSize: 12.5 }}>({e.aulas} aulas previstas)</span></label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <div className="field" style={{ margin: 0 }}><label>Prazo</label><input type="date" value={edit[e.id].prazo} onChange={(ev) => up(e.id, "prazo", ev.target.value)} /></div>
              <div className="field" style={{ margin: 0, flex: 1, minWidth: 220 }}><label>O que fazer</label><input value={edit[e.id].descricao} onChange={(ev) => up(e.id, "descricao", ev.target.value)} /></div>
              <div className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}><label>O que entregar</label><input value={edit[e.id].entrega} onChange={(ev) => up(e.id, "entrega", ev.target.value)} /></div>
            </div>
          </div>
        ))}
        <div className="btn-row" style={{ marginTop: 12 }}><button className="btn green" onClick={salvar}>Salvar etapas e prazos</button>{msg && <span style={{ alignSelf: "center", fontSize: 13 }}>{msg}</span>}</div>
      </div>
    </div>
  );
}

function Situacao({ turma, config }) {
  const alunos = useAlunosDaTurma(turma.id);
  const { mapa, recarregar } = useRoteiroDosAlunos(turma.id, alunos);
  const [sel, setSel] = useState(null);
  const [retorno, setRetorno] = useState("");
  const [msg, setMsg] = useState("");
  const [bulk, setBulk] = useState("");
  if (!alunos || !mapa) return <div className="empty-state">Carregando…</div>;
  const lista = etapasEfetivas(config);
  const ordem = alunos.filter((a) => !a.contaTeste).concat(alunos.filter((a) => a.contaTeste));

  async function agir(a, i, acao) {
    setMsg("salvando…");
    try {
      const e = lista[i];
      if (acao === "liberar") await salvarEstadoEtapa(turma.id, a.matricula, e.id, { status: "liberada" });
      if (acao === "aprovar") {
        await salvarEstadoEtapa(turma.id, a.matricula, e.id, { status: "aprovada", retorno });
        if (lista[i + 1]) await salvarEstadoEtapa(turma.id, a.matricula, lista[i + 1].id, { status: "liberada" });
      }
      if (acao === "ajustar") await salvarEstadoEtapa(turma.id, a.matricula, e.id, { status: "ajustar", retorno });
      setMsg("✓ salvo"); setRetorno(""); recarregar();
    } catch (er) { setMsg("✗ não salvou: " + (er.message || er.code)); }
  }
  async function liberarParaTodos() {
    if (!bulk) return;
    setMsg("liberando…");
    try {
      const b = writeBatch(db);
      ordem.forEach((a) => {
        b.set(doc(db, "turmas", turma.id, "alunos", a.matricula, "roteiro", "estado"), { etapas: { [bulk]: { status: "liberada", em: new Date().toISOString() } } }, { merge: true });
      });
      await b.commit(); setMsg("✓ etapa liberada para " + ordem.length + " contas"); recarregar();
    } catch (er) { setMsg("✗ não salvou: " + (er.message || er.code)); }
  }

  if (sel) {
    const r = mapa[sel.matricula] || { estado: {}, entregas: {} };
    return (
      <>
        <button className="btn secondary" onClick={() => { setSel(null); setMsg(""); }}>← Voltar à lista</button>
        <h3 style={{ margin: "14px 0 8px" }}>{sel.nome || sel.matricula}</h3>
        <div className="field"><label>Retorno para o aluno (vale para a próxima ação: aprovar ou pedir ajuste)</label><textarea rows={3} value={retorno} onChange={(e) => setRetorno(e.target.value)} /></div>
        {msg && <div style={{ marginBottom: 8, fontSize: 13 }}>{msg}</div>}
        {lista.map((e, i) => {
          const s = situacaoEtapa(lista, i, r.estado, r.entregas);
          return (
            <div className="panel" key={e.id}>
              <div className="panel-head"><h3>Etapa {i + 1} · {e.titulo}</h3><span className={"tag-pill " + classe(s.classe)}>{s.rotulo}</span></div>
              <div className="panel-body">
                {r.entregas[e.id] && <div style={{ fontSize: 13, marginBottom: 6 }}>Entregue em {new Date(r.entregas[e.id]).toLocaleString("pt-BR")}.</div>}
                {s.reg.retorno && <div style={{ fontSize: 13, marginBottom: 6 }}>Último retorno: {s.reg.retorno}</div>}
                <div className="btn-row">
                  {s.cod === "bloqueada" && <button className="btn secondary" onClick={() => agir(sel, i, "liberar")}>Liberar esta etapa</button>}
                  {(s.cod === "liberada" || s.cod === "entregue" || s.cod === "ajustar") && <>
                    <button className="btn green" onClick={() => agir(sel, i, "aprovar")}>Aprovar{lista[i + 1] ? " e liberar a próxima" : ""}</button>
                    <button className="btn secondary" onClick={() => agir(sel, i, "ajustar")}>Pedir ajuste</button>
                  </>}
                  {s.cod === "aprovada" && <button className="btn secondary" onClick={() => agir(sel, i, "liberar")}>Reabrir</button>}
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head"><h3>Situação da turma — {turma.nome}</h3><button className="btn secondary" onClick={recarregar}>Atualizar</button></div>
        <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
          <table>
            <thead><tr><th>Aluno</th>{lista.map((e, i) => <th key={e.id} title={e.titulo}>E{i + 1}</th>)}<th></th></tr></thead>
            <tbody>
              {ordem.map((a) => {
                const r = mapa[a.matricula] || { estado: {}, entregas: {} };
                return (
                  <tr key={a.matricula}>
                    <td>{a.nome || a.matricula}{a.contaTeste ? " (teste)" : ""}</td>
                    {lista.map((e, i) => { const s = situacaoEtapa(lista, i, r.estado, r.entregas); return <td key={e.id}><span className={"tag-pill " + classe(s.classe)}>{ROT[s.cod]}</span></td>; })}
                    <td><button className="btn secondary" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => { setSel(a); setRetorno(""); setMsg(""); }}>Abrir</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel"><div className="panel-body">
        <b>Liberar uma etapa para todos de uma vez</b>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          <select value={bulk} onChange={(e) => setBulk(e.target.value)}><option value="">— escolha a etapa —</option>{lista.map((e, i) => <option key={e.id} value={e.id}>Etapa {i + 1} · {e.titulo}</option>)}</select>
          <button className="btn secondary" onClick={liberarParaTodos}>Liberar para todos</button>
          {msg && <span style={{ alignSelf: "center", fontSize: 13 }}>{msg}</span>}
        </div>
      </div></div>
    </>
  );
}

// 2026-10-17 — O professor escolhe, para cada empregado, o que entra nos proventos (adicional, horas extras) e se tem faltas.
// Valores (salário, horas, dias), dependentes e vale-transporte continuam automáticos por aluno; INSS e IRRF o aluno calcula.
// Grava em config.fpProventos[empId] (mesmo documento ca/config). "Automático" = como antes.
const OPC_AD = [["auto", "Automático"], ["nenhum", "Nenhum"], ["AI10", "Insalubridade 10%"], ["AI20", "Insalubridade 20%"], ["AI40", "Insalubridade 40%"], ["AP", "Periculosidade 30%"]];
const OPC_SN = [["auto", "Auto"], ["sim", "Sim"], ["nao", "Não"]];
const CAMPOS_PROV = [["he50", "HE 50%"], ["he100", "HE 100%"], ["hen50", "HE not. 50%"], ["hen100", "HE not. 100%"], ["faltas", "Faltas injust."]];
function ProventosPorEmpregado({ turma, empregados, cfg }) {
  const [edit, setEdit] = useState({});
  const [msg, setMsg] = useState("");
  if (!empregados.length) return null;
  const salvo = cfg.fpProventos || {};
  const val = (id, k) => (edit[id] && edit[id][k]) || (salvo[id] && salvo[id][k]) || "auto";
  const mudar = (id, k, v) => setEdit((e) => ({ ...e, [id]: { ...(e[id] || {}), [k]: v } }));
  const todos = (k, v) => setEdit((e) => { const n = { ...e }; empregados.forEach((emp) => { n[emp.id] = { ...(n[emp.id] || {}), [k]: v }; }); return n; });
  async function salvar() {
    setMsg("salvando…");
    try {
      const mapa = {};
      empregados.forEach((emp) => { mapa[emp.id] = { ad: val(emp.id, "ad"), he50: val(emp.id, "he50"), he100: val(emp.id, "he100"), hen50: val(emp.id, "hen50"), hen100: val(emp.id, "hen100"), faltas: val(emp.id, "faltas") }; });
      await salvarConfigCa(turma.id, { fpProventos: mapa, atualizadoEm: new Date().toISOString() });
      setEdit({});
      setMsg("✓ escolhas salvas");
    } catch (e) { setMsg("✗ " + (e.message || e.code)); }
  }
  const sel = { padding: "3px 5px", font: "inherit", fontSize: 13 };
  return (
    <div className="panel"><div className="panel-head"><h3>Proventos e faltas por empregado</h3></div><div className="panel-body">
      <p style={{ marginTop: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>Escolha, para cada empregado, o que entra nos proventos e se tem faltas injustificadas. O aluno calcula a remuneração, o INSS e o IRRF. Salário, quantidade de horas, dias de falta, dependentes e vale-transporte continuam automáticos por aluno. <b>Automático</b> = como antes.</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 720 }}>
          <thead><tr><th>Empregado</th><th>Adicional</th>{CAMPOS_PROV.map(([k, t]) => <th key={k}>{t}</th>)}</tr></thead>
          <tbody>
            {empregados.map((emp) => (
              <tr key={emp.id}>
                <td><b>{emp.nome}</b></td>
                <td><select style={sel} value={val(emp.id, "ad")} onChange={(e) => mudar(emp.id, "ad", e.target.value)} aria-label={"Adicional de " + emp.nome}>{OPC_AD.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></td>
                {CAMPOS_PROV.map(([k, t]) => (
                  <td key={k}><select style={sel} value={val(emp.id, k)} onChange={(e) => mudar(emp.id, k, e.target.value)} aria-label={t + " de " + emp.nome}>{OPC_SN.map(([v, tt]) => <option key={v} value={v}>{tt}</option>)}</select></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 6px" }}>
        <button type="button" className="btn secondary" onClick={() => { todos("he50", "sim"); todos("he100", "sim"); }}>HE 50% e 100% = Sim para todos</button>
        <button type="button" className="btn secondary" onClick={() => CAMPOS_PROV.forEach(([k]) => todos(k, "auto"))}>Tudo em Automático</button>
        <button type="button" className="btn green" onClick={salvar}>Salvar escolhas</button>
        {msg && <span style={{ fontSize: 13, alignSelf: "center" }}>{msg}</span>}
      </div>
      <p style={{ fontSize: 13, color: "var(--amber, #8a5a00)", margin: 0 }}>Faça as escolhas antes de liberar a etapa 2. Quem já digitou um campo mantém o que digitou; só os campos ainda não digitados seguem a nova escolha. O enunciado, a conferência e o Caderno da Folha usam a mesma regra.</p>
    </div></div>
  );
}

function AtividadeFolha({ turma }) {
  const alunos = useAlunosDaTurma(turma.id);
  const ca = useCaTurma(turma.id);
  const [sug, setSug] = useState(null);
  const [msg, setMsg] = useState("");
  if (!alunos || ca.config === undefined) return <div className="empty-state">Carregando…</div>;
  const cfg = ca.config || {};
  const atuais = cfg.empregados || [];
  const sugestao = sug ?? (cfg.fpSugestao || "");

  async function publicar() {
    setMsg("publicando…");
    try {
      const reais = alunos.filter((a) => !a.contaTeste && (a.nome || "").trim()).sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
      let prox = atuais.reduce((m, e) => Math.max(m, Number(String(e.id).slice(1)) || 0), 0);
      const lista = reais.map((a) => { const j = atuais.find((e) => e.nome === a.nome); return { id: j ? j.id : "e" + (++prox), nome: a.nome }; });
      await salvarConfigCa(turma.id, { empregados: lista, atualizadoEm: new Date().toISOString() });
      setMsg("✓ lista publicada com " + lista.length + " empregados (os mesmos nomes mantêm o mesmo código)");
    } catch (e) { setMsg("✗ " + (e.message || e.code)); }
  }
  async function salvarCfg() {
    setMsg("salvando…");
    try { await salvarConfigCa(turma.id, { fpSugestao: sugestao.trim(), atualizadoEm: new Date().toISOString() }); setMsg("✓ salvo"); }
    catch (e) { setMsg("✗ " + (e.message || e.code)); }
  }
  async function alternarObrig() {
    setMsg("salvando…");
    try { await salvarConfigCa(turma.id, { fpObrigatoria: !cfg.fpObrigatoria, atualizadoEm: new Date().toISOString() }); setMsg("✓ salvo"); }
    catch (e) { setMsg("✗ " + (e.message || e.code)); }
  }
  return (
    <>
      <div className="panel"><div className="panel-head"><h3>Lista de empregados (os nomes dos alunos da turma)</h3></div><div className="panel-body">
        <p style={{ marginTop: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>Só os <b>nomes</b> vão para a atividade (sem matrícula). Republique quando entrar ou sair aluno. A conta de teste não entra na lista.</p>
        <div style={{ marginBottom: 8 }}><b>{atuais.length}</b> empregados publicados.</div>
        <button className="btn green" onClick={publicar}>Publicar lista a partir dos alunos da turma</button>
      </div></div>
      <ProventosPorEmpregado turma={turma} empregados={atuais} cfg={cfg} />
      <div className="panel"><div className="panel-head"><h3>Ajustes da atividade</h3></div><div className="panel-body">
        <div className="helper-note" style={{ marginBottom: 10 }}><b>Mínimo automático:</b> cada aluno faz um contracheque por empregado da lista ({atuais.length || "nº de alunos da turma"}). Os dados de cada empregado já vêm preenchidos para o aluno.</div>
        <div className="field"><label>Sugestão para os alunos (opcional)</label><textarea rows={3} value={sugestao} onChange={(e) => setSug(e.target.value)} placeholder="Ex.: faça o seu contracheque e mais dois colegas, com casos diferentes." /></div>
        <button className="btn green" onClick={salvarCfg}>Salvar ajustes</button>
        <hr style={{ margin: "14px 0" }} />
        <b>Travar as demais telas da folha até a atividade ser aprovada</b>
        <p style={{ margin: "4px 0 8px", fontSize: 13, color: "var(--ink-soft)" }}>Desligado: nada muda para quem já está usando. Ligado: Folha do mês, Provisões, Contabilização, Efeitos e Parecer só abrem para o aluno depois que você aprovar a etapa "Atividade · Elaborar a folha" no roteiro dele.</p>
        <span className={"tag-pill " + (cfg.fpObrigatoria ? "warn" : "ok")}>{cfg.fpObrigatoria ? "Travadas até a aprovação" : "Sem trava"}</span>{" "}
        <button className="btn secondary" onClick={alternarObrig}>{cfg.fpObrigatoria ? "Desligar a trava" : "Ligar a trava"}</button>
        {msg && <div style={{ marginTop: 8, fontSize: 13 }}>{msg}</div>}
      </div></div>
    </>
  );
}

// somente: "sit" | "cfg" | "folha" mostra só aquele conteúdo, sem o cabeçalho e sem a barra de abas
// (usado quando a tela fica dentro de um item do menu que já tem as suas próprias abas).
export default function RoteiroProfessor({ turma, abaInicial, somente }) {
  const [aba, setAba] = useState(somente || abaInicial || "sit");
  const config = useRoteiroTurma(turma ? turma.id : null);
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (somente) {
    return config === undefined ? <div className="empty-state">Carregando…</div>
      : somente === "sit" ? <Situacao key={JSON.stringify(config)} turma={turma} config={config} />
      : somente === "cfg" ? <EtapasEPrazos key={JSON.stringify(config)} turma={turma} config={config} />
      : <AtividadeFolha turma={turma} />;
  }
  return (
    <>
      <div className="screen-eyebrow">projeto interdisciplinar</div>
      <h2 className="screen-title">Roteiro por etapas (professor)</h2>
      <p className="screen-sub">Defina os prazos, acompanhe cada aluno e libere a próxima etapa depois de analisar a anterior.</p>
      <Abas abas={[{ key: "sit", label: "Situação dos alunos" }, { key: "cfg", label: "Etapas e prazos" }, { key: "folha", label: "Atividade da folha" }]} ativa={aba} onChange={setAba} />
      {config === undefined ? <div className="empty-state">Carregando…</div>
        : aba === "sit" ? <Situacao key={JSON.stringify(config)} turma={turma} config={config} />
        : aba === "cfg" ? <EtapasEPrazos key={JSON.stringify(config)} turma={turma} config={config} />
        : <AtividadeFolha turma={turma} />}
    </>
  );
}
