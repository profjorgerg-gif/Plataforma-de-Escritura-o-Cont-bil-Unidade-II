import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { etapasEfetivas } from "../../lib/roteiro.js";
import { useRoteiroTurma } from "../../hooks/useRoteiro.js";
import { PLANOS_BASE, PLANO_CHAVES, linhaDatasProjeto, hojeBR } from "../../lib/planosSemestrais.js";
import { IMG_BRASAO, IMG_CEDUP } from "../../lib/planosImagens.js";

// Planos semestrais (2026-10-15): os 3 planos do CEDUP (CI, CA e AGB), com o Projeto Interdisciplinar incluído.
// Cabeçalho e campos iguais aos anexos do professor. Edita, salva por turma e imprime/salva em PDF (A4 paisagem).
// Dado novo: turmas/{t}/roteiro/planos (professor escreve; regras já existentes). Não mexe em nada dos alunos.

const CSS = `
.plano-folha{background:#fff;color:#000;font:10pt/1.45 "Times New Roman",Times,serif;padding:14px 16px;border:1px solid var(--line-strong,#c9c4b4);min-width:980px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.plano-cab{position:relative;text-align:center;min-height:78px;font-size:9.5pt;line-height:1.3}
.plano-cab img.fl{position:absolute;left:14px;top:0;height:72px}.plano-cab img.lg{position:absolute;right:14px;top:0;height:72px}
.plano-tit{text-align:center;font-weight:700;font-size:11pt;color:#001d35;margin:10px 0 6px}
.plano-folha table{border-collapse:collapse;width:100%;table-layout:fixed}
.plano-folha td{border:1px solid #000;padding:5px 7px;vertical-align:top}
.plano-folha td.lb{background:#FBD5B5;font-weight:700}
.plano-folha td p{margin:0 0 5px}.plano-folha td.j p{text-align:justify}
.plano-loc{margin:10px 0 0}
.plano-wrap{overflow-x:auto}
.plano-campos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:10px}
.plano-campos label{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--ink-soft,#555)}
.plano-campos input,.plano-ed textarea{font:inherit;font-size:14px;padding:6px 8px;border:1px solid var(--line-strong,#c9c4b4);background:#fff;width:100%;box-sizing:border-box}
.plano-ed textarea{min-height:110px;font-size:13px;line-height:1.4}
.plano-ed label{display:block;font-size:12px;font-weight:700;margin:10px 0 3px}
@media print{
  .plano-wrap{overflow:visible}
  .plano-folha{border:none;min-width:0;padding:0}
}
`;

function useFolhaPaisagem() {
  useEffect(() => {
    const st = document.createElement("style");
    st.setAttribute("data-planos", "1");
    st.textContent = "@page{size:A4 landscape;margin:10mm;}";
    document.head.appendChild(st);
    return () => { if (st.parentNode) st.parentNode.removeChild(st); };
  }, []);
}

function Md({ t }) {
  const partes = String(t).split(/\*\*(.+?)\*\*/g);
  return partes.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p));
}
const Paras = ({ texto }) => String(texto || "").split("\n").filter((l) => l.trim()).map((l, i) => <p key={i}><Md t={l} /></p>);

