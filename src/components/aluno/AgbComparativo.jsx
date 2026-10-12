import { useMemo } from "react";
import { calcularIndicadores } from "../../lib/agb.js";
import { EstadoGravacao, CaixaTexto, Carregando, useDadosAnalise, useCampos } from "../shared/AgbUI.jsx";
import { INDICADORES_CHAVE, mostrarInd, exerciciosVisiveis } from "./AgbExercicios.jsx";

export default function AgbComparativo({ esc, trab, agb, emTeste }) {
  const visiveis = exerciciosVisiveis(agb, emTeste);
  const dados = useDadosAnalise(esc, agb.anterior, false);
  const campos = useCampos(trab, false);
  const colunas = useMemo(() => {
    const cols = [];
    cols.push({ id: "minha", nome: "Minha empresa", ind: dados.semDados ? null : calcularIndicadores(dados.bpv, dados.dre, 360) });
    visiveis.forEach((e) => cols.push({ id: e.id, nome: e.nome, ind: calcularIndicadores(e.bp, e.dre, 360) }));
    return cols;
  }, [dados, visiveis.map((e) => e.id).join(",")]); // eslint-disable-line
  if (trab.carregando) return <Carregando />;

  const p = trab.dados && trab.dados.comp ? trab.dados.comp : {};
  const enviado = !!p.enviado;
  const texto = campos.get("comp", "texto");
  const linhas = texto.split(/\n/).filter((x) => x.trim()).length;
  function enviar() { trab.setCampo("comp", "enviado", true); trab.setCampo("comp", "enviadoEm", new Date().toISOString()); trab.salvarAgora(); }
  function reabrir() { trab.setCampo("comp", "enviado", false); trab.salvarAgora(); }

  function destaque(it, col) {
    const vals = colunas.map((c) => c.ind && c.ind[it.k]).filter((v) => v !== null && v !== undefined && isFinite(v));
    const v = col.ind && col.ind[it.k];
    if (vals.length < 2 || v === null || v === undefined || !isFinite(v)) return {};
    const melhor = it.melhor === "maior" ? Math.max(...vals) : Math.min(...vals);
    const pior = it.melhor === "maior" ? Math.min(...vals) : Math.max(...vals);
    if (v === melhor) return { background: "#e3f3e6", fontWeight: 700 };
    if (v === pior) return { background: "#fbe4e1" };
    return {};
  }

  return (
    <>
      <div className="screen-eyebrow">etapa 6 · análise comparativa</div>
      <h2 className="screen-title">Comparativo entre empresas</h2>
      <p className="screen-sub">Sua empresa e as empresas dos exercícios, lado a lado. <span style={{ background: "#e3f3e6", padding: "0 4px" }}>verde</span> = melhor · <span style={{ background: "#fbe4e1", padding: "0 4px" }}>vermelho</span> = pior.</p>
      {visiveis.length === 0 && <div className="empty-state">O professor ainda não liberou exercícios para comparar.</div>}
      {dados.semDados && <div className="balance-check bad" style={{ marginBottom: 14 }}>Sua empresa ainda não tem lançamentos aprovados; a coluna dela aparece com “—”.</div>}
      <div className="panel"><div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Indicador</th>{colunas.map((c) => <th key={c.id} className="num">{c.nome}</th>)}<th style={{ fontSize: 11.5 }}>Melhor quando</th></tr></thead>
          <tbody>
            {INDICADORES_CHAVE.map((it) => (
              <tr key={it.k}>
                <td style={{ fontWeight: 600 }}>{it.nome}</td>
                {colunas.map((c) => <td key={c.id} className="num mono" style={destaque(it, c)}>{mostrarInd(c.ind && c.ind[it.k], it.tipo)}</td>)}
                <td style={{ fontSize: 12, color: "var(--ink-faint)" }}>{it.melhor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />
      <div className="panel"><div className="panel-body">
        <CaixaTexto rotulo="Parecer comparativo (10 a 15 linhas)" valor={texto} linhas={10}
          onChange={(v) => { if (!enviado) campos.set("comp", "texto", v); }}
          dica="Qual empresa está melhor e por quê? Qual tem mais risco? Em que a sua empresa é parecida ou diferente das demais?" />
        <div className="btn-row">
          {enviado
            ? <><span className="tag-pill ok">enviado ao professor</span> <button className="btn secondary" onClick={reabrir}>Reabrir para editar</button></>
            : <button className="btn green" disabled={linhas < 5} onClick={enviar}>Enviar ao professor</button>}
          {!enviado && linhas < 5 && <span style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Escreva pelo menos algumas linhas para poder enviar.</span>}
        </div>
      </div></div>
    </>
  );
}
