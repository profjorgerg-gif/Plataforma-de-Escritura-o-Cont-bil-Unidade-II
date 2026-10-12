import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { fmt } from "../../lib/contabil.js";
import { naturezaDe, destinoDe } from "../../data/planoContasOficial.js";
import { CONTAS_NOVAS, EMPREGADOS_MATERIAL, PARAMETROS_PADRAO, folhaEmUso, nomeDoMes } from "../../lib/folha.js";
import { lerNumero } from "../../lib/agb.js";
import { useCaTurma, salvarConfigCa, salvarFolhaCa, useTrabalhosCaDaTurma } from "../../hooks/useCa.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { Abas } from "../shared/AgbUI.jsx";

function Liberacao({ turma, ca }) {
  const { contas, deFallback } = usePlanoContas();
  const [msg, setMsg] = useState("");
  if (ca.config === undefined || !contas) return <div className="empty-state">Carregando…</div>;
  const faltam = CONTAS_NOVAS.filter((c) => !contas.some((x) => x.codigo === c.codigo));

  async function alternar() {
    setMsg("salvando…");
    try { await salvarConfigCa(turma.id, { liberado: !ca.liberado, atualizadoEm: new Date().toISOString() }); setMsg(""); }
    catch (e) { setMsg("✗ " + (e.message || e.code)); }
  }
  async function criarContas() {
    setMsg("criando…");
    try {
      for (const c of faltam) {
        await setDoc(doc(db, "planoContas", c.codigo), { nome: c.nome, grupo: c.grupo, subgrupo: c.subgrupo, natureza: naturezaDe(c.grupo, false), destino: destinoDe(c.grupo) });
      }
      setMsg("✓ contas criadas");
    } catch (e) { setMsg("✗ não criou: " + (e.message || e.code)); }
  }
  return (
    <>
      <div className="panel">
        <div className="panel-head"><h3>Liberação das etapas 2 e 3 (CA) para os alunos</h3></div>
        <div className="panel-body">
          <p style={{ marginTop: 0 }}>Enquanto não estiver liberada, os alunos <b>não veem</b> as etapas 2 e 3. Você (e a conta de teste) sempre veem.</p>
          <span className={"tag-pill " + (ca.liberado ? "ok" : "warn")}>{ca.liberado ? "Liberada aos alunos" : "Ainda não liberada"}</span>{" "}
          <button className="btn secondary" onClick={alternar}>{ca.liberado ? "Ocultar dos alunos" : "Liberar aos alunos"}</button>
          {msg && <span style={{ marginLeft: 8, fontSize: 13 }}>{msg}</span>}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Contas novas necessárias no Plano de contas</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Código</th><th>Conta</th><th>Situação</th></tr></thead>
            <tbody>{CONTAS_NOVAS.map((c) => {
              const tem = contas.some((x) => x.codigo === c.codigo);
              return <tr key={c.codigo}><td className="mono">{c.codigo}</td><td>{c.nome}</td><td><span className={"tag-pill " + (tem ? "ok" : "warn")}>{tem ? "já existe" : "falta criar"}</span></td></tr>;
            })}</tbody>
          </table>
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line-strong)" }}>
            {faltam.length === 0 ? <span style={{ fontSize: 13 }}>Todas as contas necessárias já existem.</span>
              : deFallback ? <span style={{ fontSize: 13 }}>O plano está usando a lista embutida no sistema, que já inclui estas contas. Nada a criar.</span>
              : <><button className="btn green" onClick={criarContas}>Criar as {faltam.length} contas que faltam</button> <span style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>só acrescenta; nenhuma conta existente é alterada</span></>}
          </div>
        </div>
      </div>
    </>
  );
}

