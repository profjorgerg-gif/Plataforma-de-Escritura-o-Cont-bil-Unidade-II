import { Fragment } from "react";
import { TABELAS_2026 } from "../../lib/folhaAtividade.js";
import { fmt } from "../../lib/contabil.js";

// Folhas de GABARITO (memória de cálculo) do Caderno da Folha, só na versão do professor.
// Os números vêm do mesmo cálculo que confere o sistema (calcularContracheque / calcularProvisoes); aqui só se mostra o passo a passo.
const T = TABELAS_2026;
const brl = (v) => fmt(Number(v) || 0);
const pc = (a) => String(Math.round(a * 1000) / 10).replace(".", ",") + "%";
const hti4 = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const trunc = (v) => Math.floor((Number(v) + 1e-9) * 100) / 100;
const L = ({ t, v, forte }) => <tr className={forte ? "gt" : undefined}><td>{t}</td><td className="n">{v}</td></tr>;
const Sec = ({ titulo, children }) => (<><h4>{titulo}</h4><table><tbody>{children}</tbody></table></>);

// emp = dados do caso (empregadoDeCampos), c = resultado de calcularContracheque, p = parâmetros da folha
export function GabaritoEmpregado({ emp, c, p }) {
  const sm = Number(p.salarioMinimo) || 1621;
  const tipo = emp.adicional && emp.adicional.tipo;
  const pct = tipo === "AP" ? 30 : tipo === "AI" ? Number(emp.adicional.pct) || 0 : 0;
  const horas = [
    ["he50", "Horas extras 50%", emp.he50, "1,5", false, c.he50], ["he100", "Horas extras 100%", emp.he100, "2", false, c.he100],
    ["hen50", "Extras noturnas 50%", emp.hen50, "1,5", true, c.hen50], ["hen100", "Extras noturnas 100%", emp.hen100, "2", true, c.hen100],
  ].filter((h) => Number(h[2]) > 0);
  const faltas = Number(emp.faltas) || 0;
  const sem = Math.min(faltas, emp.semanasComFalta === undefined || emp.semanasComFalta === "" ? faltas : Number(emp.semanasComFalta) || 0);
  // INSS por faixa (cada faixa truncada em 2 casas)
  let ant = 0;
  const inss = [];
  const b = Math.min(Math.max(c.remuneracao, 0), T.inss[T.inss.length - 1].ate);
  T.inss.forEach((f, i) => {
    if (b > ant) inss.push({ t: i === 0 ? `${brl(f.ate)} × ${pc(f.aliq)}` : `(${brl(Math.min(b, f.ate))} − ${brl(ant)}) × ${pc(f.aliq)}`, v: trunc((Math.min(b, f.ate) - ant) * f.aliq) });
    ant = f.ate;
  });
  const fi = T.inss.findIndex((f) => b <= f.ate);
  let dedRapida = 0;
  for (let i = 1; i <= Math.max(fi, 0); i++) dedRapida += T.inss[i - 1].ate * (T.inss[i].aliq - T.inss[i - 1].aliq);
  dedRapida = Math.round((dedRapida + 1e-9) * 100) / 100;
  const faixa = T.inss[Math.max(fi, 0)];
  const dep = Number(emp.dependentes) || 0;
  const r = T.reducao;
  const redTxt = c.remuneracao <= r.limiteIsento
    ? `Redução (Lei 15.270): rendimento tributável ${brl(c.remuneracao)} até ${brl(r.limiteIsento)} → zera o imposto`
    : c.remuneracao <= r.limiteFim
      ? `Redução (Lei 15.270): ${brl(r.a)} − ${String(r.b).replace(".", ",")} × ${brl(c.remuneracao)} = ${brl(Math.max(0, r.a - r.b * c.remuneracao))}; vale o menor entre esse valor e o imposto`
      : `Redução (Lei 15.270): rendimento tributável ${brl(c.remuneracao)} acima de ${brl(r.limiteFim)} → sem redução`;
  return (
    <>
      <Sec titulo="1. Remuneração bruta">
        {tipo ? <L t={tipo === "AI" ? `Adicional de insalubridade (sobre o salário mínimo): ${brl(sm)} × ${pct}%` : `Adicional de periculosidade (sobre o salário-base): ${brl(c.salario)} × 30%`} v={brl(c.adicional)} /> : <L t="Sem adicional" v="0,00" />}
        <L t={`Salário integrado: ${brl(c.salario)} + ${brl(c.adicional)}`} v={brl(c.baseIntegrada)} />
        {horas.length > 0 && <L t={`Hora trabalhada integrada (HTI): ${brl(c.baseIntegrada)} ÷ ${p.cargaHoraria} h`} v={hti4(c.hti)} />}
        {horas.map((h) => <L key={h[0]} t={`${h[1]}: ${h[2]} h × ${h[4] ? `(1 + ${Math.round(p.adicionalNoturno * 100)}%) × ` : ""}${h[3]} × ${hti4(c.hti)}`} v={brl(h[5])} />)}
        {horas.length > 0 && <L t="Total de horas extras" v={brl(c.horasExtras)} />}
        {horas.length > 0 && <L t={`DSR sobre horas extras: ${brl(c.horasExtras)} ÷ ${p.diasUteisDSR} × ${p.diasDescansoDSR}`} v={brl(c.dsr)} />}
        <L forte t={`Remuneração bruta: ${brl(c.salario)} + ${brl(c.adicional)} + ${brl(c.horasExtras)} + ${brl(c.dsr)}`} v={brl(c.bruta)} />
      </Sec>
      <Sec titulo="2. Faltas injustificadas">
        {faltas > 0 ? <L t={`${faltas} falta(s) + ${sem} repouso(s) perdido(s) = ${faltas + sem} dias × (${brl(c.salario)} ÷ 30)`} v={brl(c.descFaltas)} /> : <L t="Não teve faltas" v="0,00" />}
        <L forte t={`Remuneração tributável: ${brl(c.bruta)} − ${brl(c.descFaltas)}`} v={brl(c.remuneracao)} />
      </Sec>
      <Sec titulo="3. INSS do empregado (por faixa; cada faixa truncada em 2 casas)">
        {inss.map((x, i) => <L key={i} t={x.t} v={brl(x.v)} />)}
        <L forte t="INSS do empregado" v={brl(c.inss)} />
        <L t={`Conferência pela tabela rápida: ${brl(b)} × ${pc(faixa.aliq)} − ${brl(dedRapida)}`} v={brl(b * faixa.aliq - dedRapida)} />
      </Sec>
      <Sec titulo="4. IRRF">
        <L t={`Dedução legal: INSS ${brl(c.inss)} + ${dep} dependente(s) × ${brl(T.deducaoDependente)}`} v={brl(c.deducaoLegal)} />
        <L t={`Comparação: simplificado ${brl(T.descontoSimplificado)} ${c.usaSimplificado ? ">" : "<"} ${brl(c.deducaoLegal)} → vale ${c.usaSimplificado ? "o simplificado" : "a dedução legal"}`} v={brl(c.deducao)} />
        <L forte t={`Base do IRRF: ${brl(c.remuneracao)} − ${brl(c.deducao)}`} v={brl(c.baseIR)} />
        <L t={c.aliqIR > 0 ? `Imposto da tabela: ${brl(c.baseIR)} × ${pc(c.aliqIR)} − ${brl(c.parcelaIR)}` : "Imposto da tabela: base até a faixa isenta"} v={brl(c.impostoTabela)} />
        <L t={redTxt} v={brl(c.reducao)} />
        <L forte t={`IRRF a descontar: ${brl(c.impostoTabela)} − ${brl(c.reducao)}`} v={brl(c.irrf)} />
      </Sec>
      <Sec titulo="5. Salário-família e vale-transporte">
        <L t={Number(emp.filhos14) > 0 ? (c.salFamilia > 0 ? `Salário-família: ${emp.filhos14} filho(s) × ${brl(T.salarioFamilia.cota)}` : `Salário-família: remuneração acima de ${brl(T.salarioFamilia.limite)}, sem direito`) : "Salário-família: nenhum filho até 14 anos"} v={brl(c.salFamilia)} />
        <L t={emp.vt ? `Vale-transporte: ${T.vtPercentual}% × ${brl(c.salario)}${Number(emp.vtCusto) > 0 ? `, limitado ao custo do vale (${brl(emp.vtCusto)})` : ""}` : "Vale-transporte: o empregado não optou"} v={brl(c.vt)} />
      </Sec>
      <Sec titulo="6. Fechamento">
        <L t={`Total de proventos: ${brl(c.bruta)} + ${brl(c.salFamilia)}`} v={brl(c.proventos)} />
        <L t={`Total de descontos: ${brl(c.descFaltas)} + ${brl(c.inss)} + ${brl(c.irrf)} + ${brl(c.vt)}`} v={brl(c.descontos)} />
        <L forte t={`SALÁRIO LÍQUIDO: ${brl(c.proventos)} − ${brl(c.descontos)}`} v={brl(c.liquido)} />
        <L t={`FGTS da empresa (não desconta do empregado): ${brl(c.remuneracao)} × ${T.fgtsPercentual}%`} v={brl(c.fgts)} />
      </Sec>
    </>
  );
}