function Folha({ plano, ano, local }) {
  const h = plano.hdr;
  return (
    <div className="plano-folha">
      <div className="plano-cab">
        <img className="fl" src={IMG_BRASAO} alt="" /><img className="lg" src={IMG_CEDUP} alt="" />
        <div>
          <b>ESTADO DE SANTA CATARINA</b><br /><b>SECRETARIA DE ESTADO DA EDUCAÇÃO</b><br /><b>CRE – COORDENADORIA REGIONAL DE EDUCAÇÃO</b><br />
          <b>CEDUP – CENTRO DE EDUCAÇÃO PROFISSIONAL HERMANN HERING</b><br />Rua Benjamin Constant, 857, Escola Agrícola, CEP 89037-501.<br />
          Email: <u style={{ color: "#0563c1" }}>ceduphh@sed.sc.gov.br</u> &nbsp;Fone: 473378-8610
        </div>
      </div>
      <div className="plano-tit">PLANO SEMESTRAL PÓS MÉDIO PERÍODO {ano}</div>
      <table>
        <colgroup><col style={{ width: "20.5%" }} /><col style={{ width: "41%" }} /><col style={{ width: "9.8%" }} /><col style={{ width: "28.7%" }} /></colgroup>
        <tbody>
          <tr><td className="lb">Curso:</td><td>{h.curso}</td><td className="lb">Disciplina:</td><td>{h.disciplina}</td></tr>
          <tr><td className="lb">Módulo:</td><td>{h.modulo}</td><td className="lb">Turma:</td><td>{h.turma}</td></tr>
          <tr><td className="lb">Professor:</td><td>{h.professor}</td><td className="lb">Nº aulas:</td><td>{h.aulas}</td></tr>
          {plano.rows.map((r, i) => r.datas !== undefined ? (
            <tr key={i}><td className="lb">{r.label}</td><td colSpan={2}><Paras texto={r.texto} /></td><td><p><b>{r.datasTitulo}</b></p><Paras texto={r.datas} /></td></tr>
          ) : (
            <tr key={i}><td className="lb">{r.label}</td><td colSpan={3} className="j"><Paras texto={r.texto} /></td></tr>
          ))}
        </tbody>
      </table>
      <p className="plano-loc">{local}</p>
    </div>
  );
}

const clonar = (o) => JSON.parse(JSON.stringify(o));

