import { useEffect, useMemo, useState } from "react";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useLancamentosDaTurma } from "../../hooks/useLancamentosDaTurma.js";
import { useCatalogoDocumentos } from "../../hooks/useCatalogoDocumentos.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useChamados } from "../../hooks/useChamados.js";
import { useAndamentoDaTurma } from "../../hooks/useAndamentoDaTurma.js";
import { useCaTurma } from "../../hooks/useCa.js";
import { useAgbTurma } from "../../hooks/useAgb.js";
import { useRoteiroDosAlunos } from "../../hooks/useRoteiro.js";
import { ETAPAS as ETAPAS_AVAL, fmtNota } from "../../lib/avaliacao.js";
import { ETAPAS_PAINEL, etapaPorId, contagemDoAluno } from "../../lib/painelEtapas.js";
import { montarSala, chamadoAguardando, haQuanto, LIMITE_PADRAO } from "../../lib/salaDeAula.js";

// Painel da turma (2026-10-16): visão geral da turma, com tudo clicável.
// Só LEITURA e navegação: usa os mesmos dados da Sala de aula e não grava nada.
const COR = { r: "var(--red)", a: "var(--amber)", g: "var(--green)", c: "var(--ink-faint)" };
const PASSOS = [["dig", "① Digitação"], ["ana", "② Análise fiscal"], ["cla", "③ Classificação"], ["lan", "④ Lançamento"], ["apr", "⑤ Aprovado"]];
const ESTADO = {
  ok: { g: "✓", bg: "var(--green-pale)", cor: "var(--green)", t: "completo" },
  and: { g: "…", bg: "var(--blue-pale)", cor: "var(--blue)", t: "em andamento" },
  nao: { g: "·", bg: "var(--paper-deep)", cor: "var(--ink-faint)", t: "não começou" },
};
let memoriaEtapa = "f1"; // lembra a etapa escolhida ao ir e voltar entre telas
const estadoDe = (n, total) => (total > 0 && n >= total ? "ok" : n > 0 ? "and" : "nao");

