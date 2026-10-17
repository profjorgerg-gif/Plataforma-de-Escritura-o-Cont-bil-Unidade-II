import { TABELAS_2026, calcularINSS, faixaIRRF, reducaoIRRF } from "../../lib/folhaAtividade.js";

// Consulta "Tabelas INSS e IRRF" (vigência em lib/folhaAtividade.js → TABELAS_2026). SÓ LEITURA: não lê nem grava nada no banco.
// Os números vêm da MESMA tabela usada na conferência do contracheque: mudou lá, muda aqui.
// O exemplo é fixo (valores inventados) e não usa os casos dos empregados da atividade.

const T = TABELAS_2026;
const brl = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (a) => (a * 100).toFixed(a * 1000 % 10 ? 1 : 0).replace(".", ",") + "%";
const arred = (v) => Math.round((v + 1e-9) * 100) / 100;
const trunc = (v) => Math.floor((v + 1e-9) * 100) / 100;

const box = { border: "1px solid var(--line)", background: "var(--surface)", marginBottom: 16, padding: "14px 18px" };
const th = { textAlign: "left", fontSize: 11.5, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-soft)", padding: "8px 12px", background: "var(--paper-deep)", borderBottom: "1px solid var(--line)" };
const td = { padding: "8px 12px", borderBottom: "1px solid var(--line)", verticalAlign: "top", fontSize: 13.5 };
const num = { ...td, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" };
const tot = { fontWeight: 600, borderTop: "2px solid var(--line)" };

function Tabela({ cab, children }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--line)", margin: "6px 0 10px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{cab.map((c, i) => <th key={i} style={{ ...th, ...(c.n ? { textAlign: "right" } : null) }}>{c.t || c}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
const Bloco = ({ titulo, children }) => <div style={box}><h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{titulo}</h3>{children}</div>;
const Lista = ({ children }) => <ul style={{ margin: "6px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4, fontSize: 13.5 }}>{children}</ul>;

export default function TabelasInssIrrf() {
  // INSS: parte de cada faixa, INSS máximo da faixa e parcela a deduzir (derivados da própria tabela)
  let ant = 0, dedAcum = 0, aliqAnt = 0;
  const faixas = T.inss.map((f, i) => {
    const parte = arred(f.ate - ant);
    const max = arred(parte * f.aliq);
    if (i > 0) dedAcum += ant * (f.aliq - aliqAnt);
    const r = { de: i === 0 ? 0 : arred(ant + 0.01), ate: f.ate, aliq: f.aliq, parte, max, ded: arred(dedAcum) };
    ant = f.ate; aliqAnt = f.aliq;
    return r;
  });
  const teto = T.inss[T.inss.length - 1].ate;
  const tetoINSS = arred(teto * T.inss[T.inss.length - 1].aliq - faixas[faixas.length - 1].ded);

  // exemplo fixo: remuneração 3.600,00, sem dependentes
  const rem = 3600;
  const inss = calcularINSS(rem);
  const partes = faixas.filter((f) => rem > (f.de ? f.de - 0.01 : 0)).map((f) => ({ ...f, v: trunc((Math.min(rem, f.ate) - (f.de ? f.de - 0.01 : 0)) * f.aliq) }));
  const inssB = arred(rem * 0.12 - faixas[2].ded);
  const simpl = T.descontoSimplificado > inss;
  const dedEx = simpl ? T.descontoSimplificado : inss;
  const baseIR = arred(rem - dedEx);
  const fx = faixaIRRF(baseIR);
  const red = arred(reducaoIRRF(rem, fx.imposto));
  const irrf = arred(fx.imposto - red);
  const r = T.reducao;

  return (
    <>
      <div className="screen-eyebrow">consulta · folha de pagamento</div>
      <h2 className="screen-title">Tabelas INSS e IRRF {T.vigencia}</h2>
      <p className="screen-sub">Consulta rápida para calcular o contracheque. Vigência: janeiro a dezembro de {T.vigencia}.</p>

      <Bloco titulo="INSS do empregado · Forma 1: cálculo progressivo (por faixa)">
        <Tabela cab={["Faixa (R$)", { t: "Alíquota", n: 1 }, { t: "Parte da faixa (R$)", n: 1 }, { t: "INSS máx. da faixa", n: 1 }]}>
          {faixas.map((f, i) => (
            <tr key={i}><td style={td}>{i === 0 ? "Até " + brl(f.ate) : brl(f.de) + " a " + brl(f.ate)}</td><td style={num}>{pct(f.aliq)}</td><td style={num}>{brl(f.parte)}</td><td style={num}>{brl(f.max)}</td></tr>
          ))}
          <tr style={tot}><td style={td} colSpan={3}>Teto (desconto máximo)</td><td style={num}>{brl(tetoINSS)}</td></tr>
        </Tabela>
        <Lista>
          <li>Cada parte do salário paga a alíquota da sua faixa; some os valores.</li>
          <li>Fórmula: Σ (parte do salário na faixa × alíquota). Cada faixa é truncada em 2 casas (como no eSocial). É a forma que o sistema usa na conferência.</li>
          <li>O teto de {brl(tetoINSS)} é o valor oficial; somar as faixas arredondadas pode dar 1 ou 2 centavos a mais. No cálculo do salário, o sistema trunca cada faixa (centavos podem diferir em até R$ 0,02).</li>
        </Lista>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "8px 0 0" }}>Fonte: Portaria Interministerial MPS/MF nº 13/2026.</p>
      </Bloco>

      <Bloco titulo="INSS do empregado · Forma 2: tabela com parcela a deduzir (cálculo rápido)">
        <Tabela cab={["Salário de contribuição (R$)", { t: "Alíquota", n: 1 }, { t: "Parcela a deduzir (R$)", n: 1 }]}>
          {faixas.map((f, i) => (
            <tr key={i}><td style={td}>{i === 0 ? "Até " + brl(f.ate) : brl(f.de) + " a " + brl(f.ate)}</td><td style={num}>{pct(f.aliq)}</td><td style={num}>{brl(f.ded)}</td></tr>
          ))}
        </Tabela>
        <Lista>
          <li>Fórmula: salário × alíquota da faixa − parcela a deduzir (uma conta só).</li>
          <li>Mesmo resultado da Forma 1; pode diferir em centavos por arredondamento.</li>
          <li>Exemplo: {brl(rem)} × 12% − {brl(faixas[2].ded)} = {brl(inssB)} (a Forma 1 dá {brl(inss)}).</li>
        </Lista>
      </Bloco>

      <Bloco titulo="IRRF mensal">
        <Tabela cab={["Base de cálculo (R$)", { t: "Alíquota", n: 1 }, { t: "Parcela a deduzir", n: 1 }]}>
          {T.irrf.map((x, i) => {
            const de = i === 0 ? 0 : arred(T.irrf[i - 1].ate + 0.01);
            return <tr key={i}><td style={td}>{i === 0 ? "Até " + brl(x.ate) : x.ate === Infinity ? "Acima de " + brl(T.irrf[i - 1].ate) : brl(de) + " a " + brl(x.ate)}</td><td style={num}>{x.aliq === 0 ? "isento" : pct(x.aliq)}</td><td style={num}>{brl(x.ded)}</td></tr>;
          })}
        </Tabela>
        <Lista>
          <li>Dedução por dependente: R$ {brl(T.deducaoDependente)}.</li>
          <li>Desconto simplificado: R$ {brl(T.descontoSimplificado)} (vale o que for maior: simplificado ou INSS + dependentes).</li>
          <li>Imposto = base × alíquota − parcela a deduzir.</li>
        </Lista>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "8px 0 0" }}>Fonte: tabela da Receita Federal para {T.vigencia}.</p>
      </Bloco>

      <Bloco titulo="Redução do IRRF (Lei 15.270/2025)">
        <Lista>
          <li>Rendimento tributável até <b>R$ {brl(r.limiteIsento)}</b>: o IRRF é zerado.</li>
          <li>De <b>R$ {brl(r.limiteIsento + 0.01)} a R$ {brl(r.limiteFim)}</b>: redução = {brl(r.a)} − {String(r.b).replace(".", ",")} × rendimento tributável.</li>
          <li>Acima de <b>R$ {brl(r.limiteFim)}</b>: não há redução.</li>
          <li>A redução usa o rendimento tributável <b>sem</b> descontar o INSS e nunca passa do imposto calculado.</li>
        </Lista>
      </Bloco>

      <Bloco titulo="Fórmulas para o cálculo">
        <p style={{ margin: "0 0 4px", color: "var(--ink-soft)", fontSize: 13.5 }}>Passo a passo, na ordem em que o contracheque é calculado.</p>
        <Tabela cab={["Passo", "Fórmula"]}>
          {[
            ["1. Remuneração bruta", "salário + adicional + horas extras + DSR das horas extras"],
            ["2. Faltas injustificadas", "(a) [(salário + adicional) ÷ 30] × faltas + (b) [(salário + adicional) ÷ 30] × repousos perdidos + (c) (horas extras ÷ dias úteis) × repousos perdidos. Falta na semana também perde o repouso (critério didático do projeto)."],
            ["3. Remuneração tributável", "remuneração bruta − faltas (é a base do INSS)"],
            ["4. INSS do empregado", "Forma 1: Σ (parte da base em cada faixa × alíquota). Forma 2: base × alíquota − parcela a deduzir. Base limitada ao teto de " + brl(teto) + "."],
            ["5. Parte da faixa", "mín(base; limite da faixa) − limite da faixa anterior"],
            ["6. Dedução dos dependentes", "nº de dependentes × " + brl(T.deducaoDependente)],
            ["7. Dedução do IRRF", "maior entre " + brl(T.descontoSimplificado) + " (simplificado) e INSS + dependentes"],
            ["8. Base do IRRF", "remuneração tributável − dedução do passo 7"],
            ["9. Imposto da tabela", "base do IRRF × alíquota − parcela a deduzir (mínimo 0)"],
            ["10. Redução (Lei 15.270)", "até " + brl(r.limiteIsento) + ": zera o imposto · de " + brl(r.limiteIsento + 0.01) + " a " + brl(r.limiteFim) + ": " + brl(r.a) + " − " + String(r.b).replace(".", ",") + " × remuneração tributável · acima: 0"],
            ["11. IRRF a descontar", "imposto da tabela − redução (mínimo 0)"],
            ["12. Salário-família", "nº de filhos até 14 anos × " + brl(T.salarioFamilia.cota) + ", se a remuneração tributável for até " + brl(T.salarioFamilia.limite)],
            ["13. Vale-transporte", T.vtPercentual + "% do salário-base (limitado ao custo do vale, se informado)"],
            ["14. Salário líquido", "(remuneração bruta + salário-família) − (faltas + INSS + IRRF + vale-transporte)"],
            ["15. FGTS (empresa)", T.fgtsPercentual + "% da remuneração tributável (não é desconto do empregado)"],
          ].map(([a, b], i) => <tr key={i}><td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>{a}</td><td style={td}>{b}</td></tr>)}
        </Tabela>
      </Bloco>

      <Bloco titulo="Exemplo de cálculo (valores inventados)">
        <p style={{ margin: "0 0 4px", color: "var(--ink-soft)", fontSize: 13.5 }}>Remuneração de R$ {brl(rem)}, sem dependentes e sem faltas.</p>
        <Tabela cab={["Cálculo", { t: "R$", n: 1 }]}>
          {partes.map((f, i) => <tr key={i}><td style={td}>INSS faixa {i + 1}: {i === 0 ? brl(f.ate) : "(" + (f.ate < rem ? brl(f.ate) : brl(rem)) + " − " + brl(f.de - 0.01) + ")"} × {pct(f.aliq)}</td><td style={num}>{brl(f.v)}</td></tr>)}
          <tr style={tot}><td style={td}>INSS do empregado</td><td style={num}>{brl(inss)}</td></tr>
          <tr><td style={td}>Conferência pela Forma 2: {brl(rem)} × 12% − {brl(faixas[2].ded)}</td><td style={num}>{brl(inssB)}</td></tr>
          <tr><td style={td}>Dedução: {simpl ? "simplificado (" + brl(T.descontoSimplificado) + ") é maior que o INSS (" + brl(inss) + ")" : "INSS é maior que o simplificado"}</td><td style={num}>{brl(dedEx)}</td></tr>
          <tr><td style={td}>Base do IRRF: {brl(rem)} − {brl(dedEx)}</td><td style={num}>{brl(baseIR)}</td></tr>
          <tr><td style={td}>Imposto: {brl(baseIR)} × {pct(fx.aliq)} − {brl(fx.ded)}</td><td style={num}>{brl(fx.imposto)}</td></tr>
          <tr><td style={td}>Redução: {rem <= r.limiteIsento ? "rendimento até " + brl(r.limiteIsento) + " zera o IRRF" : "conforme a regra"}</td><td style={num}>− {brl(red)}</td></tr>
          <tr style={tot}><td style={td}>IRRF a descontar</td><td style={num}>{brl(irrf)}</td></tr>
        </Tabela>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "4px 0 0" }}>O exemplo é fixo e não usa os casos dos empregados da atividade.</p>
      </Bloco>
    </>
  );
}
