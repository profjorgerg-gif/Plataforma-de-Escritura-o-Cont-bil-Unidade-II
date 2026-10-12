import { useState } from "react";
import { BLOCOS_TESTE, PASSOS_TESTE, proximoPasso } from "../../lib/roteiroTestes.js";

// Roteiro de testes do Projeto Interdisciplinar (modo de teste). Só LEITURA e navegação.
// Cada passo tem um botão que abre a tela certa (como professor ou como a conta de teste, trocando o modo sozinho).
// O progresso fica só no navegador (hooks/useProgressoTestes.js).

export function FaixaTeste({ passo, emTeste, onConcluir, onVoltar }) {
  if (!passo) return null;
  const como = passo.quem === "aluno" ? "como aluno de teste" : passo.quem === "prof" ? "como professor" : "";
  return (
    <div className="no-print" style={{ background: "#FBF4E2", border: "1px solid #C9A24A", borderRadius: 6, padding: "10px 14px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#8A5A10", letterSpacing: "0.04em" }}>
        🧪 ROTEIRO DE TESTES · passo {passo.id} de {PASSOS_TESTE.length} {como && "· " + como}{passo.quem === "aluno" && !emTeste ? " (entre na conta de teste)" : ""}
      </div>
      <div style={{ margin: "4px 0", fontSize: 14 }}>{passo.fazer}</div>
      <div style={{ fontSize: 13, color: "#1F5C4A", marginBottom: 8 }}><b>Esperado:</b> {passo.esperado}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn green" onClick={onConcluir}>✓ Concluído · voltar ao roteiro</button>
        <button className="btn secondary" onClick={onVoltar}>Voltar sem concluir</button>
      </div>
    </div>
  );
}

export default function RoteiroTestes({ turma, feitos, passoAtivo, emTeste, temContaTeste, onIr, onMarcar, onLimpar }) {
  const [confirmaLimpar, setConfirmaLimpar] = useState(false);
  const total = PASSOS_TESTE.length;
  const concluidos = PASSOS_TESTE.filter((p) => feitos[p.id]).length;
  const proximo = proximoPasso(feitos);
  const nome = (turma && turma.nome) || "";
  const turmaDeTeste = /teste/i.test(nome);

  function botao(p) {
    if (!p.quem) return null;
    const semConta = p.quem === "aluno" && !emTeste && !temContaTeste;
    const rotulo = p.quem === "aluno" ? "Abrir como aluno de teste →" : "Abrir como professor →";
    return (
      <button className={"btn" + (proximo && proximo.id === p.id ? "" : " secondary")} style={{ padding: "3px 12px", fontSize: 12.5 }} disabled={semConta} onClick={() => onIr(p)} title={semConta ? "Crie a conta de teste primeiro (passo 1.4)" : undefined}>
        {rotulo}
      </button>
    );
  }

  return (
    <>
      <div className="screen-eyebrow">modo de teste</div>
      <h2 className="screen-title">Roteiro de testes do Projeto Interdisciplinar</h2>
      <p className="screen-sub">Clique no botão de cada passo: a plataforma abre a tela certa (como professor ou como a conta de teste). Faça a conferência e use o botão “Concluído” da faixa amarela para voltar aqui e seguir.</p>

      <div className={"balance-check " + (turmaDeTeste ? "ok" : "bad")} style={{ marginBottom: 14 }}>
        {turma
          ? turmaDeTeste
            ? <>Turma selecionada: <b>{nome}</b>. Os testes não aparecem para alunos reais.</>
            : <>⚠ A turma selecionada é <b>{nome}</b>. Faça os testes numa turma <b>TESTE</b> (passos 1.2 a 1.4), para que prazos, listas e liberações não apareçam para os alunos reais. Os passos 3.x só olham, sem alterar nada.</>
          : <>Nenhuma turma selecionada. Crie ou selecione uma em “Turmas” (passo 1.2).</>}
      </div>

      <div className="panel">
        <div className="panel-body" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}><b>{concluidos}</b> de {total} passos concluídos</div>
            <div style={{ height: 8, background: "#E5E0D0", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: (total ? concluidos * 100 / total : 0) + "%", background: "#1F5C4A" }} /></div>
          </div>
          {proximo && <button className="btn" onClick={() => (proximo.quem ? onIr(proximo) : onMarcar(proximo.id, true))} disabled={proximo.quem === "aluno" && !emTeste && !temContaTeste}>
            {proximo.quem ? "Ir para o próximo passo (" + proximo.id + ") →" : "Marcar o passo " + proximo.id + " como feito"}
          </button>}
          {!proximo && <span className="tag-pill ok">Todos os passos concluídos</span>}
          {confirmaLimpar
            ? <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>Limpar todas as marcações? <button className="btn red" style={{ padding: "2px 10px" }} onClick={() => { onLimpar(); setConfirmaLimpar(false); }}>Limpar</button><button className="btn secondary" style={{ padding: "2px 10px" }} onClick={() => setConfirmaLimpar(false)}>Cancelar</button></span>
            : <button className="btn secondary" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => setConfirmaLimpar(true)}>Limpar marcações</button>}
        </div>
      </div>

      {BLOCOS_TESTE.map((b) => {
        const feitosB = b.passos.filter((p) => feitos[p.id]).length;
        const contemProximo = proximo && b.passos.some((p) => p.id === proximo.id);
        return (
          <details key={b.n} className="panel" open={contemProximo || (passoAtivo && b.passos.some((p) => p.id === passoAtivo.id)) || undefined}>
            <summary className="panel-head" style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <h3>{b.n}. {b.titulo}</h3>
              <span className={"tag-pill " + (feitosB === b.passos.length ? "ok" : feitosB > 0 ? "warn" : "")}>{feitosB} de {b.passos.length}</span>
            </summary>
            <div className="panel-body" style={{ padding: 0 }}>
              {b.sub && <div style={{ padding: "8px 18px", fontSize: 13, color: "var(--ink-soft)", borderBottom: "1px solid var(--line)" }}>{b.sub}</div>}
              {b.passos.map((p) => (
                <div key={p.id} style={{ display: "flex", gap: 12, padding: "10px 18px", borderBottom: "1px solid var(--line)", background: feitos[p.id] ? "var(--green-pale)" : proximo && proximo.id === p.id ? "#FBF4E2" : undefined }}>
                  <input type="checkbox" aria-label={"Passo " + p.id + " concluído"} checked={!!feitos[p.id]} onChange={(e) => onMarcar(p.id, e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14 }}><span className="mono" style={{ color: "var(--ink-faint)", marginRight: 6 }}>{p.id}</span>{p.fazer}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-soft)", margin: "3px 0 6px" }}><b style={{ color: "var(--green)" }}>Esperado:</b> {p.esperado}</div>
                    {botao(p)}
                    {!p.quem && <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>Passo manual: faça e marque a caixa.</span>}
                  </div>
                </div>
              ))}
            </div>
          </details>
        );
      })}
      <div className="helper-note">As marcações ficam só neste navegador (por turma) e não alteram nenhum dado dos alunos.</div>
    </>
  );
}
