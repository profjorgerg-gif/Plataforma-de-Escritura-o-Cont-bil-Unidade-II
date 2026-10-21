import { useMemo, useState } from "react";
import JSZip from "jszip";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { QUANTIDADES_PADRAO, PERFIS, gerarPacote, resumoDoPacote, gerarXml, nomeArquivo, formatarCnpj } from "../../lib/orgaoFiscal.js";

// Laboratório 2027.1 (2026-10-20): protótipo SÓ do professor/admin. Não grava nada no banco e não aparece para alunos.
// Preferências ficam apenas neste navegador (localStorage). Fase 1: gerador de notas (aba Professor) + caixa de entrada simulada (aba Aluno).
const CHAVE = "lab2027.prefs";
const brl = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBr = (s) => String(s || "").slice(0, 10).split("-").reverse().join("/");
const ROT = { cancelada: "Cancelada", duplicada: "Duplicada", cfop: "CFOP incompatível", destinatario: "Destinatário errado", ncm: "NCM trocado", tributo: "Tributo errado", total: "Total divergente" };
const DEC = { aprovar: "Aprovar", aprovar_com_ressalva: "Aprovar com ressalva", rejeitar: "Rejeitar" };
const PROB = { padrao: undefined, menos: 8, mais: 2 };

function lerPrefs() { try { return JSON.parse(localStorage.getItem(CHAVE) || "{}") || {}; } catch { return {}; } }
function gravarPrefs(p) { try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* sem armazenamento: segue sem lembrar */ } }
function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo || "text/plain" }));
  const a = document.createElement("a"); a.href = url; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const box = { border: "1px solid var(--line)", background: "var(--surface)", padding: "12px 16px", marginBottom: 12 };
const th = { padding: "5px 8px", border: "1px solid var(--line)", textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em" };
const td = { padding: "5px 8px", border: "1px solid var(--line)", fontSize: 13, verticalAlign: "top" };
const tdn = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const lab = { display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 3 };

function Abas({ itens, atual, onMudar, tamanho }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {itens.map((i) => (
        <button key={i.k} type="button" disabled={i.fut} onClick={() => onMudar(i.k)} className={"btn " + (atual === i.k ? "green" : "secondary")}
          style={{ padding: tamanho === "g" ? "8px 24px" : "5px 12px", fontWeight: 600, opacity: i.fut ? 0.55 : 1, borderStyle: i.fut ? "dashed" : undefined }}>{i.t}</button>
      ))}
    </div>
  );
}

