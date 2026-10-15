import { useMemo, useState } from "react";
import { etapasEfetivas } from "../../lib/roteiro.js";
import { useRoteiroTurma } from "../../hooks/useRoteiro.js";
import { ETAPAS } from "../../lib/avaliacao.js";

// Descrições para o sistema da escola (2026-10-15). Adaptado do "Kit Descrições para Sistema da Escola" (PPF).
// Gera, para cada etapa do Projeto, o texto de "Descrição/Assunto" e a data de entrega, para colar em
// Professor On-line → Nova Avaliação. SÓ LEITURA: lê os prazos de "Etapas e prazos"; não grava nada.

const DISC = { f1: "CI", fp: "CA", ca: "CA", resc: "CA", agb: "AGB", comp: "AGB" };
const NOME_DISC = { CI: "Contabilidade Intermediária", CA: "Contabilidade Avançada", AGB: "Análise Gerencial de Balanços" };

const dataBR = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; };
function conteudoDe(e) {
  const t = String(e.descricao || "").replace(/\s*\([^)]*\)/g, "").trim().replace(/[.;]+$/, "");
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : "";
}
export function textoDaEtapa(e, n) {
  const data = dataBR(e.prazo);
  return [
    "PROJETO INTERDISCIPLINAR CI–CA–AGB – Etapa " + n + " · " + e.titulo + ".",
    conteudoDe(e) ? "Conteúdo: " + conteudoDe(e) + "." : "",
    "Lançamento na plataforma digital de escrituração contábil.",
    data ? "Entrega até " + data + "." : "Data de entrega a definir em Etapas e prazos.",
    "Avaliação de 0 a 10.",
  ].filter(Boolean).join(" ");
}

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch (e) {
    try {
      const ta = document.createElement("textarea"); ta.value = texto; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); document.body.removeChild(ta); return ok;
    } catch (e2) { return false; }
  }
}

export default function DescricoesEscola({ turma }) {
  const turmaId = turma ? turma.id : null;
  const config = useRoteiroTurma(turmaId);
  const etapas = useMemo(() => etapasEfetivas(config || null), [config]);
  const [periodo, setPeriodo] = useState("1ª AVALIAÇÃO");
  const [tipo, setTipo] = useState("Projeto");
  const [aviso, setAviso] = useState("");

  const itens = etapas.map((e) => {
    const n = ETAPAS.findIndex((x) => x.id === e.id) + 1;
    return { id: e.id, disc: DISC[e.id] || "CI", titulo: "Etapa " + n + " · " + e.titulo, data: dataBR(e.prazo), aulas: e.aulas, texto: textoDaEtapa(e, n) };
  });

  async function cp(texto, msg) {
    const ok = await copiar(texto);
    setAviso(ok ? msg : "Não foi possível copiar neste navegador. Selecione o texto e copie com Ctrl+C.");
    setTimeout(() => setAviso(""), 2500);
  }
  const tudo = () => ["CI", "CA", "AGB"].map((d) => itens.filter((i) => i.disc === d).map((i) =>
    d + " — " + i.titulo + " — Período: " + periodo + " — Tipo: " + tipo + " — Data: " + (i.data || "a definir") + " — Aulas: " + i.aulas + "\n" + i.texto).join("\n\n")).filter(Boolean).join("\n\n");

  return (
    <>
      <div className="screen-eyebrow">materiais</div>
      <h2 className="screen-title">Descrições para a escola</h2>
      <p className="screen-sub">Textos prontos para colar em Professor On-line → Nova Avaliação (campo Descrição/Assunto), um por etapa. Data e aulas vêm de “Etapas e prazos”. Só leitura: nada é gravado.</p>
      {!turmaId && <div className="balance-check" style={{ marginBottom: 10 }}>Escolha uma turma em “Turmas”: sem ela, aparecem os prazos padrão.</div>}
      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="panel-body" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>Período
            <input value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={{ padding: "6px 8px", border: "1px solid var(--line-strong,#c9c4b4)", font: "inherit", width: 170 }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>Tipo
            <input value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ padding: "6px 8px", border: "1px solid var(--line-strong,#c9c4b4)", font: "inherit", width: 140 }} /></label>
          <button type="button" className="btn" onClick={() => cp(tudo(), "Tudo copiado!")}>Copiar tudo</button>
          {aviso && <span role="status" style={{ fontSize: 13.5, color: "var(--green,#1f5c4a)" }}>{aviso}</span>}
        </div>
      </div>
      {["CI", "CA", "AGB"].map((d) => {
        const lista = itens.filter((i) => i.disc === d);
        if (!lista.length) return null;
        return (
          <div className="panel" key={d} style={{ marginBottom: 12 }}>
            <div className="panel-head"><h3 style={{ margin: 0 }}>{d} · {NOME_DISC[d]}</h3></div>
            <div className="panel-body" style={{ overflowX: "auto" }}>
              <table className="tabela" style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontSize: 13.5 }}>
                <thead><tr style={{ textAlign: "left" }}><th>Atividade</th><th>Data</th><th>Aulas</th><th>Descrição / Assunto</th><th /></tr></thead>
                <tbody>
                  {lista.map((i) => (
                    <tr key={i.id} style={{ borderTop: "1px solid var(--line,#d8d0bd)", verticalAlign: "top" }}>
                      <td style={{ padding: "8px 6px", fontWeight: 700 }}>{i.titulo}</td>
                      <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{i.data || "a definir"}</td>
                      <td style={{ padding: "8px 6px" }}>{i.aulas}</td>
                      <td style={{ padding: "8px 6px", fontSize: 12.5, minWidth: 320 }}>{i.texto}</td>
                      <td style={{ padding: "8px 6px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          <button type="button" className="btn" onClick={() => cp(i.texto, "Texto copiado!")}>Copiar texto</button>
                          <button type="button" className="btn secondary" disabled={!i.data} onClick={() => cp(i.data, "Data copiada!")}>Copiar data</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
