import { useMemo } from "react";
import { fmt } from "../../lib/contabil.js";
import { folhaEmUso, nomeDoMes } from "../../lib/folha.js";
import { EstadoGravacao, MeuCalculo, Carregando, useCampos } from "../shared/AgbUI.jsx";

export default function ProvisoesEncargos({ trab, ca }) {
  const campos = useCampos(trab, false);
  const f = useMemo(() => folhaEmUso(ca.folha), [ca.folha]);
  if (ca.folha === undefined || trab.carregando) return <Carregando />;
  const pv = f.provisoes, p = f.parametros;
  const celula = (k, esp, l = 110) => (
    <MeuCalculo largura={l} valor={campos.get("prov", k)} esperado={esp} tolerancia={0.02} onChange={(v) => campos.set("prov", k, v)} />
  );
  const blocos = [
    ["s", "Encargos sobre a folha de salários", pv.encSalarios],
    ["f", "Encargos sobre a provisão de férias + 1/3", pv.encFerias],
    ["d", "Encargos sobre a provisão do 13º salário", pv.enc13],
  ];
  return (
    <>
      <div className="screen-eyebrow">fase 2 · contabilidade avançada</div>
      <h2 className="screen-title">Provisões e encargos — {nomeDoMes(f.competencia)}</h2>
      <p className="screen-sub">
        Base: remuneração do mês de <b>R$ {fmt(f.remuneracao)}</b>{f.fixa ? " (valor fixado pelo professor)" : " (total da folha)"}. Calcule as provisões e os encargos de cada uma. Arredonde cada parcela para centavos.
      </p>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />

      <div className="panel">
        <div className="panel-head"><h3>Provisões do mês</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table><tbody>
            {[["sal", "Provisão de salários e remunerações", "remuneração do mês", pv.salarios],
              ["fer", "Provisão de férias", "remuneração ÷ 12", pv.ferias],
              ["terco", "Adicional constitucional de 1/3", "férias × 1/3", pv.tercoFerias],
              ["ferT", "Base de férias (férias + 1/3)", "soma", pv.feriasTotal],
              ["dec", "Provisão do 13º salário", "remuneração ÷ 12", pv.decimo]].map(([k, n, c, v]) => (
              <tr key={k}><td>{n}</td><td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{c}</td><td className="num">{celula("p_" + k, v)}</td></tr>
            ))}
          </tbody></table>
        </div>
      </div>

      {blocos.map(([b, titulo, e]) => (
        <div className="panel" key={b}>
          <div className="panel-head"><h3>{titulo}</h3><span className="mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>base R$ {fmt(e.base)}</span></div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table><tbody>
              {[["fgts", "FGTS (" + p.fgts + "%)", e.fgts], ["inss", "INSS patronal (" + p.inss + "%)", e.inss], ["rat", "RAT (" + p.rat + "%)", e.rat], ["terc", "Terceiros (" + String(p.terceiros).replace(".", ",") + "%)", e.terceiros], ["tot", "Total dos encargos", e.total]].map(([k, n, v]) => (
                <tr key={k} style={k === "tot" ? { fontWeight: 700, background: "var(--paper)" } : null}><td>{n}</td><td className="num">{celula("e" + b + "_" + k, v)}</td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
      ))}

      <div className="panel">
        <div className="panel-head"><h3>Consolidação</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table><tbody>
            {[["emp", "Obrigações perante os empregados (salários + férias com 1/3 + 13º)", pv.obrigacoesEmpregados],
              ["enc", "Obrigações perante os órgãos (total dos encargos)", pv.encargosTotal],
              ["geral", "Total geral das despesas e obrigações trabalhistas", pv.totalGeral]].map(([k, n, v]) => (
              <tr key={k} style={k === "geral" ? { fontWeight: 700, background: "var(--paper)" } : null}><td>{n}</td><td className="num">{celula("c_" + k, v, 120)}</td></tr>
            ))}
          </tbody></table>
          <div style={{ padding: "10px 18px", fontSize: 12.5, color: "var(--ink-faint)", borderTop: "1px solid var(--line-strong)" }}>
            Cada encargo é arredondado separadamente e depois somado, como no gabarito. Diferença de até R$ 0,02 conta como certa.
          </div>
        </div>
      </div>
    </>
  );
}
