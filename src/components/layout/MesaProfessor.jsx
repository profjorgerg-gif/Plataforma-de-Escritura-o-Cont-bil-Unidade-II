import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Mesa do professor (2026-10-16): menus no topo + janelas flutuantes + barra de tarefas.
// Só organiza a tela: cada janela mostra a MESMA tela que o menu lateral já mostra. Nada é gravado aqui.
const CSS = `
[data-tema="escuro"] .mesa{--m-desk-c:#0E1217;--m-grid-c:#171D25;--m-tit1:#0F2E25;--m-tit2:#1C5442}
[data-tema="escuro"] .mesa-dd button:hover,[data-tema="escuro"] .mesa-task .home{color:#E6E9EC}
.mesa{--m-tit1:#163F33;--m-tit2:#1F5C4A;--m-desk:var(--m-desk-c,#E6E0D0);--m-grid:var(--m-grid-c,#DCD5C2);position:fixed;inset:0;display:flex;flex-direction:column;background:var(--m-desk);z-index:50;font-size:14px}
.mesa-bar{display:flex;align-items:stretch;background:var(--paper-deep,#EFE9DA);border-bottom:1px solid var(--line-strong,#C3B79E);height:36px;flex:none;position:relative;z-index:60;user-select:none}
.mesa-brand{display:flex;align-items:center;padding:0 12px;font-weight:700;color:var(--green-dark,#163F33);white-space:nowrap}
.mesa-mn{position:relative}
.mesa-mn>button{height:100%;white-space:nowrap;padding:0 10px;background:none;border:0;cursor:pointer;color:var(--ink,#1E2A38);font:inherit}
.mesa-mn>button:hover,.mesa-mn.open>button{background:var(--green-pale,#E4EEE9)}
.mesa-dd{display:none;position:absolute;top:100%;left:0;min-width:250px;background:var(--surface,#fff);border:1px solid var(--line-strong,#C3B79E);box-shadow:0 8px 24px rgba(0,0,0,.2);padding:4px 0;z-index:70}
.mesa-mn.open .mesa-dd{display:block}
.mesa-dd button{display:flex;justify-content:space-between;gap:14px;width:100%;text-align:left;background:none;border:0;padding:6px 14px;cursor:pointer;font:inherit;color:var(--ink,#1E2A38)}
.mesa-dd button:hover{background:var(--green-dark,#163F33);color:#fff}
.mesa-cab{padding:7px 14px 3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft,#5B6672);border-top:1px solid var(--line,#D9CFBB);margin-top:3px}.mesa-cab:first-child{border-top:0;margin-top:0}
.mesa-dd hr{border:0;border-top:1px solid var(--line,#D9CFBB);margin:4px 0}
.mesa-dd small{color:#b7791f;font-size:11px}.mesa-dd button:hover small{color:#f3d9a4}
.mesa-bg{display:inline-block;background:var(--red,#8C2F2F);color:#fff;font-size:11px;font-weight:700;padding:0 6px;margin-left:5px;min-width:18px;text-align:center;border-radius:9px}
.mesa-novo{font-size:10px;font-weight:700;color:var(--amber,#9C6B1F);text-transform:uppercase;margin-left:3px}
.mesa-sp{flex:1}
.mesa-info{display:flex;align-items:center;gap:8px;padding:0 10px;color:var(--ink-soft,#5B6672);white-space:nowrap}
.mesa-info button{background:none;border:1px solid var(--line-strong,#C3B79E);padding:3px 9px;cursor:pointer;font:inherit;color:inherit}
.mesa-info button:hover{background:var(--green-pale,#E4EEE9)}
.mesa-desk{position:relative;flex:1;min-height:0;overflow:hidden;background:linear-gradient(var(--m-grid) 1px,transparent 1px) 0 0/32px 32px,linear-gradient(90deg,var(--m-grid) 1px,transparent 1px) 0 0/32px 32px}
.mesa-win{position:absolute;display:flex;flex-direction:column;background:var(--paper,#F6F2E9);border:1px solid var(--line-strong,#C3B79E);box-shadow:0 8px 28px rgba(15,30,25,.28);min-width:300px;min-height:160px;overflow:hidden}
.mesa-win.max{inset:0!important;width:auto!important;height:auto!important}.mesa-win.max .rz{display:none}.mesa-win.min{display:none}
.mesa-wt{display:flex;align-items:center;gap:6px;background:linear-gradient(var(--m-tit2),var(--m-tit1));color:#fff;padding:0 4px 0 10px;height:30px;flex:none;cursor:move;user-select:none;touch-action:none}
.mesa-win:not(.on) .mesa-wt{filter:saturate(.3) brightness(1.15)}
.mesa-wt .tt{flex:1;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mesa-wt button{width:26px;height:22px;border:0;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;font:inherit}
.mesa-wt button:hover{background:rgba(255,255,255,.32)}.mesa-wt button.x:hover{background:#b3402f}
.mesa-wb{flex:1;overflow:auto;padding:16px 18px;container-type:inline-size}
.mesa-wb .screen-title{margin-top:0}
.rz{position:absolute;z-index:3;touch-action:none}
.rz[data-d=n]{top:0;left:10px;right:10px;height:5px;cursor:ns-resize}.rz[data-d=s]{bottom:0;left:10px;right:10px;height:6px;cursor:ns-resize}
.rz[data-d=e]{right:0;top:30px;bottom:10px;width:6px;cursor:ew-resize}.rz[data-d=w]{left:0;top:30px;bottom:10px;width:6px;cursor:ew-resize}
.rz[data-d=se]{right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 55%,#8B8477 55% 62%,transparent 62% 72%,#8B8477 72% 79%,transparent 79%)}
.rz[data-d=sw]{left:0;bottom:0;width:12px;height:12px;cursor:nesw-resize}.rz[data-d=ne]{right:0;top:0;width:12px;height:6px;cursor:nesw-resize}.rz[data-d=nw]{left:0;top:0;width:12px;height:6px;cursor:nwse-resize}
.mesa-snap{position:absolute;background:#1F5C4A;opacity:.16;border:2px solid #1F5C4A;z-index:55;pointer-events:none}
.mesa-task{flex:none;display:flex;gap:4px;align-items:center;background:var(--paper-deep,#EFE9DA);border-top:1px solid var(--line-strong,#C3B79E);padding:4px 6px;min-height:36px;overflow-x:auto}
.mesa-task button{background:var(--surface,#fff);border:1px solid var(--line-strong,#C3B79E);padding:3px 10px;cursor:pointer;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;font:inherit;color:var(--ink,#1E2A38)}
.mesa-task button.on{border-color:var(--green,#1F5C4A);box-shadow:inset 0 -3px 0 var(--green,#1F5C4A)}.mesa-task button.m{opacity:.6}
.mesa-task .home{font-weight:600;background:var(--green-dark,#163F33);color:#fff;border-color:var(--green-dark,#163F33)}
.mesa-task .st{margin-left:auto;color:var(--ink-faint,#8B8477);white-space:nowrap;padding-right:6px;font-size:12px}
@media(max-width:1500px){.mesa-info .nome{display:none}}
@media(max-width:1500px){.mesa-brand{display:none}}
@media(max-width:760px){.mesa-win{inset:0!important;width:auto!important;height:auto!important}.rz,.mesa-wt .sn{display:none}.mesa-wt{cursor:default}.mesa-info{display:none}}
@media print{.mesa-bar,.mesa-task,.mesa-wt,.rz{display:none!important}.mesa,.mesa-desk,.mesa-win,.mesa-wb{position:static!important;overflow:visible!important;box-shadow:none!important;border:0!important;width:auto!important;height:auto!important}.mesa-win.min{display:none!important}}
`;

