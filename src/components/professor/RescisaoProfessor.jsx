import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { fmt } from "../../lib/contabil.js";
import { naturezaDe, destinoDe } from "../../data/planoContasOficial.js";
import { CONTAS_NOVAS_RESC, CONTAS_RESC, MODALIDADES, CASO_PADRAO, calcularRescisao, nomeModalidade, fmtData, parseData } from "../../lib/rescisao.js";
import { lerNumero } from "../../lib/agb.js";
import { useCaTurma, salvarConfigCa, useTrabalhosCaDaTurma } from "../../hooks/useCa.js";
import { useRescisaoTurma, salvarCasoRescisao } from "../../hooks/useRescisao.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { Abas } from "../shared/AgbUI.jsx";

function Liberacao({ turma, ca }) {
  const { contas, deFallback } = usePlanoContas();
  const [msg, setMsg] = useState("");
  if (ca.config === undefined || !contas) return <div className="empty-state">Carregando…</div>;
  const liberada = !!(ca.config && ca.config.rescisaoLiberada);
  const faltam = CONTAS_NOVAS_RESC.filter((c) => !contas.some((x) => x.codigo === c.codigo));
  const usadas = Object.values(CONTAS_RESC);
  const semConta = usadas.filter((c) => !contas.some((x) => x.codigo === c) && !CONTAS_NOVAS_RESC.some((n) => n.codigo === c));

  async function alternar() {
    setMsg("salvando…");
    try { await salvarConfigCa(turma.id, { rescisaoLiberada: !liberada, atualizadoEm: new Date().toISOString() }); setMsg(""); }
    catch (e) { setMsg("✗ " + (e.message || e.code)); }
  }
  async function criarContas() {
    setMsg("criando…");
    try {
      for (const c of faltam) await setDoc(doc(db, "planoContas", c.codigo), { nome: c.nome, grupo: c.grupo, subgrupo: c.subgrupo, natureza: naturezaDe(c.grupo, false), destino: destinoDe(c.grupo) });
      setMsg("✓ contas criadas");
    } catch (e) { setMsg("✗ não criou: " + (e.message || e.code)); }
  }
  return (
    <>
      <div className="panel">
        <div className="panel-head"><h3>Liberação da Rescisão para os alunos</h3></div>
        <div className="panel-body">
          <p style={{ marginTop: 0 }}>Enquanto não estiver liberada, os alunos <b>não veem</b> o menu da rescisão. Você (e a conta de teste) sempre veem. Teste primeiro na conta de teste.</p>
          <span className={"tag-pill " + (liberada ? "ok" : "warn")}>{liberada ? "Liberada aos alunos" : "Ainda não liberada"}</span>{" "}
          <button className="btn secondary" onClick={alternar}>{liberada ? "Ocultar dos alunos" : "Liberar aos alunos"}</button>
          {msg && <span style={{ marginLeft: 8, fontSize: 13 }}>{msg}</span>}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Contas novas necessárias no Plano de contas</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Código</th><th>Conta</th><th>Situação</th></tr></thead>
            <tbody>{CONTAS_NOVAS_RESC.map((c) => {
              const tem = contas.some((x) => x.codigo === c.codigo);
              return <tr key={c.codigo}><td className="mono">{c.codigo}</td><td>{c.nome}</td><td><span className={"tag-pill " + (tem ? "ok" : "warn")}>{tem ? "já existe" : "falta criar"}</span></td></tr>;
            })}</tbody>
          </table>
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line-strong)" }}>
            {faltam.length === 0 ? <span style={{ fontSize: 13 }}>Todas as contas novas já existem.</span>
              : deFallback ? <span style={{ fontSize: 13 }}>O plano está usando a lista embutida no sistema, que já inclui estas contas. Nada a criar.</span>
              : <><button className="btn green" onClick={criarContas}>Criar as {faltam.length} contas que faltam</button> <span style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>só acrescenta; nenhuma conta existente é alterada</span></>}
            {semConta.length > 0 && <div style={{ marginTop: 8, fontSize: 13, color: "var(--red)" }}>Atenção: estas contas usadas no gabarito não existem no plano: {semConta.join(", ")}. Confira antes de liberar.</div>}
          </div>
        </div>
      </div>
    </>
  );
}

