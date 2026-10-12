import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { fmt } from "../../lib/contabil.js";
import { LINHAS_BP, BLOCOS_BP, LINHAS_DRE, totaisBP, dreCompletaDeLinhas, lerNumero } from "../../lib/agb.js";
import { useAgbTurma, salvarConfigAgb, salvarPeriodoAnterior, useTrabalhosAgbDaTurma } from "../../hooks/useAgb.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { Abas } from "../shared/AgbUI.jsx";

const LINHAS_DRE_EDIT = LINHAS_DRE.filter((l) => l.tipo === "linha");

function Liberacao({ turma, agb }) {
  const [rotulo, setRotulo] = useState("");
  const [bp, setBp] = useState({});
  const [dre, setDre] = useState({});
  const [estado, setEstado] = useState("");
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    if (agb.anterior === undefined || carregou) return;
    const a = agb.anterior || {};
    setRotulo(a.rotulo || "");
    const b = {}; LINHAS_BP.forEach((l) => { b[l.key] = a.bp && a.bp[l.key] !== undefined ? String(a.bp[l.key]) : ""; });
    const d = {}; LINHAS_DRE_EDIT.forEach((l) => { d[l.key] = a.dre && a.dre[l.key] !== undefined ? String(a.dre[l.key]) : ""; });
    setBp(b); setDre(d); setCarregou(true);
  }, [agb.anterior, carregou]);

  const num = (o) => { const r = {}; Object.keys(o).forEach((k) => { r[k] = lerNumero(o[k]) || 0; }); return r; };
  const t = totaisBP(num(bp));
  const dreCalc = dreCompletaDeLinhas(num(dre));
  const fecha = Math.abs(t.ativo - t.passivoPL) < 0.005;

  async function alternarLiberacao() {
    setEstado("salvando");
    try { await salvarConfigAgb(turma.id, { liberado: !agb.liberado, atualizadoEm: new Date().toISOString() }); setEstado(""); }
    catch (e) { setEstado("erro: " + (e.message || e.code)); }
  }
  async function salvar() {
    setEstado("salvando");
    try {
      await salvarPeriodoAnterior(turma.id, { rotulo: rotulo.trim() || "Exercício anterior", bp: num(bp), dre: num(dre), atualizadoEm: new Date().toISOString() });
      setEstado("salvo às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) { setEstado("erro: " + (e.message || e.code)); }
  }

  if (agb.anterior === undefined || agb.config === undefined) return <div className="empty-state">Carregando…</div>;
  return (
    <>
      <div className="panel">
        <div className="panel-head"><h3>Liberação da Fase 3 para os alunos</h3></div>
        <div className="panel-body">
          <p style={{ marginTop: 0 }}>
            Enquanto não estiver liberada, os alunos <b>não veem</b> o menu da Fase 3. Você (e a conta de teste) sempre veem.
          </p>
          <span className={"tag-pill " + (agb.liberado ? "ok" : "warn")}>{agb.liberado ? "Liberada aos alunos" : "Ainda não liberada"}</span>{" "}
          <button className="btn secondary" onClick={alternarLiberacao}>{agb.liberado ? "Ocultar dos alunos" : "Liberar aos alunos"}</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Período anterior (base da análise horizontal)</h3></div>
        <div className="panel-body">
          <p style={{ marginTop: 0, color: "var(--ink-soft)", fontSize: 13.5 }}>
            Informe os saldos do exercício anterior, <b>por linha</b> (os mesmos grupos que o aluno vê). Vale para toda a turma. Use valores positivos; as deduções, o CMV e as despesas entram positivos também.
          </p>
          <div className="field" style={{ maxWidth: 360 }}>
            <label>Nome do período</label>
            <input value={rotulo} onChange={(e) => setRotulo(e.target.value)} placeholder="Ex.: Exercício 2025" />
          </div>
          {["AC", "ANC", "PC", "PNC", "PL"].map((b) => (
            <div key={b} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: "var(--green-dark)", margin: "10px 0 6px" }}>{BLOCOS_BP[b]}</div>
              {LINHAS_BP.filter((l) => l.bloco === b).map((l) => (
                <div key={l.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "3px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 13.5 }}>{l.nome}</span>
                  <input className="mono" inputMode="decimal" style={{ width: 130, textAlign: "right", padding: "4px 6px", border: "1px solid var(--line-strong)" }}
                    value={bp[l.key] || ""} onChange={(e) => setBp({ ...bp, [l.key]: e.target.value })} placeholder="0,00" />
                </div>
              ))}
            </div>
          ))}
          <div className={"balance-check " + (fecha ? "ok" : "bad")} style={{ margin: "10px 0" }}>
            Ativo: {fmt(t.ativo)} · Passivo + PL: {fmt(t.passivoPL)} {fecha ? "✓ fecha" : "✗ não fecha (você ainda pode salvar, mas confira)"}
          </div>
          <div style={{ fontWeight: 700, color: "var(--green-dark)", margin: "16px 0 6px" }}>DRE DO PERÍODO ANTERIOR</div>
          {LINHAS_DRE_EDIT.map((l) => (
            <div key={l.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "3px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13.5 }}>{l.nome}{l.key === "resultadoFinanceiro" ? " (negativo se despesa)" : ""}</span>
              <input className="mono" inputMode="decimal" style={{ width: 130, textAlign: "right", padding: "4px 6px", border: "1px solid var(--line-strong)" }}
                value={dre[l.key] || ""} onChange={(e) => setDre({ ...dre, [l.key]: e.target.value })} placeholder="0,00" />
            </div>
          ))}
          <div style={{ margin: "10px 0", fontSize: 13.5, color: "var(--ink-soft)" }}>
            Calculado: receita líquida R$ {fmt(dreCalc.receitaLiquida)} · resultado bruto R$ {fmt(dreCalc.resultadoBruto)} · resultado do exercício R$ {fmt(dreCalc.resultadoExercicio)}
          </div>
          <div className="btn-row">
            <button className="btn green" onClick={salvar}>Salvar período anterior</button>
            {estado && <span style={{ alignSelf: "center", fontSize: 13 }} className={estado.startsWith("erro") ? "tag-pill bad" : "tag-pill ok"}>{estado}</span>}
          </div>
        </div>
      </div>
    </>
  );
}

function Trabalhos({ turma }) {
  const alunos = useAlunosDaTurma(turma.id);
  const { mapa, recarregar } = useTrabalhosAgbDaTurma(turma.id, alunos);
  const [sel, setSel] = useState(null);
  const [devol, setDevol] = useState("");
  const [msg, setMsg] = useState("");

  if (!alunos || !mapa) return <div className="empty-state">Carregando trabalhos…</div>;
  const conta = (o) => Object.values(o || {}).filter((v) => String(v).trim() !== "").length;

  async function salvarDevolutiva() {
    setMsg("salvando…");
    try {
      await setDoc(doc(db, "turmas", turma.id, "alunos", sel.matricula, "agb", "trabalho"),
        { devolutiva: devol, devolutivaEm: new Date().toISOString() }, { merge: true });
      setMsg("✓ retorno salvo — o aluno já pode ler"); recarregar();
    } catch (e) { setMsg("✗ não salvou: " + (e.message || e.code)); }
  }

  if (sel) {
    const w = mapa[sel.matricula] || {};
    const bloco = (titulo, obj, rot) => (
      <div className="panel"><div className="panel-head"><h3>{titulo}</h3></div><div className="panel-body">
        {Object.keys(obj || {}).filter((k) => String(obj[k]).trim() !== "" && !["enviado", "enviadoEm"].includes(k)).length === 0
          ? <span style={{ color: "var(--ink-faint)" }}>nada preenchido</span>
          : Object.keys(obj).filter((k) => String(obj[k]).trim() !== "" && !["enviado", "enviadoEm"].includes(k)).map((k) => (
            <div key={k} style={{ marginBottom: 10 }}><div style={{ fontSize: 11.5, color: "var(--ink-faint)" }} className="mono">{(rot && rot[k]) || k}</div><div style={{ whiteSpace: "pre-wrap" }}>{obj[k]}</div></div>
          ))}
      </div></div>
    );
    return (
      <>
        <button className="btn secondary" onClick={() => { setSel(null); setMsg(""); }}>← Voltar à lista</button>
        <h3 style={{ margin: "14px 0 4px" }}>{sel.nome || sel.matricula}</h3>
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 12 }}>
          Parecer: {w.parecer && w.parecer.enviado ? "enviado" : "não enviado"} · última gravação {w.atualizadoEm ? new Date(w.atualizadoEm).toLocaleString("pt-BR") : "—"}
        </div>
        {bloco("Parecer final", w.parecer, { liquidez: "1. Liquidez e capital de giro", estrutura: "2. Estrutura de capitais", rentabilidade: "3. Rentabilidade", recomendacoes: "4. Conclusão e recomendações" })}
        {bloco("Interpretações", w.interpretacoes)}
        <div className="panel"><div className="panel-head"><h3>Cálculos do aluno (o que ele digitou)</h3></div><div className="panel-body" style={{ fontSize: 13 }}>
          {conta(w.av) + conta(w.ah) + conta(w.calculos)} campos preenchidos (AV: {conta(w.av)}, AH: {conta(w.ah)}, indicadores e giro: {conta(w.calculos)}).
        </div></div>
        <div className="panel"><div className="panel-head"><h3>Seu retorno ao aluno</h3></div><div className="panel-body">
          {!mapa[sel.matricula] ? <span style={{ color: "var(--ink-faint)" }}>O aluno ainda não começou; só dá para responder depois que ele salvar algo.</span> : (
            <>
              <div className="field"><textarea rows={4} value={devol} onChange={(e) => setDevol(e.target.value)} placeholder="Comentário que o aluno verá na tela do parecer" /></div>
              <button className="btn green" onClick={salvarDevolutiva}>Salvar retorno</button> {msg && <span style={{ marginLeft: 8, fontSize: 13 }}>{msg}</span>}
            </>
          )}
        </div></div>
      </>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head"><h3>Trabalhos da Fase 3 — {turma.nome}</h3><button className="btn secondary" onClick={recarregar}>Atualizar</button></div>
      <div className="panel-body" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Matrícula</th><th>Aluno</th><th className="num">Cálculos</th><th className="num">Interpretações</th><th>Parecer</th><th></th></tr></thead>
          <tbody>
            {alunos.filter((a) => !a.contaTeste).concat(alunos.filter((a) => a.contaTeste)).map((a) => {
              const w = mapa[a.matricula];
              return (
                <tr key={a.matricula}>
                  <td className="mono">{a.matricula}</td>
                  <td>{a.nome}{a.contaTeste ? " (teste)" : ""}</td>
                  <td className="num">{w ? conta(w.av) + conta(w.ah) + conta(w.calculos) : 0}</td>
                  <td className="num">{w ? conta(w.interpretacoes) : 0}</td>
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

export default function AgbProfessor({ turma }) {
  const [aba, setAba] = useState("lib");
  const agb = useAgbTurma(turma ? turma.id : null);
  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  return (
    <>
      <div className="screen-eyebrow">fase 3 · análise gerencial de balanços</div>
      <h2 className="screen-title">Fase 3 — AGB (professor)</h2>
      <p className="screen-sub">Libere a Fase 3, cadastre o período anterior e acompanhe os trabalhos dos alunos.</p>
      <Abas abas={[{ key: "lib", label: "Liberação e período anterior" }, { key: "trab", label: "Trabalhos dos alunos" }]} ativa={aba} onChange={setAba} />
      {aba === "lib" ? <Liberacao turma={turma} agb={agb} /> : <Trabalhos turma={turma} />}
    </>
  );
}