function EditorFolha({ turma, ca }) {
  const [comp, setComp] = useState("2026-04");
  const [fixa, setFixa] = useState("");
  const [par, setPar] = useState({});
  const [emps, setEmps] = useState([]);
  const [carregou, setCarregou] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (ca.folha === undefined || carregou) return;
    const f = ca.folha || {};
    setComp(f.competencia || "2026-04");
    setFixa(f.remuneracaoFixa ? String(f.remuneracaoFixa) : "");
    const p = { ...PARAMETROS_PADRAO, ...(f.parametros || {}) };
    setPar({ inss: String(p.inss), fgts: String(p.fgts), rat: String(p.rat), terceiros: String(p.terceiros), cargaHoraria: String(p.cargaHoraria), diasUteisDSR: String(p.diasUteisDSR), diasDescansoDSR: String(p.diasDescansoDSR) });
    setEmps((f.empregados && f.empregados.length ? f.empregados : EMPREGADOS_MATERIAL).map((e) => ({ ...e, adicional: { ...(e.adicional || {}) } })));
    setCarregou(true);
  }, [ca.folha, carregou]);

  if (ca.folha === undefined || !carregou) return <div className="empty-state">Carregando…</div>;
  const num = (v) => lerNumero(v) || 0;
  const montar = () => ({
    competencia: comp,
    remuneracaoFixa: num(fixa) > 0 ? num(fixa) : null,
    parametros: { inss: num(par.inss), fgts: num(par.fgts), rat: num(par.rat), terceiros: num(par.terceiros), cargaHoraria: num(par.cargaHoraria) || 220, diasUteisDSR: num(par.diasUteisDSR) || 24, diasDescansoDSR: num(par.diasDescansoDSR) || 6, adicionalNoturno: 0.2 },
    empregados: emps.map((e) => ({ nome: e.nome, salario: num(e.salario), he50: num(e.he50), he100: num(e.he100), hen50: num(e.hen50), hen100: num(e.hen100),
      adicional: e.adicional && e.adicional.tipo ? { tipo: e.adicional.tipo, pct: e.adicional.tipo === "AI" ? num(e.adicional.pct) : 30 } : { tipo: null } })),
  });
  const previa = folhaEmUso(montar());
  const setE = (i, k, v) => setEmps(emps.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const setAd = (i, k, v) => setEmps(emps.map((e, j) => (j === i ? { ...e, adicional: { ...e.adicional, [k]: v } } : e)));

  async function salvar() {
    setMsg("salvando…");
    try { await salvarFolhaCa(turma.id, { ...montar(), atualizadoEm: new Date().toISOString() }); setMsg("✓ salvo às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })); }
    catch (e) { setMsg("✗ não salvou: " + (e.message || e.code)); }
  }
  const campo = (w, v, on, extra) => <input className="mono" inputMode="decimal" value={v ?? ""} onChange={(e) => on(e.target.value)} style={{ width: w, padding: "3px 5px", textAlign: "right", border: "1px solid var(--line-strong)" }} {...extra} />;

  return (
    <div className="panel">
      <div className="panel-head"><h3>Folha do mês e percentuais</h3></div>
      <div className="panel-body">
        <p style={{ marginTop: 0, color: "var(--ink-soft)", fontSize: 13.5 }}>Os alunos calculam e contabilizam a partir destes dados (a empresa é única, então a folha é igual para todos). Já vem preenchida com os 4 empregados do material.</p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
          <div className="field"><label>Competência (aaaa-mm)</label><input className="mono" value={comp} onChange={(e) => setComp(e.target.value)} style={{ width: 110 }} /></div>
          {[["inss", "INSS %"], ["fgts", "FGTS %"], ["rat", "RAT %"], ["terceiros", "Terceiros %"], ["cargaHoraria", "Carga (h)"], ["diasUteisDSR", "Dias úteis DSR"], ["diasDescansoDSR", "Dias descanso"]].map(([k, r]) => (
            <div className="field" key={k}><label>{r}</label>{campo(80, par[k], (v) => setPar({ ...par, [k]: v }))}</div>
          ))}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ minWidth: 720 }}>
            <thead><tr><th>Empregado</th><th className="num">Salário</th><th>Adicional</th><th className="num">%AI</th><th className="num">HE50</th><th className="num">HE100</th><th className="num">HEN50</th><th className="num">HEN100</th></tr></thead>
            <tbody>
              {emps.map((e, i) => (
                <tr key={i}>
                  <td><input value={e.nome} onChange={(ev) => setE(i, "nome", ev.target.value)} style={{ width: 150, padding: "3px 5px", border: "1px solid var(--line-strong)" }} /></td>
                  <td className="num">{campo(90, e.salario, (v) => setE(i, "salario", v))}</td>
                  <td><select value={(e.adicional && e.adicional.tipo) || ""} onChange={(ev) => setAd(i, "tipo", ev.target.value || null)}><option value="">nenhum</option><option value="AI">Insalubridade (AI)</option><option value="AP">Periculosidade (30%)</option></select></td>
                  <td className="num">{e.adicional && e.adicional.tipo === "AI" ? campo(50, e.adicional.pct, (v) => setAd(i, "pct", v)) : "—"}</td>
                  {["he50", "he100", "hen50", "hen100"].map((k) => <td className="num" key={k}>{campo(50, e[k], (v) => setE(i, k, v))}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="btn-row">
          <button className="btn secondary" onClick={() => setEmps([...emps, { nome: "Novo empregado", salario: "", he50: "", he100: "", hen50: "", hen100: "", adicional: {} }])}>+ empregado</button>
          {emps.length > 1 && <button className="btn secondary" onClick={() => setEmps(emps.slice(0, -1))}>− último</button>}
        </div>
        <div className="field" style={{ maxWidth: 360, marginTop: 14 }}>
          <label>Remuneração total FIXA para as provisões (opcional — ex.: 96.800,00 do caso integrador)</label>
          {campo(140, fixa, setFixa, { placeholder: "vazio = usa o total da folha" })}
        </div>
        <div className="balance-check ok" style={{ margin: "10px 0" }}>
          Gabarito calculado ({nomeDoMes(comp)}): folha R$ {fmt(previa.calc.total)} · base das provisões R$ {fmt(previa.remuneracao)} · total geral de despesas e obrigações R$ {fmt(previa.provisoes.totalGeral)}
        </div>
        <button className="btn green" onClick={salvar}>Salvar folha</button> {msg && <span style={{ marginLeft: 8, fontSize: 13 }}>{msg}</span>}
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
      await setDoc(doc(db, "turmas", turma.id, "alunos", sel.matricula, "ca", "trabalho"), { devolutiva: devol, devolutivaEm: new Date().toISOString() }, { merge: true });
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
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 12 }}>Parecer: {w.parecer && w.parecer.enviado ? "enviado" : "não enviado"} · última gravação {w.atualizadoEm ? new Date(w.atualizadoEm).toLocaleString("pt-BR") : "—"} · cálculos preenchidos: folha {conta(w.folha) - (w.folha && w.folha.desafio ? 1 : 0)}, provisões {conta(w.prov)}, lançamentos montados {Object.keys(w.lanc || {}).filter((k) => k.endsWith("_conta") && w.lanc[k]).length} linhas</div>
        {bloco("Parecer técnico", w.parecer)}
        {bloco("Desafio profissional (folha)", { desafio: (w.folha || {}).desafio })}
        {bloco("Efeitos nas demonstrações", w.efeitos)}
        <div className="panel"><div className="panel-head"><h3>Seu retorno ao aluno</h3></div><div className="panel-body">
          {!mapa[sel.matricula] ? <span style={{ color: "var(--ink-faint)" }}>O aluno ainda não começou; só dá para responder depois que ele salvar algo.</span> : (
            <><div className="field"><textarea rows={4} value={devol} onChange={(e) => setDevol(e.target.value)} placeholder="Comentário que o aluno verá na tela do parecer" /></div>
              <button className="btn green" onClick={salvarDevolutiva}>Salvar retorno</button> {msg && <span style={{ marginLeft: 8, fontSize: 13 }}>{msg}</span>}</>
          )}
        </div></div>
      </>
    );
  }
  return (
    <div className="panel">
      <div className="panel-head"><h3>Trabalhos das etapas 2 e 3 — {turma.nome}</h3><button className="btn secondary" onClick={recarregar}>Atualizar</button></div>
      <div className="panel-body" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Matrícula</th><th>Aluno</th><th className="num">Folha</th><th className="num">Provisões</th><th className="num">Lançam. (linhas)</th><th>Parecer</th><th></th></tr></thead>
          <tbody>
            {alunos.filter((a) => !a.contaTeste).concat(alunos.filter((a) => a.contaTeste)).map((a) => {
              const w = mapa[a.matricula];
              const nl = w ? Object.keys(w.lanc || {}).filter((k) => k.endsWith("_conta") && w.lanc[k]).length : 0;
              return (
                <tr key={a.matricula}>
                  <td className="mono">{a.matricula}</td><td>{a.nome}{a.contaTeste ? " (teste)" : ""}</td>
                  <td className="num">{w ? conta(w.folha) : 0}</td><td className="num">{w ? conta(w.prov) : 0}</td><td className="num">{nl}</td>
                  <td>{w && w.parecer && w.parecer.enviado ? <span className="tag-pill ok">enviado</span> : w ? <span className="tag-pill warn">em andamento</span> : <span style={{ color: "var(--ink-faint)" }}>não começou</span>}</td>
                  <td><button className="btn secondary" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => { setSel(a); setDevol((w && w.devolutiva) || ""); setMsg(""); }}>Abrir</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CaProfessor({ turma }) {
  const [aba, setAba] = useState("lib");
  const ca = useCaTurma(turma ? turma.id : null);
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  return (
    <>
      <div className="screen-eyebrow">etapas 2 e 3 · contabilidade avançada</div>
      <h2 className="screen-title">Etapas 2 e 3 — CA (professor)</h2>
      <p className="screen-sub">Libere as etapas 2 e 3, confira as contas, defina a folha do mês e acompanhe os trabalhos dos alunos.</p>
      <Abas abas={[{ key: "lib", label: "Liberação e contas" }, { key: "folha", label: "Folha e percentuais" }, { key: "trab", label: "Trabalhos dos alunos" }]} ativa={aba} onChange={setAba} />
      {aba === "lib" ? <Liberacao turma={turma} ca={ca} /> : aba === "folha" ? <EditorFolha turma={turma} ca={ca} /> : <Trabalhos turma={turma} />}
    </>
  );
}
