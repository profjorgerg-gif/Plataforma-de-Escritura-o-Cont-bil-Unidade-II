import { useMemo } from "react";
import { fmt } from "../../lib/contabil.js";
import { folhaEmUso, encargos, nomeDoMes, folhaAlternativa, CASAS_HTI_ALTERNATIVAS } from "../../lib/folha.js";
import { EstadoGravacao, MeuCalculo, CaixaTexto, Carregando, useCampos } from "../shared/AgbUI.jsx";

const TXT_AD = (a) => (!a || !a.tipo ? "—" : a.tipo === "AP" ? "AP 30%" : "AI " + (a.pct || 0) + "%");

export default function FolhaMes({ trab, ca }) {
  const campos = useCampos(trab, false);
  const f = useMemo(() => folhaEmUso(ca.folha), [ca.folha]);
  // jeitos de arredondar a HTI que também valem (o aluno que arredondou a hora integrada não é punido)
  const alts = useMemo(() => CASAS_HTI_ALTERNATIVAS.map((c) => folhaAlternativa(ca.folha, c)), [ca.folha]);
  if (ca.folha === undefined || trab.carregando) return <Carregando />;
  const p = f.parametros;
  const enc = encargos(f.calc.total, p);
  const tol = 0.02;

  return (
    <>
      <div className="screen-eyebrow">etapa 3 · contabilidade avançada</div>
      <h2 className="screen-title">Folha do mês — {nomeDoMes(f.competencia)}</h2>
      <p className="screen-sub">Calcule a remuneração bruta de cada empregado e os encargos. Você faz a conta, o sistema confere. Arredonde cada valor para centavos antes de somar.</p>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />

      <div className="panel">
        <div className="panel-head"><h3>Dados da folha (informados pelo professor)</h3></div>
        <div className="panel-body" style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
          Carga horária {p.cargaHoraria} h · adicional noturno {Math.round(p.adicionalNoturno * 100)}% · DSR: {p.diasUteisDSR} dias úteis e {p.diasDescansoDSR} de descanso/feriados · insalubridade (AI) sobre o salário mínimo (R$ {fmt(p.salarioMinimo)}) e periculosidade (AP) 30% sobre o salário-base.<br />
          Não arredonde a hora integrada: use 4 casas (ex.: 16,6459); se arredondar para centavos, o sistema também confere. HE 50% = hora integrada × 1,5 · HE 100% = × 2 · HE noturna = × 1,20 × (1,5 ou 2) · hora integrada = (salário + adicional) ÷ {p.cargaHoraria} · DSR = horas extras ÷ {p.diasUteisDSR} × {p.diasDescansoDSR}.
        </div>
      </div>

      {f.calc.linhas.map((l, i) => {
        const e = f.empregados[i];
        const altsDe = (k) => alts.map((a) => ({ adic: a.calc.linhas[i].adicional, he: a.calc.linhas[i].horasExtras, dsr: a.calc.linhas[i].dsr, bruta: a.calc.linhas[i].bruta })[k]);
        return (
          <div className="panel" key={i}>
            <div className="panel-head"><h3>{l.nome}</h3><span className="mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>salário R$ {fmt(l.salario)} · {TXT_AD(e.adicional)} · HE50 {e.he50 || 0}h · HE100 {e.he100 || 0}h · HEN50 {e.hen50 || 0}h · HEN100 {e.hen100 || 0}h</span></div>
            <div className="panel-body" style={{ padding: 0 }}>
              <table>
                <tbody>
                  {[["adic", "Adicional (insalubridade/periculosidade)", l.adicional], ["he", "Total das horas extras (50%, 100% e noturnas)", l.horasExtras], ["dsr", "DSR sobre as horas extras", l.dsr], ["bruta", "Remuneração bruta", l.bruta]].map(([k, nome, esp]) => (
                    <tr key={k} style={k === "bruta" ? { fontWeight: 700, background: "var(--paper)" } : null}>
                      <td>{nome}</td>
                      <td className="num"><MeuCalculo largura={110} valor={campos.get("folha", "e" + i + "_" + k)} esperado={esp} tolerancia={tol} alternativas={altsDe(k)} onChange={(v) => campos.set("folha", "e" + i + "_" + k, v)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="panel">
        <div className="panel-head"><h3>Total da folha e encargos patronais</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <tbody>
              {[["total", "Total da folha de salários (soma das remunerações brutas)", f.calc.total, alts.map((a) => a.calc.total)],
                ["inss", "INSS patronal (" + p.inss + "% da folha)", enc.inss, alts.map((a) => a.inss)],
                ["fgts", "FGTS (" + p.fgts + "% da folha)", enc.fgts, alts.map((a) => a.fgts)],
                ["custo", "Custo total da folha para a empresa (folha + INSS + FGTS)", f.calc.total + enc.inss + enc.fgts, alts.map((a) => a.calc.total + a.inss + a.fgts)]].map(([k, nome, esp, altT]) => (
                <tr key={k}>
                  <td>{nome}</td>
                  <td className="num"><MeuCalculo largura={120} valor={campos.get("folha", "t_" + k)} esperado={Math.round(esp * 100) / 100} alternativas={altT.map((x) => Math.round(x * 100) / 100)} tolerancia={tol} onChange={(v) => campos.set("folha", "t_" + k, v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 18px", fontSize: 12.5, color: "var(--ink-faint)", borderTop: "1px solid var(--line-strong)" }}>
            Aceita vírgula ou ponto. Diferença de até R$ 0,02 (arredondamento) conta como certa. Cálculo só com INSS e FGTS, como na Atividade 2; RAT e Terceiros entram na tela seguinte.
          </div>
        </div>
      </div>
      {f.fixa && <div className="balance-check bad">Observação: o professor definiu uma remuneração total fixa de R$ {fmt(f.fixa)} para as provisões da tela seguinte.</div>}

      <div className="panel"><div className="panel-body">
        <CaixaTexto rotulo="Desafio profissional — parecer curto (10 a 15 linhas): o gerente disse que, como os salários só serão pagos no quinto dia útil do mês seguinte, não é preciso registrá-los agora. Ele está certo? Justifique pelo regime de competência."
          valor={campos.get("folha", "desafio")} onChange={(v) => campos.set("folha", "desafio", v)} linhas={7} />
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>O professor consegue ler o que você escreve aqui.</div>
      </div></div>
    </>
  );
}
