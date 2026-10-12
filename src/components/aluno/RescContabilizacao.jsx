import { useMemo } from "react";
import { fmt } from "../../lib/contabil.js";
import { lerNumero } from "../../lib/agb.js";
import { calcularRescisao, lancamentosDaRescisao, conferirLancamento, CONTAS_RESC, prazoPagamento } from "../../lib/rescisao.js";
import { EstadoGravacao, Carregando, useCampos } from "../shared/AgbUI.jsx";

const ROTULO_STATUS = { rascunho: "rascunho no Livro diário", enviado: "enviado ao professor", correcao: "devolvido para correção", aprovado: "aprovado ✓" };

export default function RescContabilizacao({ trab, resc, esc, onLevar }) {
  const campos = useCampos(trab, false);
  const r = useMemo(() => calcularRescisao(resc.caso), [resc.caso]);
  const esperados = useMemo(() => lancamentosDaRescisao(r), [r]);
  if (resc.caso === undefined || trab.carregando || !esc.contas) return <Carregando />;
  const contas = [...esc.contas].sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "pt-BR", { numeric: true }));
  const faltando = Object.values(CONTAS_RESC).filter((c) => !esc.contas.some((x) => x.codigo === c));
  const c = r.caso;
  const dataPgto = campos.get("rdoc", "pagamento") || prazoPagamento(c.desligamento);

  function partidasDe(key) {
    const n = Number(campos.get("rlanc", key + "_n")) || 2;
    return Array.from({ length: n }, (_, i) => ({
      conta: campos.get("rlanc", key + "_" + i + "_conta"),
      tipo: campos.get("rlanc", key + "_" + i + "_tipo") || (i === 0 ? "D" : "C"),
      valor: lerNumero(campos.get("rlanc", key + "_" + i + "_valor")) ?? "",
      valorTxt: campos.get("rlanc", key + "_" + i + "_valor"),
    }));
  }
  return (
    <>
      <div className="screen-eyebrow">etapa 4 · rescisão trabalhista</div>
      <h2 className="screen-title">Contabilização da rescisão</h2>
      <p className="screen-sub">Monte os {esperados.length} lançamentos da rescisão de {c.nome}: escolha as contas, o lado (D/C) e o valor. As provisões já constituídas devem ser baixadas até o saldo existente; o excedente vai para despesa. O sistema confere, sem mostrar a resposta.</p>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />
      {faltando.length > 0 && (
        <div className="balance-check bad" style={{ marginBottom: 14 }}>
          Ainda faltam contas no Plano de contas ({faltando.join(", ")}). Avise o professor: sem elas não dá para concluir os lançamentos.
        </div>
      )}
      {esperados.map((l, bi) => {
        const ps = partidasDe(l.key);
        const res = conferirLancamento(ps, l.partidas);
        const historico = "Rescisão " + c.nome + " · " + l.titulo;
        const existente = (esc.lancamentos || []).find((x) => x.historico === historico);
        const data = l.key === "pgto" ? dataPgto : c.desligamento;
        return (
          <div className="panel" key={l.key}>
            <div className="panel-head">
              <h3>{bi + 1}. {l.titulo}</h3>
              <span className={"tag-pill " + (res.ok ? "ok" : res.vazio ? "warn" : "bad")}>{res.ok ? "✓ confere" : res.vazio ? "em branco" : "✗ confira"}</span>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              <table>
                <thead><tr><th style={{ width: 70 }}>D / C</th><th>Conta</th><th className="num" style={{ width: 140 }}>Valor (R$)</th></tr></thead>
                <tbody>
                  {ps.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <select value={p.tipo} onChange={(e) => campos.set("rlanc", l.key + "_" + i + "_tipo", e.target.value)} style={{ padding: "3px 4px" }}>
                          <option value="D">D</option><option value="C">C</option>
                        </select>
                      </td>
                      <td>
                        <select value={p.conta} onChange={(e) => campos.set("rlanc", l.key + "_" + i + "_conta", e.target.value)} style={{ width: "100%", padding: "3px 4px" }}>
                          <option value="">— escolha a conta —</option>
                          {contas.map((k) => <option key={k.codigo} value={k.codigo}>{k.codigo} — {k.nome}</option>)}
                        </select>
                      </td>
                      <td className="num">
                        <input className="mono" inputMode="decimal" value={p.valorTxt || ""} placeholder="0,00"
                          onChange={(e) => campos.set("rlanc", l.key + "_" + i + "_valor", e.target.value)}
                          style={{ width: 120, textAlign: "right", padding: "3px 6px", border: "1px solid var(--line-strong)" }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "8px 18px", borderTop: "1px solid var(--line-strong)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button className="btn secondary" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => campos.set("rlanc", l.key + "_n", String(ps.length + 1))}>+ linha</button>
                {res.dicas.map((d, i) => <span key={i} style={{ fontSize: 12.5, color: "var(--red)" }}>{d}</span>)}
                {res.ok && !existente && (
                  <button className="btn green" onClick={() => onLevar({
                    data, historico, origem: "folha",
                    partidas: ps.filter((p) => p.conta && Number(p.valor) > 0).map((p) => ({ conta: p.conta, tipo: p.tipo, valor: p.valor })),
                  })}>Levar para o Livro diário</button>
                )}
                {existente && <span className="tag-pill ok">Já está no Livro diário — {ROTULO_STATUS[existente.status] || existente.status}</span>}
              </div>
              {res.ok && !existente && <div style={{ padding: "0 18px 10px", fontSize: 12.5, color: "var(--ink-faint)" }}>O Livro diário abre já preenchido; revise e envie. Valor total: R$ {fmt(l.partidas.filter((x) => x.tipo === "D").reduce((s, x) => s + x.valor, 0))}.</div>}
            </div>
          </div>
        );
      })}
    </>
  );
}