function Aviso({ aviso, texto, limpar }) {
  useEffect(() => { const t = setTimeout(limpar, 3500); return () => clearTimeout(t); }, [aviso.n]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div role="status" style={{ position: "absolute", left: "50%", bottom: 16, transform: "translateX(-50%)", background: "#1E2A38", color: "#fff", padding: "8px 16px", boxShadow: "0 6px 20px rgba(0,0,0,.3)", zIndex: 6000, maxWidth: "90%" }}>{texto}</div>;
}

function Menu({ menu, abrir, extras }) {
  const [aberto, setAberto] = useState(-1);
  useEffect(() => {
    const f = (e) => { if (!e.target.closest(".mesa-mn")) setAberto(-1); };
    document.addEventListener("pointerdown", f);
    return () => document.removeEventListener("pointerdown", f);
  }, []);
  const grupos = [...menu, ...extras];
  return (
    <>
      {grupos.map((g, gi) => {
        const bg = g.badge > 0 ? <span className="mesa-bg">{g.badge}</span> : null;
        if (g.key) return (
          <div className="mesa-mn" key={gi}><button onClick={() => { setAberto(-1); abrir(g.key); }}>{g.label}{g.novo && <span className="mesa-novo">novo</span>}{bg}</button></div>
        );
        return (
          <div className={"mesa-mn" + (aberto === gi ? " open" : "")} key={gi} onMouseEnter={() => { if (aberto >= 0) setAberto(gi); }}>
            <button onClick={() => setAberto(aberto === gi ? -1 : gi)}>{g.label}</button>
            <div className="mesa-dd" style={g.direita ? { left: "auto", right: 0 } : undefined}>
              {g.itens.map((it, ii) => it === null ? <hr key={ii} /> : it.cab ? <div key={ii} className="mesa-cab">{it.label}</div> : (
                <button key={ii} style={it.recuo ? { paddingLeft: 28 } : undefined} onClick={() => { setAberto(-1); if (it.acao) it.acao(); else abrir(it.key); }}>
                  <span>{it.bloq ? "🔒 " : ""}{it.label}</span>
                  <span>{it.aviso && <small>{it.aviso}</small>}{it.badge > 0 && <span className="mesa-bg">{it.badge}</span>}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function MesaProfessor({ menu, mesa, renderTela, tituloDe, turmaNome, resumo, acoes, brand = "Mesa do Professor", homeChave = "painel-turma", homeLabel = "🏫 Painel", atalho = { chave: "inicio", label: "Sala de aula" }, textoAviso = null, extrasMenu = null }) {
  const deskRef = useRef(null);
  const snapRef = useRef(null);
  useLayoutEffect(() => {
    const medir = () => { if (deskRef.current) mesa.definirArea(deskRef.current.clientWidth, deskRef.current.clientHeight); };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { janelas } = mesa;
  const topo = [...janelas].filter((j) => !j.min).sort((a, b) => b.z - a.z)[0];

  function zona(e) {
    const r = deskRef.current.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (y < 0) return null;
    if (x < 10) return "esq";
    if (x > r.width - 10) return "dir";
    if (y < 6) return "max";
    return null;
  }
  function mostrarSnap(z) {
    const s = snapRef.current; if (!s) return;
    if (!z) { s.style.display = "none"; return; }
    const W = deskRef.current.clientWidth, H = deskRef.current.clientHeight;
    Object.assign(s.style, { display: "block", top: "0", height: H + "px", left: z === "dir" ? W / 2 + "px" : "0", width: (z === "max" ? W : W / 2) + "px" });
  }
  function arrastar(e, j) {
    if (e.target.closest("button") || j.max || window.innerWidth <= 760) return;
    const el = e.currentTarget.closest(".mesa-win"), t = e.currentTarget;
    const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop, D = deskRef.current;
    t.setPointerCapture(e.pointerId); mesa.focar(j.chave);
    const mv = (ev) => {
      mostrarSnap(zona(ev));
      el.style.left = Math.max(-el.offsetWidth + 80, Math.min(D.clientWidth - 80, ox + ev.clientX - sx)) + "px";
      el.style.top = Math.max(0, Math.min(D.clientHeight - 30, oy + ev.clientY - sy)) + "px";
    };
    const up = (ev) => {
      t.removeEventListener("pointermove", mv); t.removeEventListener("pointerup", up);
      const z = zona(ev); mostrarSnap(null);
      if (z) mesa.encaixar(j.chave, z); else mesa.geometria(j.chave, { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    t.addEventListener("pointermove", mv); t.addEventListener("pointerup", up);
  }
  function redimensionar(e, j, d) {
    e.preventDefault(); e.stopPropagation();
    const h = e.currentTarget, el = h.closest(".mesa-win");
    const sx = e.clientX, sy = e.clientY, L = el.offsetLeft, T = el.offsetTop, W = el.offsetWidth, H = el.offsetHeight;
    h.setPointerCapture(e.pointerId); mesa.focar(j.chave);
    const mv = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy; let l = L, t = T, w = W, hh = H;
      if (d.includes("e")) w = Math.max(300, W + dx);
      if (d.includes("s")) hh = Math.max(160, H + dy);
      if (d.includes("w")) { w = Math.max(300, W - dx); l = L + W - w; }
      if (d.includes("n")) { hh = Math.max(160, H - dy); t = T + H - hh; }
      Object.assign(el.style, { left: l + "px", top: Math.max(0, t) + "px", width: w + "px", height: hh + "px" });
    };
    const up = () => {
      h.removeEventListener("pointermove", mv); h.removeEventListener("pointerup", up);
      mesa.geometria(j.chave, { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up);
  }

  const extras = [
    { label: "Janela", itens: [
      { label: "Organizar em cascata", acao: () => mesa.organizar("cascata") },
      { label: "Organizar lado a lado", acao: () => mesa.organizar("lado") },
      { label: "Minimizar todas", acao: () => mesa.minimizarTodas() },
      { label: "Fechar todas (menos a inicial)", acao: () => mesa.fecharTodas() },
    ] },
    { label: "Ajuda", direita: true, itens: [
      { label: "Voltar ao menu lateral", acao: acoes.voltarClassico },
      { label: acoes.rotuloBackup || "Baixar backup da turma", acao: acoes.backup },
    ] },
  ];

  return (
    <div className="mesa" role="application" aria-label="Mesa do professor">
      <style>{CSS}</style>
      <div className="mesa-bar" role="menubar">
        <div className="mesa-brand">{brand}</div>
        <Menu menu={menu} abrir={(k) => mesa.abrir(k)} extras={extrasMenu || extras} />
        <div className="mesa-sp" />
        <div className="mesa-info">
          <span className="nome">{turmaNome}</span>
          {acoes.tema && <button onClick={acoes.tema.alternar} title="Trocar entre modo claro e escuro">{acoes.tema.tema === "escuro" ? "☀️ Claro" : "🌙 Escuro"}</button>}
          <button onClick={acoes.voltarClassico} title="Voltar ao menu lateral de antes (para imprimir, por exemplo)">☰ Menu lateral</button>
          <button onClick={acoes.sair}>{acoes.rotuloSair || "Sair"}</button>
        </div>
      </div>
      <div className="mesa-desk" ref={deskRef}>
        {janelas.map((j) => {
          const on = topo && topo.chave === j.chave;
          return (
            <div key={j.chave} className={"mesa-win" + (on ? " on" : "") + (j.max ? " max" : "") + (j.min ? " min" : "")} role="dialog" aria-label={tituloDe(j.chave, j.foco)}
              style={{ left: j.x, top: j.y, width: j.w, height: j.h, zIndex: j.z }} onPointerDown={() => { if (!on) mesa.focar(j.chave); }}>
              <div className="mesa-wt" onPointerDown={(e) => arrastar(e, j)} onDoubleClick={(e) => { if (!e.target.closest("button")) mesa.alternarMax(j.chave); }}>
                <span className="tt">{tituloDe(j.chave, j.foco)}</span>
                <button className="sn" title="Encaixar na metade esquerda" aria-label="Encaixar à esquerda" onClick={() => mesa.encaixar(j.chave, "esq")}>◧</button>
                <button className="sn" title="Encaixar na metade direita" aria-label="Encaixar à direita" onClick={() => mesa.encaixar(j.chave, "dir")}>◨</button>
                <button title="Minimizar" aria-label="Minimizar" onClick={() => mesa.minimizar(j.chave)}>–</button>
                <button title="Maximizar" aria-label="Maximizar" onClick={() => mesa.alternarMax(j.chave)}>▢</button>
                <button className="x" title="Fechar" aria-label="Fechar" onClick={() => mesa.fechar(j.chave)}>✕</button>
              </div>
              <div className="mesa-wb">{renderTela(j.chave, j.foco)}</div>
              {["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((d) => <i key={d} className="rz" data-d={d} onPointerDown={(e) => redimensionar(e, j, d)} />)}
            </div>
          );
        })}
        {mesa.aviso && textoAviso && <Aviso aviso={mesa.aviso} texto={textoAviso(mesa.aviso.chave)} limpar={mesa.limparAviso} />}
        <div className="mesa-snap" ref={snapRef} style={{ display: "none" }} />
        {janelas.length === 0 && <div style={{ padding: 40, color: "var(--ink-soft,#5B6672)" }}>Nenhuma janela aberta. Use o menu no topo ou o botão “🏫 Painel” na barra de baixo.</div>}
      </div>
      <div className="mesa-task">
        <button className="home" onClick={() => mesa.abrir(homeChave, null, { avisar: false })} title="Voltar ao início">{homeLabel}</button>
        {atalho && <button onClick={() => mesa.abrir(atalho.chave, null, { avisar: false })} title={atalho.label}>{atalho.label}</button>}
        {janelas.filter((j) => j.chave !== homeChave && (!atalho || j.chave !== atalho.chave)).map((j) => (
          <button key={j.chave} className={(topo && topo.chave === j.chave ? "on" : "") + (j.min ? " m" : "")} onClick={() => (topo && topo.chave === j.chave ? mesa.minimizar(j.chave) : mesa.focar(j.chave))}>{tituloDe(j.chave, j.foco)}</button>
        ))}
        <span className="st">{resumo}</span>
      </div>
    </div>
  );
}