// Gabarito da Etapa 3: folha do mês, provisões, encargos e os 6 lançamentos
export function GabaritoEtapa3({ f, lanc, nomeConta }) {
  const pv = f.provisoes, p = f.parametros;
  const enc = (e) => `INSS ${p.inss}% = ${brl(e.inss)} · FGTS ${p.fgts}% = ${brl(e.fgts)} · RAT ${p.rat}% = ${brl(e.rat)} · Terceiros ${String(p.terceiros).replace(".", ",")}% = ${brl(e.terceiros)}`;
  return (
    <>
      <Sec titulo="1. Remuneração do mês">
        <L t={f.fixa !== null ? "Remuneração fixa informada pelo professor" : `Soma da remuneração bruta dos ${f.calc.linhas.length} empregados`} v={brl(f.remuneracao)} />
      </Sec>
      <Sec titulo="2. Provisões">
        <L t={`Provisão de salários: ${brl(f.remuneracao)}`} v={brl(pv.salarios)} />
        <L t={`Férias: ${brl(f.remuneracao)} ÷ 12`} v={brl(pv.ferias)} />
        <L t={`1/3 constitucional: ${brl(pv.ferias)} ÷ 3`} v={brl(pv.tercoFerias)} />
        <L forte t={`Férias + 1/3: ${brl(pv.ferias)} + ${brl(pv.tercoFerias)}`} v={brl(pv.feriasTotal)} />
        <L forte t={`13º salário: ${brl(f.remuneracao)} ÷ 12`} v={brl(pv.decimo)} />
      </Sec>
      <Sec titulo="3. Encargos (cada encargo arredondado separadamente)">
        <L t={`Sobre salários (${brl(pv.encSalarios.base)}): ${enc(pv.encSalarios)}`} v={brl(pv.encSalarios.total)} />
        <L t={`Sobre férias + 1/3 (${brl(pv.encFerias.base)}): ${enc(pv.encFerias)}`} v={brl(pv.encFerias.total)} />
        <L t={`Sobre o 13º (${brl(pv.enc13.base)}): ${enc(pv.enc13)}`} v={brl(pv.enc13.total)} />
        <L forte t="Total de encargos" v={brl(pv.encargosTotal)} />
      </Sec>
      <Sec titulo="4. Resumo das obrigações">
        <L t={`Obrigações com empregados: ${brl(pv.salarios)} + ${brl(pv.feriasTotal)} + ${brl(pv.decimo)}`} v={brl(pv.obrigacoesEmpregados)} />
        <L forte t={`Total geral: ${brl(pv.obrigacoesEmpregados)} + ${brl(pv.encargosTotal)}`} v={brl(pv.totalGeral)} />
      </Sec>
      <h4>5. Os 6 lançamentos</h4>
      <table><thead><tr><th>Lançamento / conta</th><th className="n">Débito</th><th className="n">Crédito</th></tr></thead><tbody>
        {lanc.map((l, i) => (
          <Fragment key={l.key}>
            <tr className="gt"><td colSpan={3}>{i + 1}. {l.titulo}</td></tr>
            {l.partidas.map((q, j) => <tr key={l.key + j}><td style={q.tipo === "C" ? { paddingLeft: 22 } : null}>{nomeConta(q.conta)}</td><td className="n">{q.tipo === "D" ? brl(q.valor) : ""}</td><td className="n">{q.tipo === "C" ? brl(q.valor) : ""}</td></tr>)}
          </Fragment>
        ))}
      </tbody></table>
    </>
  );
}