export default function PlanosSemestrais({ turma }) {
  const turmaId = turma ? turma.id : null;
  const configRoteiro = useRoteiroTurma(turmaId);
  const etapas = useMemo(() => etapasEfetivas(configRoteiro || null), [configRoteiro]);
  const [aba, setAba] = useState("ci");
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [local, setLocal] = useState("Blumenau, " + hojeBR() + ".");
  const [planos, setPlanos] = useState(() => clonar(PLANOS_BASE));
  const [msg, setMsg] = useState("");
  const [carregado, setCarregado] = useState(false);
  useFolhaPaisagem();

  // carrega o que o professor já salvou nesta turma (por cima do texto-base)
  useEffect(() => {
    let vivo = true;
    setCarregado(false);
    (async () => {
      if (!turmaId) { setCarregado(true); return; }
      try {
        const s = await getDoc(doc(db, "turmas", turmaId, "roteiro", "planos"));
        if (!vivo) return;
        if (s.exists()) {
          const d = s.data();
          if (d.ano) setAno(String(d.ano));
          if (d.local) setLocal(d.local);
          const novo = clonar(PLANOS_BASE);
          PLANO_CHAVES.forEach((k) => {
            const sv = (d.planos || {})[k]; if (!sv) return;
            if (sv.hdr) novo[k].hdr = { ...novo[k].hdr, ...sv.hdr };
            novo[k].rows.forEach((r, i) => {
              const x = (sv.rows || {})["r" + i]; if (!x) return;
              if (typeof x.texto === "string") r.texto = x.texto;
              if (typeof x.datas === "string") r.datas = x.datas;
            });
          });
          setPlanos(novo);
        }
      } catch (e) { setMsg("Não foi possível carregar o que estava salvo; mostrando o texto-base."); }
      if (vivo) setCarregado(true);
    })();
    return () => { vivo = false; };
  }, [turmaId]);

  const plano = planos[aba];
  const setHdr = (campo, v) => setPlanos((p) => ({ ...p, [aba]: { ...p[aba], hdr: { ...p[aba].hdr, [campo]: v } } }));
  const setRow = (i, campo, v) => setPlanos((p) => {
    const c = clonar(p); c[aba].rows[i][campo] = v; return c;
  });

  function preencherDatas() {
    setPlanos((p) => {
      const c = clonar(p);
      const r = c[aba].rows.find((x) => x.datas !== undefined);
      const linhas = r.datas.split("\n");
      linhas[linhas.length - 1] = linhaDatasProjeto(aba, etapas);
      r.datas = linhas.join("\n");
      return c;
    });
    setMsg("Datas do Projeto preenchidas com os prazos de “Etapas e prazos”. Lembre de salvar.");
  }
  function voltarBase() {
    if (!window.confirm("Voltar ao texto-base deste plano? As suas edições deste plano (não as dos outros) serão perdidas na tela até você salvar de novo.")) return;
    setPlanos((p) => ({ ...p, [aba]: clonar(PLANOS_BASE[aba]) }));
    setMsg("Texto-base restaurado neste plano. Salve para gravar.");
  }
  async function salvar() {
    if (!turmaId) { setMsg("Escolha uma turma para salvar."); return; }
    try {
      const out = {};
      PLANO_CHAVES.forEach((k) => {
        const rows = {};
        planos[k].rows.forEach((r, i) => { rows["r" + i] = r.datas !== undefined ? { texto: r.texto, datas: r.datas } : { texto: r.texto }; });
        out[k] = { hdr: planos[k].hdr, rows };
      });
      await setDoc(doc(db, "turmas", turmaId, "roteiro", "planos"), { ano, local, planos: out, atualizadoEm: new Date().toISOString() });
      setMsg("Salvo nesta turma.");
    } catch (e) { setMsg("Não foi possível salvar agora. Tente de novo."); }
  }
  function imprimir() {
    const antes = document.title;
    document.title = "Plano Semestral " + (plano.hdr.disciplina || "") + " " + ano;
    window.print();
    setTimeout(() => { document.title = antes; }, 1500);
  }

  const rotulo = { ci: "Contabilidade Intermediária", ca: "Contabilidade Avançada", agb: "Análise Gerencial de Balanços" };
  return (
    <>
      <style>{CSS}</style>
      <div className="screen-eyebrow no-print">materiais</div>
      <h2 className="screen-title no-print">Planos semestrais</h2>
      <p className="screen-sub no-print">Os três planos do CEDUP (CI, CA e AGB), com o Projeto Interdisciplinar incluído. Ajuste o que precisar, salve e use “Imprimir / Salvar PDF” para anexar no sistema da escola.</p>
      {!turmaId && <div className="balance-check no-print" style={{ marginBottom: 10 }}>Escolha uma turma em “Turmas” para poder salvar as edições e puxar os prazos.</div>}
      <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {PLANO_CHAVES.map((k) => (
          <button key={k} type="button" className={"btn" + (aba === k ? "" : " secondary")} onClick={() => setAba(k)}>{rotulo[k]}</button>
        ))}
      </div>
      <div className="panel no-print" style={{ marginBottom: 12 }}>
        <div className="panel-body">
          <div className="plano-campos">
            <label>Período (ano)<input value={ano} onChange={(e) => setAno(e.target.value)} /></label>
            <label>Módulo<input value={plano.hdr.modulo} onChange={(e) => setHdr("modulo", e.target.value)} /></label>
            <label>Turma<input value={plano.hdr.turma} onChange={(e) => setHdr("turma", e.target.value)} /></label>
            <label>Nº aulas<input value={plano.hdr.aulas} onChange={(e) => setHdr("aulas", e.target.value)} /></label>
            <label>Professor<input value={plano.hdr.professor} onChange={(e) => setHdr("professor", e.target.value)} /></label>
            <label>Local e data<input value={local} onChange={(e) => setLocal(e.target.value)} /></label>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="btn secondary" onClick={preencherDatas}>Preencher datas com Etapas e prazos</button>
            <button type="button" className="btn secondary" onClick={voltarBase}>Voltar ao texto-base</button>
            <button type="button" className="btn" onClick={salvar} disabled={!turmaId || !carregado}>Salvar</button>
            <button type="button" className="btn" onClick={imprimir}>🖨️ Imprimir / Salvar PDF</button>
            {msg && <span style={{ fontSize: 13.5, color: "var(--green, #1f5c4a)" }} role="status">{msg}</span>}
          </div>
          <details className="plano-ed" style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Editar os textos dos campos</summary>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft, #555)", margin: "6px 0 0" }}>Cada linha vira um parágrafo. Para negrito, coloque o trecho entre dois asteriscos: **assim**. Os títulos dos campos não mudam.</p>
            {plano.rows.map((r, i) => (
              <div key={aba + i}>
                <label>{r.label}</label>
                <textarea value={r.texto} onChange={(e) => setRow(i, "texto", e.target.value)} />
                {r.datas !== undefined && (<><label>{r.datasTitulo}</label><textarea value={r.datas} onChange={(e) => setRow(i, "datas", e.target.value)} /></>)}
              </div>
            ))}
          </details>
        </div>
      </div>
      <div className="plano-wrap"><Folha plano={plano} ano={ano} local={local} /></div>
    </>
  );
}