export default function PainelTurma({ turma, onIr, onAbrirHistorico }) {
  const turmaId = turma && turma.id;
  const alunos = useAlunosReaisDaTurma(turmaId);
  const { porMatricula } = useLancamentosDaTurma(turmaId, alunos);
  const catalogo = useCatalogoDocumentos();
  const documentos = useDocumentosDaTurma(turmaId);
  const { chamados } = useChamados(turmaId, null);
  const andamento = useAndamentoDaTurma(turmaId, alunos);
  const caT = useCaTurma(turmaId), agbT = useAgbTurma(turmaId);
  const [etapaId, setEtapaId] = useState(memoriaEtapa);
  const escolher = (id) => { memoriaEtapa = id; setEtapaId(id); };
  const { mapa: roteiro, recarregar: recarregarNotas } = useRoteiroDosAlunos(turmaId, etapaId === "notas" ? alunos : null); // só lê quando a aba Notas está aberta
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(t); }, []);

  const sala = useMemo(() => {
    if (!alunos) return null;
    return montarSala({ alunos, porAluno: andamento, lancsPorAluno: porMatricula, chamados: chamados || [], catalogo, totalNotas: documentos ? documentos.length : 0 }, agora, LIMITE_PADRAO);
  }, [alunos, andamento, porMatricula, chamados, catalogo, documentos, agora]);

  if (!turma) return <div className="helper-note">Escolha uma turma em <b>Turmas</b> para ver o painel. <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => onIr("turmas")}>Abrir Turmas</button></div>;
  if (!sala) return <div className="empty-state">Carregando…</div>;

  const total = documentos ? documentos.length : 0;
  const L = sala.linhas;
  const nFila = L.reduce((t, x) => t + x.enviados, 0);
  const nOk = L.reduce((t, x) => t + x.nOk, 0), nNo = L.reduce((t, x) => t + x.nNo, 0);
  const nSup = (chamados || []).filter(chamadoAguardando).length;
  const nDev = L.filter((x) => x.devolvidos > 0).length;
  const sala_ = (filtro) => onIr("inicio", { filtro });
  const irSinal = (x, s) => {
    if (s.alvo === "fila") onIr("fila", { matricula: x.aluno.matricula, nome: x.aluno.nome });
    else if (s.alvo === "suporte") onIr("suporte", { chamadoId: s.chamadoId });
    else onAbrirHistorico && onAbrirHistorico(x.aluno);
  };
  const Kpi = ({ cor, n, t, sub, onClick }) => (
    <button type="button" onClick={onClick} style={{ textAlign: "left", background: "var(--surface)", border: "1px solid var(--line)", borderLeft: "4px solid " + cor, padding: "9px 12px", cursor: "pointer", font: "inherit", color: "inherit" }}>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.05 }}>{n}</div>
      <div>{t}</div>
      <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{sub}</div>
    </button>
  );
  const precisam = L.filter((x) => x.grupo === "pre").slice(0, 8);
  const porNome = [...L].sort((a, b) => (a.aluno.nome || "").localeCompare(b.aluno.nome || ""));

  // ---- etapas 2 a 6 e visão geral (só leitura do que o aluno já gravou) ----
  const liberada = { fp: caT.liberado, ca: caT.liberado, resc: !!(caT.config && caT.config.rescisaoLiberada), agb: agbT.liberado, comp: agbT.liberado };
  const fechadaDa = (e) => !!e.n && e.n > 1 && liberada[e.id] === false;
  const contagem = (e, x) => contagemDoAluno(e, andamento[x.aluno.matricula]);
  const abrirAluno = (x) => onAbrirHistorico && onAbrirHistorico(x.aluno);
  const celula = (txt, est, onClick, titulo) => (
    <button type="button" title={titulo} onClick={onClick} style={{ minWidth: 58, height: 24, border: 0, background: ESTADO[est].bg, color: ESTADO[est].cor, fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: 12 }}>{txt}</button>
  );
  const quadroAluno = (cabs, linhas, comUltima = true) => (
    <div className="panel" style={{ margin: "14px 0 0" }}><div className="panel-body" style={{ overflowX: "auto" }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>MAPA DA TURMA · CLIQUE NA CÉLULA PARA ABRIR O ALUNO</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
        <thead><tr>
          <th style={{ textAlign: "left", padding: "4px 6px" }}>Aluno</th>
          {cabs.map((c, i) => <th key={i} style={{ padding: "4px 6px", fontSize: 12 }}>{c}</th>)}
          {comUltima && <th style={{ textAlign: "left", padding: "4px 6px" }}>Última atividade</th>}
        </tr></thead>
        <tbody>{linhas}</tbody>
      </table>
    </div></div>
  );
  const etapaGenerica = () => {
    const e = etapaPorId(etapaId);
    const cont = porNome.map((x) => ({ x, v: contagem(e, x) }));
    const comecou = cont.filter((c) => c.v.some((n) => n > 0)).length;
    const fechada = fechadaDa(e);
    return (
      <>
        {fechada && <div className="helper-note" style={{ marginBottom: 10 }}>Esta etapa ainda está <b>fechada</b> para a turma. O painel mostra o que já existir gravado; os números aparecem quando você liberar.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, margin: "0 0 14px" }}>
          <Kpi cor="var(--blue)" n={nSup} t="chamados no suporte" sub="esperando você" onClick={() => onIr("suporte")} />
          <Kpi cor="var(--red)" n={sala.cont.pre} t="precisam de você" sub={"de " + L.length + " alunos (turma toda)"} onClick={() => sala_("pre")} />
          <Kpi cor="var(--green)" n={comecou + " de " + L.length} t="já começaram" sub={"Etapa " + e.n} onClick={() => onIr("inicio")} />
          <Kpi cor="var(--ink-faint)" n={L.length - comecou} t="ainda não começaram" sub={"Etapa " + e.n} onClick={() => onIr("inicio")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
          <div className="panel" style={{ margin: 0 }}><div className="panel-body">
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>ANDAMENTO DA ETAPA {e.n} · {e.rot.toUpperCase()}</div>
            {e.passos.map(([nomeP], j) => {
              const c = { and: cont.filter((q) => q.v[j] > 0).length };
              c.nao = L.length - c.and;
              return (
                <div key={j} style={{ display: "grid", gridTemplateColumns: "minmax(110px,170px) 1fr 40px", gap: 8, alignItems: "center", margin: "6px 0" }}>
                  <span>{j + 1} {nomeP}</span>
                  <div style={{ display: "flex", height: 22, gap: 2 }}>
                    {["and", "nao"].filter((k) => c[k]).map((k) => (
                      <span key={k} title={ESTADO[k].t + ": " + c[k]} style={{ flex: c[k], background: ESTADO[k].bg, color: ESTADO[k].cor, fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0, overflow: "hidden", whiteSpace: "nowrap" }}>{ESTADO[k].g} {c[k]}</span>
                    ))}
                  </div>
                  <span className="mono" style={{ textAlign: "right", color: "var(--ink-soft)" }}>{L.length ? Math.round(c.and / L.length * 100) : 0}%</span>
                </div>
              );
            })}
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>… já preencheu alguma coisa · · não começou. Cada barra conta os alunos.</div>
          </div></div>
          <div className="panel" style={{ margin: 0 }}><div className="panel-body">
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>PRECISAM DE VOCÊ AGORA</div>
            {precisam.length === 0 && <div style={{ color: "var(--ink-soft)" }}>Ninguém precisa de você agora. 🎉</div>}
            {precisam.map((x) => (
              <div key={x.aluno.matricula} style={{ borderBottom: "1px solid var(--line)", padding: "5px 0" }}>
                <button type="button" onClick={() => abrirAluno(x)} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", fontWeight: 700, color: "inherit", padding: 0 }}>{x.aluno.nome}</button>
                <div>{x.sinais.map((s, i) => (
                  <button type="button" key={i} onClick={() => irSinal(x, s)} style={{ fontSize: 12, fontWeight: 700, padding: "1px 7px", margin: "2px 6px 2px 0", border: "1px solid " + COR[s.tom], color: COR[s.tom], background: "transparent", cursor: "pointer" }}>{s.texto}</button>
                ))}</div>
              </div>
            ))}
          </div></div>
        </div>
        {quadroAluno(e.passos.map(([n], j) => (j + 1) + " " + n), cont.map(({ x, v }) => (
          <tr key={x.aluno.matricula} style={{ borderTop: "1px solid var(--line)" }}>
            <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}><button type="button" onClick={() => abrirAluno(x)} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", color: "inherit", padding: 0 }}>{x.aluno.nome}</button></td>
            {v.map((n, j) => <td key={j} style={{ textAlign: "center", padding: "3px 4px" }}>{celula(ESTADO[n > 0 ? "and" : "nao"].g + " " + n, n > 0 ? "and" : "nao", () => abrirAluno(x), n + " campos preenchidos")}</td>)}
            <td style={{ padding: "4px 6px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{haQuanto(x.ultima, agora)}</td>
          </tr>
        )))}
        <div className="helper-note" style={{ marginTop: 12 }}>Nesta etapa o painel conta os <b>campos que o aluno já preencheu</b> em cada parte. Não existe fila de correção nem devolução por nota fora da Etapa 1.</div>
      </>
    );
  };
  const mapaNotas = () => {
    if (!roteiro) return <div className="empty-state">Carregando notas…</div>;
    const cel = (x, e) => {
      const r = roteiro[x.aluno.matricula] || {}, av = (r.avaliacoes || {})[e.id], ent = r.entregas || {};
      const nota = av && typeof av.nota === "number" ? av.nota : null;
      if (nota !== null) return { nota, k: av.liberada ? "lib" : "aval" };
      return { nota: null, k: ent[e.id] || ent["p_" + e.id] ? "entreg" : "sem" };
    };
    const linhas = porNome.map((x) => { const c = ETAPAS_AVAL.map((e) => cel(x, e)); const ns = c.filter((q) => q.nota !== null).map((q) => q.nota); return { x, c, media: ns.length ? ns.reduce((t, n) => t + n, 0) / ns.length : null }; });
    const todas = linhas.flatMap((l) => l.c), com = todas.filter((q) => q.nota !== null);
    const nLib = todas.filter((q) => q.k === "lib").length, nAguard = todas.filter((q) => q.k === "entreg").length;
    const mediaTurma = com.length ? com.reduce((t, q) => t + q.nota, 0) / com.length : null;
    const COR_N = { lib: ["var(--green-pale)", "var(--green)", "✓ "], aval: ["var(--blue-pale)", "var(--blue)", "… "], entreg: ["var(--amber-pale)", "var(--amber)", "✉ "], sem: ["var(--paper-deep)", "var(--ink-faint)", "· "] };
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, margin: "0 0 4px" }}>
          <Kpi cor="var(--blue)" n={com.length} t="avaliações feitas" sub="nota lançada" onClick={() => onIr("aval-prof")} />
          <Kpi cor="var(--green)" n={nLib} t="liberadas ao aluno" sub="o aluno já vê a nota" onClick={() => onIr("aval-prof")} />
          <Kpi cor="var(--amber)" n={nAguard} t="aguardando avaliação" sub="entregue, sem nota" onClick={() => onIr("aval-prof")} />
          <Kpi cor="var(--ink-faint)" n={fmtNota(mediaTurma)} t="média da turma" sub="das notas já lançadas" onClick={() => onIr("notas")} />
        </div>
        {quadroAluno(["① Escrituração", "② Folha", "③ Provisões", "④ Rescisão", "⑤ AGB", "⑥ Comparativa", "Média"], linhas.map(({ x, c, media }) => (
          <tr key={x.aluno.matricula} style={{ borderTop: "1px solid var(--line)" }}>
            <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}><button type="button" onClick={() => abrirAluno(x)} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", color: "inherit", padding: 0 }}>{x.aluno.nome}</button></td>
            {c.map((q, j) => (
              <td key={j} style={{ textAlign: "center", padding: "3px 4px" }}>
                <button type="button" title={ETAPAS_AVAL[j].titulo} onClick={() => onIr("aval-prof")} style={{ minWidth: 58, height: 24, border: 0, background: COR_N[q.k][0], color: COR_N[q.k][1], fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: 12 }}>
                  {COR_N[q.k][2]}{q.nota !== null ? fmtNota(q.nota) : q.k === "entreg" ? "entregue" : ""}
                </button>
              </td>
            ))}
            <td style={{ textAlign: "center", fontWeight: 700 }} className="mono">{fmtNota(media)}</td>
          </tr>
        )), false)}
        <div className="helper-note" style={{ marginTop: 12 }}>✓ liberada ao aluno · … avaliada, ainda não liberada · ✉ entregue, falta avaliar · · sem entrega. Clicar numa célula abre <b>Avaliação das etapas</b>. Nada é alterado aqui. <button className="btn secondary" style={{ marginLeft: 8 }} onClick={recarregarNotas}>Atualizar notas</button></div>
      </>
    );
  };
  const visaoGeral = () => {
    const et = ETAPAS_PAINEL.filter((e) => e.n > 1);
    const dados = porNome.map((x) => ({ x, e1: total > 0 ? Math.round(x.prog.apr / total * 100) : 0, ets: et.map((e) => { const v = contagem(e, x); return { ini: v.filter((n) => n > 0).length, de: v.length }; }) }));
    const concl1 = dados.filter((d) => d.e1 >= 100).length;
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, margin: "0 0 4px" }}>
          <Kpi cor="var(--green)" n={concl1 + " de " + L.length} t="concluíram a Etapa 1" sub="notas aprovadas" onClick={() => escolher("f1")} />
          {et.map((e, j) => (
            <Kpi key={e.id} cor={fechadaDa(e) ? "var(--ink-faint)" : "var(--blue)"} n={dados.filter((d) => d.ets[j].ini > 0).length + " de " + L.length}
              t={"começaram a Etapa " + e.n} sub={fechadaDa(e) ? "etapa fechada" : e.rot} onClick={() => escolher(e.id)} />
          ))}
          <Kpi cor="var(--red)" n={sala.cont.pre} t="precisam de você" sub={"de " + L.length + " alunos"} onClick={() => sala_("pre")} />
        </div>
        {quadroAluno(["① Escrituração", ...et.map((e) => e.n + " · " + e.rot.split(" ")[0])], dados.map(({ x, e1, ets }) => (
          <tr key={x.aluno.matricula} style={{ borderTop: "1px solid var(--line)" }}>
            <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}><button type="button" onClick={() => abrirAluno(x)} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", color: "inherit", padding: 0 }}>{x.aluno.nome}</button></td>
            <td style={{ textAlign: "center", padding: "3px 4px" }}>{celula((e1 >= 100 ? "✓ " : e1 > 0 ? "… " : "· ") + e1 + "%", e1 >= 100 ? "ok" : e1 > 0 ? "and" : "nao", () => escolher("f1"), "notas aprovadas")}</td>
            {ets.map((c, j) => <td key={j} style={{ textAlign: "center", padding: "3px 4px" }}>{celula((c.ini > 0 ? "… " : "· ") + c.ini + "/" + c.de, c.ini > 0 ? "and" : "nao", () => escolher(et[j].id), c.ini + " de " + c.de + " passos começados")}</td>)}
            <td style={{ padding: "4px 6px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{haQuanto(x.ultima, agora)}</td>
          </tr>
        )))}
        <div className="helper-note" style={{ marginTop: 12 }}>Etapa 1: percentual de notas aprovadas. Etapas 2 a 6: quantos passos o aluno já começou. Clique numa célula ou num número para abrir aquela etapa.</div>
      </>
    );
  };

  return (
    <>
      <div className="screen-eyebrow">projeto interdisciplinar CI–CA–AGB</div>
      <h2 className="screen-title">Painel da turma</h2>
      <p className="screen-sub">{turma.nome} · {L.length} alunos · atualiza sozinho · toque em qualquer número, nome ou célula para abrir.</p>

      <div style={{ margin: "6px 0 12px" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>ETAPA EM EXIBIÇÃO</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ETAPAS_PAINEL.map((e) => {
            const on = e.id === etapaId, fechada = fechadaDa(e);
            return (
              <button key={e.id} type="button" aria-pressed={on} onClick={() => escolher(e.id)}
                style={{ textAlign: "left", padding: "6px 12px", cursor: "pointer", font: "inherit", borderWidth: 1, borderStyle: e.id === "geral" && !on ? "dashed" : "solid", borderColor: on ? "var(--green)" : "var(--line-strong)",
                  background: on ? "var(--green)" : "var(--surface)", color: on ? "#fff" : "var(--ink)", opacity: fechada && !on ? 0.65 : 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{(e.n || e.num) ? (e.n || e.num) + " · " : ""}{e.rot}</div>
                <div className="mono" style={{ fontSize: 10.5, opacity: 0.8 }}>{e.sub}{e.n ? (fechada ? " · fechada" : " · liberada") : ""}</div>
              </button>
            );
          })}
        </div>
      </div>

      {etapaId === "geral" && visaoGeral()}
      {etapaId === "notas" && mapaNotas()}
      {etapaId !== "f1" && etapaId !== "geral" && etapaId !== "notas" && etapaGenerica()}
      {etapaId === "f1" && (
        <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, margin: "10px 0 14px" }}>
        <Kpi cor="var(--amber)" n={nFila} t="na fila de correção" sub={!catalogo ? "conferindo…" : "✅ " + nOk + " conferem · ❌ " + nNo + " com erro"} onClick={() => onIr("fila")} />
        <Kpi cor="var(--blue)" n={nSup} t="chamados no suporte" sub="esperando você" onClick={() => onIr("suporte")} />
        <Kpi cor="var(--red)" n={sala.cont.pre} t="precisam de você" sub={"de " + L.length + " alunos"} onClick={() => sala_("pre")} />
        <Kpi cor="var(--amber)" n={nDev} t="com devolução pendente" sub="o aluno ainda não corrigiu" onClick={() => sala_("pre")} />
        <Kpi cor="var(--ink-faint)" n={sala.cont.par} t="parados" sub={"sem gravar há " + LIMITE_PADRAO + " min ou mais"} onClick={() => sala_("par")} />
        <Kpi cor="var(--green)" n={sala.cont.ok + " de " + L.length} t="em dia" sub="Etapa 1 concluída" onClick={() => sala_("ok")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginBottom: 14 }}>
        <div className="panel" style={{ margin: 0 }}><div className="panel-body">
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>ANDAMENTO DA ETAPA 1 · {total} NOTAS POR ALUNO</div>
          {PASSOS.map(([k, nome]) => {
            const c = { ok: 0, and: 0, nao: 0 };
            L.forEach((x) => { c[estadoDe(x.prog[k], total)]++; });
            return (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "120px 1fr 40px", gap: 8, alignItems: "center", margin: "6px 0" }}>
                <button type="button" onClick={() => onIr(k === "lan" || k === "apr" ? "fila" : "painel")} style={{ background: "none", border: 0, cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit", padding: 0 }}>{nome}</button>
                <div style={{ display: "flex", height: 22, gap: 2 }}>
                  {["ok", "and", "nao"].filter((e) => c[e]).map((e) => (
                    <button type="button" key={e} title={ESTADO[e].t + ": " + c[e]} onClick={() => onIr(k === "lan" || k === "apr" ? "fila" : "painel")}
                      style={{ flex: c[e], border: 0, background: ESTADO[e].bg, color: ESTADO[e].cor, fontWeight: 700, fontSize: 11, cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap", minWidth: 0 }}>{ESTADO[e].g} {c[e]}</button>
                  ))}
                </div>
                <span className="mono" style={{ textAlign: "right", color: "var(--ink-soft)" }}>{L.length ? Math.round(c.ok / L.length * 100) : 0}%</span>
              </div>
            );
          })}
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>✓ completo · … em andamento · · não começou. Cada barra conta os alunos.</div>
        </div></div>

        <div className="panel" style={{ margin: 0 }}><div className="panel-body">
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>PRECISAM DE VOCÊ AGORA</div>
          {precisam.length === 0 && <div style={{ color: "var(--ink-soft)" }}>Ninguém precisa de você agora. 🎉</div>}
          {precisam.map((x) => (
            <div key={x.aluno.matricula} style={{ borderBottom: "1px solid var(--line)", padding: "5px 0" }}>
              <button type="button" onClick={() => onAbrirHistorico && onAbrirHistorico(x.aluno)} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", fontWeight: 700, color: "inherit", padding: 0 }}>{x.aluno.nome}</button>
              <div>{x.sinais.map((s, i) => (
                <button type="button" key={i} onClick={() => irSinal(x, s)} style={{ fontSize: 12, fontWeight: 700, padding: "1px 7px", margin: "2px 6px 2px 0", border: "1px solid " + COR[s.tom], color: COR[s.tom], background: "transparent", cursor: "pointer", font: "inherit" }}>{s.texto} ›</button>
              ))}</div>
            </div>
          ))}
          {sala.cont.pre > precisam.length && <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => sala_("pre")}>Ver todos os {sala.cont.pre}</button>}
        </div></div>
      </div>

      <div className="panel" style={{ margin: 0 }}><div className="panel-body" style={{ overflowX: "auto" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>MAPA DA TURMA · ALUNO × PASSO · CLIQUE NA CÉLULA PARA ABRIR O ALUNO</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>
            <th style={{ textAlign: "left", padding: "4px 6px" }}>Aluno</th>
            {PASSOS.map(([k, n]) => <th key={k} style={{ padding: "4px 6px", fontSize: 12 }}>{n}</th>)}
            <th style={{ textAlign: "left", padding: "4px 6px" }}>Última atividade</th>
          </tr></thead>
          <tbody>
            {porNome.map((x) => (
              <tr key={x.aluno.matricula} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                  <button type="button" onClick={() => onAbrirHistorico && onAbrirHistorico(x.aluno)} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", color: "inherit", padding: 0 }}>{x.aluno.nome}</button>
                  {x.chamado ? " ✉" : ""}
                </td>
                {PASSOS.map(([k]) => {
                  const e = estadoDe(x.prog[k], total), n = x.prog[k];
                  const erro = (k === "lan") && x.nNo > 0, dev = (k === "lan") && x.devolvidos > 0;
                  return (
                    <td key={k} style={{ textAlign: "center", padding: "3px 4px" }}>
                      <button type="button" title={nome(k) + ": " + n + "/" + total}
                        onClick={() => (erro ? onIr("fila", { matricula: x.aluno.matricula, nome: x.aluno.nome }) : onAbrirHistorico && onAbrirHistorico(x.aluno))}
                        style={{ minWidth: 52, height: 24, border: erro ? "2px solid var(--red)" : 0, background: ESTADO[e].bg, color: ESTADO[e].cor, fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: 12 }}>
                        {ESTADO[e].g} {n}/{total}{erro ? " ❌" : dev ? " ↩" : ""}
                      </button>
                    </td>
                  );
                })}
                <td style={{ padding: "4px 6px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{haQuanto(x.ultima, agora)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
        </>
      )}
      <div className="helper-note" style={{ marginTop: 12 }}>Este painel só mostra e leva você às telas de trabalho: nada é aprovado, devolvido ou alterado aqui, e nada que o aluno digitou muda.</div>
    </>
  );
}
function nome(k) { return (PASSOS.find((p) => p[0] === k) || [k, k])[1]; }