export default function Laboratorio2027({ turma }) {
  const inicial = useMemo(lerPrefs, []);
  const alunos = useAlunosReaisDaTurma(turma?.id);
  const [modo, setModo] = useState("p");
  const [qtd, setQtd] = useState(inicial.qtd || 24);
  const [outra, setOutra] = useState(!QUANTIDADES_PADRAO.includes(inicial.qtd || 24));
  const [perfil, setPerfil] = useState(inicial.perfil || "");
  const [prob, setProb] = useState(inicial.prob || "padrao");
  const [matricula, setMatricula] = useState(inicial.matricula || "20271000001");
  const [pacote, setPacote] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [sel, setSel] = useState(null);
  const [verGab, setVerGab] = useState(false);
  const [lotes, setLotes] = useState(inicial.lotes || 99);
  const [selAluno, setSelAluno] = useState(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  function gerar() {
    setErro("");
    try {
      const q = Math.min(500, Math.max(2, Math.round(Number(qtd) || 24)));
      const o = { quantidade: q };
      if (perfil) o.perfil = perfil;
      if (PROB[prob]) o.nProblemas = Math.max(1, Math.round(q / PROB[prob]));
      const p = gerarPacote(String(matricula).trim() || "20271000001", "2027.1", o);
      setPacote({ ...p, resumo: resumoDoPacote(p.documentos), matricula: String(matricula).trim() || "20271000001" });
      setSel(null); setSelAluno(null); setVerGab(false);
      gravarPrefs({ qtd: q, perfil, prob, matricula, lotes });
    } catch (e) { setErro("Não foi possível gerar: " + (e?.message || e)); }
  }

  async function zipDoAluno() {
    if (!pacote) return;
    setOcupado(true);
    try {
      const z = new JSZip();
      pacote.documentos.forEach((d) => z.file(nomeArquivo(d.id.endsWith("-dup") ? { ...d, numero: d.numero + "_copia" } : d), gerarXml(d)));
      baixar("Notas_" + pacote.matricula + "_" + pacote.documentos.length + ".zip", await z.generateAsync({ type: "blob" }));
    } finally { setOcupado(false); }
  }
  function csv() {
    const l = [["lote", "numero", "data", "direcao", "cfop", "emitente", "destinatario", "total", "problema", "decisao_esperada"]];
    pacote.documentos.forEach((d) => l.push([d.lote, d.numero, dataBr(d.data), d.direcao, d.cfop, d.emitente.nome, d.destinatario.nome, brl(d.valorTotal), d.problema ? ROT[d.problema.tipo] : "", DEC[d.gabarito?.decisao] || ""]));
    baixar("lista_notas_" + pacote.matricula + ".csv", "﻿" + l.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\n"), "text/csv");
  }

  const docs = pacote?.documentos || [];
  const visiveis = docs.filter((d) => !filtro || (filtro === "prob" ? d.problema : d.direcao === filtro));
  const liberadas = docs.filter((d) => d.lote <= lotes);
  const nLotes = pacote?.resumo.lotes || 0;
  const r = pacote?.resumo;
  const notaSel = sel != null ? docs.find((d) => d.id === sel) : null;
  const notaAluno = selAluno != null ? docs.find((d) => d.id === selAluno) : null;

  return (
    <div>
      <div style={{ background: "var(--warn-bg, #fbf0d9)", border: "1px solid var(--warn, #8a5a00)", padding: "7px 12px", fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>
        🧪 Protótipo 2027.1 · não afeta alunos · o que você testa fica só neste navegador
      </div>
      <h2 style={{ margin: "0 0 4px" }}>Laboratório 2027.1</h2>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 10px" }}>Só o professor entra aqui. A aba Professor gera e acompanha as notas; a aba Aluno mostra o que o aluno veria.</p>
      <Abas tamanho="g" atual={modo} onMudar={setModo} itens={[{ k: "p", t: "Professor" }, { k: "a", t: "Aluno" }]} />

      {modo === "p" && (
        <>
          <Abas atual="g" onMudar={() => {}} itens={[{ k: "g", t: "1 · Gerador de notas" }, { k: "c", t: "2 · Caixa de entrada", fut: true }, { k: "f", t: "3 · Conferência fiscal", fut: true }, { k: "e", t: "4 · Eventos e painel", fut: true }]} />
          <div style={box}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
              <div>
                <span style={lab}>Quantidade de notas por aluno</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {QUANTIDADES_PADRAO.map((n) => (
                    <button key={n} type="button" className={"btn " + (!outra && qtd === n ? "green" : "secondary")} style={{ padding: "5px 11px" }} onClick={() => { setOutra(false); setQtd(n); }}>{n}</button>
                  ))}
                  <button type="button" className={"btn " + (outra ? "green" : "secondary")} style={{ padding: "5px 11px" }} onClick={() => setOutra(true)}>Outra</button>
                </div>
              </div>
              {outra && <div><span style={lab}>Digite (2 a 500)</span><input type="number" min={2} max={500} value={qtd} onChange={(e) => setQtd(e.target.value)} style={{ width: 90 }} /></div>}
              <div>
                <span style={lab}>Aluno de exemplo</span>
                <select value={matricula} onChange={(e) => setMatricula(e.target.value)}>
                  <option value="20271000001">Matrícula de teste 20271000001</option>
                  {(alunos || []).map((a) => <option key={a.matricula} value={a.matricula}>{a.nome ? a.nome + " · " : ""}{a.matricula}</option>)}
                </select>
              </div>
              <div>
                <span style={lab}>Perfil da empresa</span>
                <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                  <option value="">Automático (pela matrícula)</option>
                  {Object.entries(PERFIS).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
                </select>
              </div>
              <div>
                <span style={lab}>Notas com problema</span>
                <select value={prob} onChange={(e) => setProb(e.target.value)}>
                  <option value="padrao">1 a cada 4 (padrão)</option><option value="menos">Menos (1 a cada 8)</option><option value="mais">Mais (1 a cada 2)</option>
                </select>
              </div>
              <button type="button" className="btn green" onClick={gerar}>Gerar pacote</button>
            </div>
            {erro && <p style={{ color: "var(--danger, #9c1c1c)", margin: "8px 0 0" }}>{erro}</p>}
          </div>

          {!pacote && <p style={{ color: "var(--muted)" }}>Escolha a quantidade e clique em "Gerar pacote". O mesmo aluno com as mesmas escolhas sempre recebe as mesmas notas.</p>}
          {pacote && (
            <>
              <div style={box}>
                <h3 style={{ margin: "0 0 4px" }}>Empresa do aluno de exemplo</h3>
                <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 8px" }}>{pacote.empresa.perfilNome} · CNPJ {formatarCnpj(pacote.empresa.cnpj)} · empresa fictícia</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
                  {[["Notas", r.total], ["Entradas", r.entradas], ["Saídas", r.saidas], ["Com problema", r.problemas], ["Lotes de 6", r.lotes], ["Entradas válidas", "R$ " + brl(r.valorEntradas)], ["Saídas válidas", "R$ " + brl(r.valorSaidas)]].map(([a, b]) => (
                    <div key={a} style={{ border: "1px solid var(--line)", padding: "7px 10px" }}><b style={{ display: "block", fontSize: 19 }}>{b}</b><span style={{ fontSize: 12, color: "var(--muted)" }}>{a}</span></div>
                  ))}
                </div>
                <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "8px 0 0" }}>Duplicadas entram como arquivos repetidos extras, por isso o total pode passar da quantidade pedida.</p>
              </div>

              <div style={box}>
                <h3 style={{ margin: "0 0 8px" }}>Notas do pacote</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 8 }}>
                  <div><span style={lab}>Filtro</span><select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="">Todas</option><option value="entrada">Entradas</option><option value="saida">Saídas</option><option value="prob">Só com problema</option></select></div>
                  <div><span style={lab}>Lotes liberados ao aluno</span><select value={lotes} onChange={(e) => { setLotes(Number(e.target.value)); gravarPrefs({ ...lerPrefs(), lotes: Number(e.target.value) }); }}>
                    <option value={99}>Todos</option>{Array.from({ length: nLotes }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} lote{n > 1 ? "s" : ""}</option>)}</select></div>
                  <button type="button" className="btn secondary" disabled={ocupado} onClick={zipDoAluno}>Baixar ZIP do aluno (XML)</button>
                  <button type="button" className="btn secondary" onClick={csv}>Exportar lista (CSV)</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Lote</th><th style={th}>Nº</th><th style={th}>Data</th><th style={th}>Tipo</th><th style={th}>CFOP</th><th style={th}>Emitente → destinatário</th><th style={{ ...th, textAlign: "right" }}>Total</th><th style={th}>Problema</th></tr></thead>
                    <tbody>
                      {visiveis.map((d) => (
                        <tr key={d.id} onClick={() => { setSel(d.id); setVerGab(false); }} style={{ cursor: "pointer", background: sel === d.id ? "var(--green-bg, #e3f0ea)" : undefined }}>
                          <td style={td}>{d.lote}</td><td style={td}>{d.numero}</td><td style={td}>{dataBr(d.data)}</td><td style={td}>{d.direcao === "entrada" ? "Entrada" : "Saída"}</td><td style={td}>{d.cfop}</td>
                          <td style={td}>{d.emitente.nome} → {d.destinatario.nome}</td><td style={tdn}>{brl(d.valorTotal)}</td>
                          <td style={td}>{d.problema ? <span style={{ border: "1px solid var(--danger, #9c1c1c)", color: "var(--danger, #9c1c1c)", padding: "0 7px", fontSize: 11.5 }}>{ROT[d.problema.tipo]}{d.problema.original ? " (cópia)" : ""}</span> : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "6px 0 0" }}>Clique numa linha para ver o detalhe, o XML e o gabarito.</p>
              </div>

              {notaSel && (
                <div style={box}>
                  <h3 style={{ margin: "0 0 8px" }}>NF-e {notaSel.numero} · {notaSel.direcao === "entrada" ? "entrada" : "saída"} · lote {notaSel.lote}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead><tr><th style={th}>Item</th><th style={th}>NCM</th><th style={{ ...th, textAlign: "right" }}>Qtd</th><th style={{ ...th, textAlign: "right" }}>Unit.</th><th style={{ ...th, textAlign: "right" }}>Total</th></tr></thead>
                          <tbody>{notaSel.itens.map((i, k) => <tr key={k}><td style={td}>{i.descricao}</td><td style={td}>{i.ncm}</td><td style={tdn}>{i.qtd}</td><td style={tdn}>{brl(i.valorUnit)}</td><td style={tdn}>{brl(i.total)}</td></tr>)}</tbody>
                        </table>
                      </div>
                      <p style={{ fontSize: 12.5, margin: "6px 0 0" }}>ICMS {brl(notaSel.impostos.icms.valor)} · PIS {brl(notaSel.impostos.pis.valor)} · COFINS {brl(notaSel.impostos.cofins.valor)} · Total da nota {brl(notaSel.valorTotal)}</p>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <pre style={{ margin: 0, fontSize: 11.5, overflow: "auto", maxHeight: 260, border: "1px solid var(--line)", padding: 8 }}>{gerarXml(notaSel)}</pre>
                      <div className="btn-row" style={{ marginTop: 6 }}>
                        <button type="button" className="btn secondary" onClick={() => baixar(nomeArquivo(notaSel), gerarXml(notaSel), "application/xml")}>Baixar este XML</button>
                        <button type="button" className="btn secondary" onClick={() => setVerGab((v) => !v)}>{verGab ? "Esconder gabarito" : "Ver gabarito do professor"}</button>
                      </div>
                    </div>
                  </div>
                  {verGab && (
                    <div style={{ background: "var(--danger-bg, #f8e5e3)", border: "1px solid var(--line)", padding: "8px 10px", marginTop: 8, fontSize: 13.5 }}>
                      <b>Gabarito (só o professor vê)</b><br />
                      Decisão esperada: {DEC[notaSel.gabarito?.decisao] || "—"}<br />
                      {notaSel.gabarito?.divergencias?.length ? "Campos com divergência: " + notaSel.gabarito.divergencias.join(", ") : "Nenhuma divergência."}
                      {notaSel.gabarito?.observacao && <><br />{notaSel.gabarito.observacao}</>}
                      {notaSel.direcao === "entrada" && <><br />CFOP de entrada a registrar: {notaSel.gabarito?.cfopEntrada || "1102"}</>}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {modo === "a" && (
        <>
          <div style={box}>
            <h3 style={{ margin: "0 0 4px" }}>Visão do aluno (simulada)</h3>
            <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>É a tela que o aluno teria em 2027.1. Ele só vê as notas dos lotes que você liberou, sem gabarito e sem saber quais têm problema.</p>
          </div>
          {!pacote && <p style={{ color: "var(--muted)" }}>Gere um pacote na aba Professor para ver a caixa de entrada do aluno de exemplo.</p>}
          {pacote && (
            <>
              <Abas atual="c" onMudar={() => {}} itens={[{ k: "c", t: "Caixa de entrada" }, { k: "f", t: "Conferência fiscal (fase 3)", fut: true }, { k: "l", t: "Meus lançamentos", fut: true }]} />
              <div style={box}>
                <h3 style={{ margin: "0 0 4px" }}>Caixa de entrada · matrícula {pacote.matricula}</h3>
                <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 8px" }}>{liberadas.length} nota(s) liberada(s). Para mudar, use "Lotes liberados ao aluno" na aba Professor.</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Lote</th><th style={th}>Arquivo</th><th style={th}>Data</th><th style={th}>Emitente</th><th style={{ ...th, textAlign: "right" }}>Total</th><th style={th}>Situação</th></tr></thead>
                    <tbody>{liberadas.map((d) => (
                      <tr key={d.id} onClick={() => setSelAluno(d.id)} style={{ cursor: "pointer", background: selAluno === d.id ? "var(--green-bg, #e3f0ea)" : undefined }}>
                        <td style={td}>{d.lote}</td><td style={td}>{nomeArquivo(d)}</td><td style={td}>{dataBr(d.data)}</td><td style={td}>{d.emitente.nome}</td><td style={tdn}>{brl(d.valorTotal)}</td><td style={td}>Não importada</td>
                      </tr>))}</tbody>
                  </table>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "6px 0 0" }}>Fase 2: o aluno importa o XML. Fase 3: confere campo a campo e aprova, aprova com ressalva ou rejeita.</p>
              </div>
              {notaAluno && (
                <div style={box}>
                  <h3 style={{ margin: "0 0 6px" }}>Arquivo {nomeArquivo(notaAluno)}</h3>
                  <pre style={{ margin: 0, fontSize: 11.5, overflow: "auto", maxHeight: 280, border: "1px solid var(--line)", padding: 8 }}>{gerarXml(notaAluno)}</pre>
                  <div className="btn-row" style={{ marginTop: 6 }}><button type="button" className="btn secondary" disabled title="Chega na fase 2">Importar XML (fase 2)</button></div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
