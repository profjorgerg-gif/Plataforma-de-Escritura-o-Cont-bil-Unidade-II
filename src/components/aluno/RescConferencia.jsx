import { useMemo } from "react";
import { lerNumero } from "../../lib/agb.js";
import { calcularRescisao, direitosDe, VERBAS_DIREITO, INCIDENCIAS, DOCUMENTOS, lancamentosDaRescisao, prazoPagamento, diasEntre } from "../../lib/rescisao.js";
import { EstadoGravacao, CaixaTexto, Carregando, useCampos } from "../shared/AgbUI.jsx";
import { contarLinhas } from "./ParecerFolha.jsx";

function valoresCalc(r) {
  return { anos: r.anos, avisoDias: r.avisoDias, projDias: r.projDias, avF: r.avF, av13: r.av13,
    saldo: r.saldo, aviso: r.aviso, fv: r.fv, fv3: r.fv3, fp: r.fp, fp3: r.fp3, d13: r.d13, bruto: r.bruto,
    baseFgts: r.baseFgts, fgts8: r.fgts8, multa: r.multa, baseInss: r.baseInss, inss: r.inss, rat: r.rat, terceiros: r.terceiros };
}

export default function RescConferencia({ trab, resc, esc }) {
  const campos = useCampos(trab, false);
  const r = useMemo(() => calcularRescisao(resc.caso), [resc.caso]);
  if (resc.caso === undefined || trab.carregando) return <Carregando />;
  const c = r.caso, dir = direitosDe(c.modalidade);
  const g = (s, k) => campos.get(s, k);
  const okNum = (k, esp) => { const n = lerNumero(g("rcalc", k)); return n !== null && Math.abs(n - esp) <= 0.02; };
  const val = valoresCalc(r);
  const fatos = g("rcaso", "modalidade") === c.modalidade && VERBAS_DIREITO.every((v) => g("rcaso", "d_" + v.key) === dir[v.key]);
  const dados = ["anos", "avisoDias", "projDias", "avF", "av13"].every((k) => okNum(k, val[k]));
  const valores = Object.keys(val).every((k) => okNum(k, val[k])) && INCIDENCIAS.every((v) => ["inss", "fgts", "irrf"].every((t) => g("rinc", v.key + "_" + t) === v[t]));
  const lancs = lancamentosDaRescisao(r);
  const levados = lancs.filter((l) => (esc.lancamentos || []).some((x) => x.chave === "resc|" + c.nome + "|" + l.key || x.historico === "Rescisão " + c.nome + " · " + l.titulo)).length;
  const docOk = (gi) => DOCUMENTOS[gi].itens.every((_, i) => g("rdoc", "i_" + gi + "_" + i) === "1");
  const obrig = levados === lancs.length && docOk(2);
  const pg = g("rdoc", "pagamento");
  const noPrazo = pg ? diasEntre(prazoPagamento(c.desligamento), pg) <= 0 : false;
  const evid = docOk(0) && docOk(1) && docOk(3) && noPrazo;
  const niveis = [
    ["Fatos", fatos, "Modalidade e direitos do empregado conferidos.", "Revise a modalidade e os direitos (tela “Caso e direitos”)."],
    ["Dados", dados, "Prazos, aviso, projeção e avos conferidos.", "Revise anos, aviso, projeção e avos (tela “Cálculo”)."],
    ["Valores", valores, "Verbas, FGTS, encargos e incidências conferidos.", "Há valor ou incidência que ainda não confere."],
    ["Obrigações", obrig, "Lançamentos feitos e documentos de obrigações marcados.", "Faltam lançamentos no Livro diário ou documentos de obrigações."],
    ["Evidências", evid, "Documentos completos e pagamento no prazo.", "Faltam documentos marcados ou o pagamento está fora do prazo ou sem data."],
  ];
  const n = niveis.filter((x) => x[1]).length;
  const res = n === 5 ? ["ok", "Aprovado", "Todas as validações concluídas."] : n >= 3 ? ["warn", "Revisar", "Há pontos que precisam ser revisados antes de encerrar."] : ["bad", "Bloqueado", "Existem divergências que impedem o encerramento."];

  const p = (trab.dados || {}).rparecer || {};
  const texto = campos.get("rparecer", "texto");
  const linhas = contarLinhas(texto);
  const linhasOk = linhas >= 10 && linhas <= 20;
  const enviado = !!p.enviado;
  const devolutiva = (trab.dados || {}).devolutivaResc;
  function enviar() {
    trab.setCampo("rparecer", "enviado", true);
    trab.setCampo("rparecer", "enviadoEm", new Date().toISOString());
    trab.salvarAgora();
  }
  return (
    <>
      <div className="screen-eyebrow">etapa 4 · rescisão trabalhista</div>
      <h2 className="screen-title">Conferência final e parecer</h2>
      <p className="screen-sub">Cinco níveis de validação antes de encerrar a rescisão. Regra do processo: não encerre enquanto houver valor, data, evento ou documento divergente.</p>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />
      {devolutiva && <div className="panel"><div className="panel-head"><h3>Retorno do professor</h3></div><div className="panel-body" style={{ whiteSpace: "pre-wrap" }}>{devolutiva}</div></div>}
      <div className="panel">
        <div className="panel-head"><h3>Painel de auditoria</h3><span className={"tag-pill " + res[0]}>{res[1]}</span></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table><tbody>
            {niveis.map(([nome, ok, certo, falta], i) => (
              <tr key={nome}><td style={{ width: 120 }}><b>Nível {i + 1}</b> · {nome}</td><td>{ok ? certo : falta}</td><td style={{ width: 40, fontWeight: 700, color: ok ? "var(--green)" : "var(--red)" }}>{ok ? "✓" : "✗"}</td></tr>
            ))}
          </tbody></table>
          <div style={{ padding: "10px 18px", fontSize: 12.5, color: "var(--ink-faint)", borderTop: "1px solid var(--line-strong)" }}>{res[2]} A auditoria compara o conteúdo, não só a existência dos itens.</div>
        </div>
      </div>
      <div className="panel"><div className="panel-body">
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 10 }}>
          Escreva um parecer de 10 a 15 linhas: a modalidade e o fundamento legal, as verbas devidas e o total, o efeito da projeção do aviso, os encargos (FGTS e multa) e como a rescisão aparece nas demonstrações contábeis (despesa, passivo e baixa das provisões).
        </div>
        <CaixaTexto rotulo="Parecer da rescisão" linhas={12} valor={texto} onChange={(v) => campos.set("rparecer", "texto", v)} />
        <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span className={"tag-pill " + (linhasOk ? "ok" : "warn")}>{linhas} linhas (meta: 10 a 15)</span>
          {enviado
            ? <><span className="tag-pill ok">✓ Enviado ao professor</span><button className="btn secondary" onClick={() => { trab.setCampo("rparecer", "enviado", false); trab.salvarAgora(); }}>Reabrir para editar</button></>
            : <button className="btn green" disabled={!linhasOk} onClick={enviar}>Enviar parecer ao professor</button>}
        </div>
      </div></div>
    </>
  );
}