function EditorCaso({ turma, resc }) {
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (resc.caso === undefined || f) return;
    const c = { ...CASO_PADRAO, ...(resc.caso || {}) };
    setF({ nome: c.nome, admissao: c.admissao, desligamento: c.desligamento, modalidade: c.modalidade, salario: String(c.salario), periodosVencidos: String(c.periodosVencidos), saldoFgts: String(c.saldoFgts), provFerias: String(c.provFerias), prov13: String(c.prov13) });
  }, [resc.caso, f]);
  if (!f) return <div className="empty-state">Carregando…</div>;
  const set = (k, v) => setF({ ...f, [k]: v });
  const num = (v) => lerNumero(v) || 0;
  const montar = () => ({ nome: f.nome.trim(), admissao: f.admissao, desligamento: f.desligamento, modalidade: f.modalidade, salario: num(f.salario), periodosVencidos: num(f.periodosVencidos) > 0 ? 1 : 0, saldoFgts: num(f.saldoFgts), provFerias: num(f.provFerias), prov13: num(f.prov13) });
  const datasOk = parseData(f.admissao) && parseData(f.desligamento) && f.desligamento > f.admissao;
  const r = datasOk ? calcularRescisao(montar()) : null;
  async function salvar() {
    if (!datasOk) { setMsg("✗ confira as datas (admissão antes do desligamento)"); return; }
    setMsg("salvando…");
    try { await salvarCasoRescisao(turma.id, { ...montar(), atualizadoEm: new Date().toISOString() }); setMsg("✓ salvo às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })); }
    catch (e) { setMsg("✗ não salvou: " + (e.message || e.code)); }
  }
  const campo = (rot, k, extra) => <div className="field"><label>{rot}</label><input value={f[k]} onChange={(e) => set(k, e.target.value)} {...extra} /></div>;
  return (
    <div className="panel">
      <div className="panel-head"><h3>Caso da rescisão</h3></div>
      <div className="panel-body">
        <p style={{ marginTop: 0, color: "var(--ink-soft)", fontSize: 13.5 }}>Todos os alunos resolvem o mesmo caso. Já vem preenchido com um exemplo fictício. Se mudar o caso depois de os alunos começarem, as respostas deles passam a ser conferidas com o novo gabarito.</p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {campo("Empregado (fictício)", "nome", { style: { width: 240 } })}
          {campo("Admissão", "admissao", { type: "date" })}
          {campo("Desligamento (último dia trabalhado)", "desligamento", { type: "date" })}
          <div className="field"><label>Modalidade</label><select value={f.modalidade} onChange={(e) => set("modalidade", e.target.value)}>{MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
          {campo("Salário (R$)", "salario", { className: "mono", inputMode: "decimal", style: { width: 110 } })}
          {campo("Período de férias vencido (0 ou 1)", "periodosVencidos", { className: "mono", style: { width: 70 } })}
          {campo("Saldo do FGTS antes da rescisão (R$)", "saldoFgts", { className: "mono", inputMode: "decimal", style: { width: 120 } })}
          {campo("Provisão acumulada de férias + 1/3 (R$)", "provFerias", { className: "mono", inputMode: "decimal", style: { width: 120 } })}
          {campo("Provisão acumulada de 13º (R$)", "prov13", { className: "mono", inputMode: "decimal", style: { width: 120 } })}
        </div>
        {r && (
          <div className="balance-check ok" style={{ margin: "12px 0" }}>
            Gabarito calculado: {nomeModalidade(f.modalidade)} · aviso {r.avisoDias} dias (projeção de {r.projDias} até {fmtData(r.dataProjetada)}) · férias {r.avF}/12 · 13º {r.av13}/12 ·
            verbas brutas R$ {fmt(r.bruto)} · FGTS 8% R$ {fmt(r.fgts8)} · multa ({r.percMulta}%) R$ {fmt(r.multa)} · encargos patronais R$ {fmt(r.encargosPatronais)}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 10 }}>
          Critérios do gabarito: aviso de 30 dias + 3 por ano completo (máx. 90); projeção do aviso indenizado conta para férias e 13º (na dispensa sem justa causa o aviso inteiro; no acordo, aviso pela metade conforme o art. 484-A e projeção também pela metade, que é critério de cálculo adotado neste exercício e não regra literal da CLT); mês com 15 dias ou mais conta como mês inteiro; férias e 1/3 indenizados fora da base do FGTS e do INSS; INSS e IRRF do empregado não são calculados. Confira com a legislação vigente.
        </div>
        <button className="btn green" onClick={salvar}>Salvar caso</button> {msg && <span style={{ marginLeft: 8, fontSize: 13 }}>{msg}</span>}
      </div>
    </div>
  );
}

function Trabalhos({ turma }) {
  const alunos = useAlunosDaTurma(turma.id);
  const { mapa, recarregar } = useTrabalhosCaDaTurma(turma.id, alunos);
  const [sel, setSel] = useState(null);
  const [devol, setDevol] = useState("");
  const [msg, setMsg] = useState("");
  if (!alunos || !mapa) return <div className="empty-state">Carregando trabalhos…</div>;
  const conta = (o) => Object.values(o || {}).filter((v) => String(v).trim() !== "").length;
  async function salvarDevolutiva() {
    setMsg("salvando…");
    try {
      await setDoc(doc(db, "turmas", turma.id, "alunos", sel.matricula, "ca", "trabalho"), { devolutivaResc: devol, devolutivaRescEm: new Date().toISOString() }, { merge: true });
      setMsg("✓ retorno salvo — o aluno já pode ler"); recarregar();
    } catch (e) { setMsg("✗ não salvou: " + (e.message || e.code)); }
  }
  if (sel) {
    const w = mapa[sel.matricula] || {};
    const bloco = (titulo, obj) => {
      const ks = Object.keys(obj || {}).filter((k) => String(obj[k]).trim() !== "" && !["enviado", "enviadoEm"].includes(k));
      return <div className="panel"><div className="panel-head"><h3>{titulo}</h3></div><div className="panel-body">
        {ks.length === 0 ? <span style={{ color: "var(--ink-faint)" }}>nada preenchido</span> : ks.map((k) => <div key={k} style={{ marginBottom: 10 }}><div className="mono" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{k}</div><div style={{ whiteSpace: "pre-wrap" }}>{obj[k]}</div></div>)}
      </div></div>;
    };
    return (
      <>
        <button className="btn secondary" onClick={() => { setSel(null); setMsg(""); }}>← Voltar à lista</button>
        <h3 style={{ margin: "14px 0 4px" }}>{sel.nome || sel.matricula}</h3>
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 12 }}>Parecer: {w.rparecer && w.rparecer.enviado ? "enviado" : "não enviado"} · última gravação {w.atualizadoEm ? new Date(w.atualizadoEm).toLocaleString("pt-BR") : "—"} · campos preenchidos: caso {conta(w.rcaso)}, cálculo {conta(w.rcalc)}, incidências {conta(w.rinc)}, documentos {conta(w.rdoc)}</div>
        {bloco("Parecer da rescisão", w.rparecer)}
        {bloco("Desafio profissional (cálculo)", { desafio: (w.rcalc || {}).desafio })}
        {bloco("Cálculo digitado pelo aluno", Object.fromEntries(Object.entries(w.rcalc || {}).filter(([k]) => k !== "desafio")))}
        <div className="panel"><div className="panel-head"><h3>Seu retorno ao aluno</h3></div><div className="panel-body">
          {!mapa[sel.matricula] ? <span style={{ color: "var(--ink-faint)" }}>O aluno ainda não começou; só dá para responder depois que ele salvar algo.</span> : (
            <><div className="field"><textarea rows={4} value={devol} onChange={(e) => setDevol(e.target.value)} placeholder="Comentário que o aluno verá na tela de conferência final" /></div>
              <button className="btn green" onClick={salvarDevolutiva}>Salvar retorno</button> {msg && <span style={{ marginLeft: 8, fontSize: 13 }}>{msg}</span>}</>
          )}
        </div></div>
      </>
    );
  }
  return (
    <div className="panel">
      <div className="panel-head"><h3>Trabalhos da Rescisão — {turma.nome}</h3><button className="btn secondary" onClick={recarregar}>Atualizar</button></div>
      <div className="panel-body" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Matrícula</th><th>Aluno</th><th className="num">Cálculo</th><th className="num">Incidências</th><th className="num">Documentos</th><th>Parecer</th><th></th></tr></thead>
          <tbody>
            {alunos.filter((a) => !a.contaTeste).concat(alunos.filter((a) => a.contaTeste)).map((a) => {
              const w = mapa[a.matricula];
              const iniciou = w && (conta(w.rcaso) + conta(w.rcalc) + conta(w.rinc) + conta(w.rdoc) + conta(w.rparecer) > 0);
              return (
                <tr key={a.matricula}>
                  <td className="mono">{a.matricula}</td><td>{a.nome}{a.contaTeste ? " (teste)" : ""}</td>
                  <td className="num">{w ? conta(w.rcalc) : 0}</td><td className="num">{w ? conta(w.rinc) : 0}</td><td className="num">{w ? conta(w.rdoc) : 0}</td>
                  <td>{w && w.rparecer && w.rparecer.enviado ? <span className="tag-pill ok">enviado</span> : iniciou ? <span className="tag-pill warn">em andamento</span> : <span style={{ color: "var(--ink-faint)" }}>não começou</span>}</td>
                  <td><button className="btn secondary" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => { setSel(a); setDevol((w && w.devolutivaResc) || ""); setMsg(""); }}>Abrir</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RescisaoProfessor({ turma }) {
  const [aba, setAba] = useState("lib");
  const ca = useCaTurma(turma ? turma.id : null);
  const resc = useRescisaoTurma(turma ? turma.id : null);
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  return (
    <>
      <div className="screen-eyebrow">etapa 4 · rescisão trabalhista</div>
      <h2 className="screen-title">Etapa 4 — Rescisão (professor)</h2>
      <p className="screen-sub">Libere a rescisão trabalhista, confira as contas, defina o caso e acompanhe os trabalhos dos alunos.</p>
      <Abas abas={[{ key: "lib", label: "Liberação e contas" }, { key: "caso", label: "Caso e gabarito" }, { key: "trab", label: "Trabalhos dos alunos" }]} ativa={aba} onChange={setAba} />
      {aba === "lib" ? <Liberacao turma={turma} ca={ca} /> : aba === "caso" ? <EditorCaso turma={turma} resc={resc} /> : <Trabalhos turma={turma} />}
    </>
  );
}
