import { useMemo, useState } from "react";
import { fmt } from "../../lib/contabil.js";
import { calcularIndicadores, capitalDeGiro, totaisBP, fmtNum, fmtPct } from "../../lib/agb.js";
import { SemDados, AvisoExemplo, EstadoGravacao, CaixaTexto, Carregando, useDadosAnalise, useCampos } from "../shared/AgbUI.jsx";

const SECOES = [
  ["liquidez", "1. Liquidez e capital de giro", "A empresa consegue pagar o que deve no curto prazo? Como financia a operação?"],
  ["estrutura", "2. Estrutura de capitais e endividamento", "De quem é o dinheiro que financia a empresa? A dívida é de curto ou longo prazo?"],
  ["rentabilidade", "3. Rentabilidade e desempenho", "A empresa dá retorno? As margens e o giro são suficientes?"],
  ["recomendacoes", "4. Conclusão e recomendações", "Em uma ou duas frases, a situação geral. Depois, o que você recomendaria à administração."],
];

export default function ParecerFinal({ esc, trab, agb, empresaNome }) {
  const [exemplo, setExemplo] = useState(false);
  const dados = useDadosAnalise(esc, agb.anterior, exemplo);
  const campos = useCampos(trab, exemplo);
  const resumo = useMemo(() => {
    if (dados.semDados) return null;
    const dias = 360;
    return { ind: calcularIndicadores(dados.bpv, dados.dre, dias), g: capitalDeGiro(dados.bpv), t: totaisBP(dados.bpv) };
  }, [dados]);
  if (trab.carregando) return <Carregando />;

  const p = (trab.dados || {}).parecer || {};
  const enviado = !exemplo && !!p.enviado;
  const devolutiva = !exemplo && (trab.dados || {}).devolutiva;
  const preenchidas = SECOES.filter(([k]) => (campos.get("parecer", k) || "").trim().length > 0).length;

  function enviar() {
    trab.setCampo("parecer", "enviado", true);
    trab.setCampo("parecer", "enviadoEm", new Date().toISOString());
    trab.salvarAgora();
  }
  function reabrir() { trab.setCampo("parecer", "enviado", false); trab.salvarAgora(); }

  return (
    <>
      <div className="screen-eyebrow">etapa 5 · análise gerencial de balanços</div>
      <h2 className="screen-title">Parecer e relatório final</h2>
      <p className="screen-sub">Reúna o que você concluiu na análise em um parecer para a administração da empresa. Quando terminar, envie ao professor.</p>
      {dados.exemplo && <AvisoExemplo onSair={() => setExemplo(false)} />}
      {dados.semDados ? <SemDados dados={dados} onExemplo={() => setExemplo(true)} /> : (
        <>
          {!dados.exemplo && <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />}
          {devolutiva && (
            <div className="panel"><div className="panel-head"><h3>Retorno do professor</h3></div><div className="panel-body" style={{ whiteSpace: "pre-wrap" }}>{devolutiva}</div></div>
          )}
          <div className="panel">
            <div className="panel-head"><h3>Quadro-resumo {empresaNome ? "— " + empresaNome : ""}</h3></div>
            <div className="panel-body" style={{ padding: 0 }}>
              <table>
                <tbody>
                  <tr><td>Ativo total</td><td className="num mono">R$ {fmt(resumo.t.ativo)}</td><td>Patrimônio líquido</td><td className="num mono">R$ {fmt(resumo.t.PL)}</td></tr>
                  <tr><td>Receita líquida</td><td className="num mono">R$ {fmt(dados.dre.receitaLiquida)}</td><td>Resultado do exercício</td><td className="num mono">R$ {fmt(dados.dre.resultadoExercicio)}</td></tr>
                  <tr><td>Liquidez corrente</td><td className="num mono">{fmtNum(resumo.ind.liquidezCorrente)}</td><td>Liquidez seca</td><td className="num mono">{fmtNum(resumo.ind.liquidezSeca)}</td></tr>
                  <tr><td>Capital circulante líquido</td><td className="num mono">R$ {fmt(resumo.ind.ccl)}</td><td>Necessidade de capital de giro</td><td className="num mono">R$ {fmt(resumo.g.ncg)}</td></tr>
                  <tr><td>Part. de capitais de terceiros</td><td className="num mono">{fmtPct(resumo.ind.participacaoCapTerceiros === null ? null : resumo.ind.participacaoCapTerceiros * 100)}</td><td>Composição do endividamento</td><td className="num mono">{fmtPct(resumo.ind.composicaoEndividamento === null ? null : resumo.ind.composicaoEndividamento * 100)}</td></tr>
                  <tr><td>Margem líquida</td><td className="num mono">{fmtPct(resumo.ind.margemLiquida === null ? null : resumo.ind.margemLiquida * 100)}</td><td>ROE</td><td className="num mono">{fmtPct(resumo.ind.roe === null ? null : resumo.ind.roe * 100)}</td></tr>
                  <tr><td>Situação do capital de giro</td><td colSpan={3}>Tipo {resumo.g.tipo.n} — {resumo.g.tipo.nome}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel"><div className="panel-body">
            {SECOES.map(([k, titulo, dica]) => (
              <CaixaTexto key={k} rotulo={titulo} dica={dica} linhas={5} valor={campos.get("parecer", k)} onChange={(v) => campos.set("parecer", k, v)} />
            ))}
            <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {!dados.exemplo && (enviado
                ? <><span className="tag-pill ok">✓ Enviado ao professor</span><button className="btn secondary" onClick={reabrir}>Reabrir para editar</button></>
                : <button className="btn green" disabled={preenchidas < SECOES.length} onClick={enviar}>Enviar parecer ao professor</button>)}
              <button className="btn secondary" onClick={() => window.print()}>Imprimir / salvar em PDF</button>
              {!enviado && !dados.exemplo && preenchidas < SECOES.length && <span style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Preencha as 4 partes para poder enviar ({preenchidas}/4).</span>}
            </div>
          </div></div>
        </>
      )}
    </>
  );
}
