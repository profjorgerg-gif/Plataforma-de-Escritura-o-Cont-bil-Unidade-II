import { useState } from "react";
import { etapasEfetivas, situacaoEtapa, etapaAtual } from "../../lib/roteiro.js";
import { Abas, Carregando } from "../shared/AgbUI.jsx";

const classe = (c) => (c === "ok" ? "ok" : c === "bad" ? "bad" : c === "warn" ? "warn" : c === "info" ? "ok" : "");

export default function EtapasAluno({ config, rot, nomeAluno }) {
  const [aba, setAba] = useState("etapas");
  const [msg, setMsg] = useState("");
  if (config === undefined || rot.carregando) return <Carregando />;
  const lista = etapasEfetivas(config);
  const atual = etapaAtual(lista, rot.estado, rot.entregas);
  const fmtData = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

  async function entregar(id) {
    setMsg("salvando…");
    try { await rot.marcarEntregue(id); setMsg("✓ Entrega registrada. Aguarde a análise do professor."); }
    catch (e) { setMsg("✗ não foi possível registrar: " + (e.message || e.code)); }
  }

  return (
    <>
      <div className="screen-eyebrow no-print">projeto interdisciplinar</div>
      <h2 className="screen-title">Meu roteiro por etapas</h2>
      <p className="screen-sub no-print">Cada etapa só abre depois que o professor analisar a anterior. Você avança conforme seu desempenho, respeitando os prazos.</p>
      <Abas abas={[{ key: "etapas", label: "Minhas etapas" }, { key: "imp", label: "Cópia para imprimir" }]} ativa={aba} onChange={setAba} />
      {aba === "etapas" ? (
        <>
          <div className="balance-check ok" style={{ marginBottom: 14 }}>Você está na <b>etapa {atual + 1}</b>: {lista[atual].titulo}.</div>
          {msg && <div className="no-print" style={{ marginBottom: 10, fontSize: 13.5 }}>{msg}</div>}
          {lista.map((e, i) => {
            const s = situacaoEtapa(lista, i, rot.estado, rot.entregas);
            return (
              <div className="panel" key={e.id}>
                <div className="panel-head"><h3>Etapa {i + 1} · {e.titulo}</h3><span className={"tag-pill " + classe(s.classe)}>{s.rotulo}</span></div>
                <div className="panel-body">
                  <div>{e.descricao}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}><b>Entrega:</b> {e.entrega} · <b>Prazo:</b> {e.prazo ? fmtData(e.prazo + "T12:00:00") : "a definir pelo professor"}</div>
                  {s.reg.retorno && <div style={{ marginTop: 8, padding: "6px 10px", background: "var(--paper)", fontSize: 13 }}><b>Retorno do professor:</b> {s.reg.retorno}</div>}
                  {(s.cod === "liberada" || s.cod === "ajustar") && (
                    <div className="no-print" style={{ marginTop: 10 }}>
                      <button className="btn green" onClick={() => entregar(e.id)}>{s.cod === "ajustar" ? "Reenviar ao professor" : "Marcar como entregue"}</button>
                    </div>
                  )}
                  {s.cod === "entregue" && <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 6 }}>Entregue em {fmtData(rot.entregas[e.id])}.</div>}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          <button className="btn green no-print" style={{ marginBottom: 12 }} onClick={() => window.print()}>Imprimir ou salvar em PDF</button>
          <div className="panel"><div className="panel-body">
            <h3 style={{ marginTop: 0 }}>ROTEIRO DO ALUNO · Projeto Interdisciplinar 2026.2</h3>
            <p>Aluno(a): <b>{nomeAluno || "______________________"}</b> &nbsp; Turma: ________</p>
            {lista.map((e, i) => (
              <div key={e.id} style={{ marginBottom: 10, breakInside: "avoid" }}>
                <b>{i + 1}. {e.titulo}</b> · prazo {e.prazo ? fmtData(e.prazo + "T12:00:00") : "____/____/2026"}<br />
                O que fazer: {e.descricao}<br />
                O que entregar: {e.entrega}<br />
                Visto do professor: ______ &nbsp; Nota (0,0 a 10,0): ______
              </div>
            ))}
            <small>Cada etapa só abre depois da análise do professor. Dúvidas: use o Suporte da plataforma.</small>
          </div></div>
        </>
      )}
    </>
  );
}
