import { TABELAS_2026 } from "../../lib/folhaAtividade.js";
import { PARAMETROS_PADRAO } from "../../lib/folha.js";

// Aba "Fórmulas da folha" (2026-10-19): fórmulas completas das etapas 2 e 3, iguais para aluno e professor. SÓ LEITURA: não lê nem grava nada no banco.
// Os números vêm de TABELAS_2026 e PARAMETROS_PADRAO (os mesmos usados na conferência do contracheque).
const T = TABELAS_2026;
const brl = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const teto = T.inss[T.inss.length - 1].ate;
const r = T.reducao;

const box = { border: "1px solid var(--line)", background: "var(--surface)", marginBottom: 16, padding: "14px 18px" };
const td = { padding: "8px 12px", borderBottom: "1px solid var(--line)", verticalAlign: "top", fontSize: 13.5 };

function Bloco({ titulo, linhas, nota }) {
  return (
    <div style={box}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{titulo}</h3>
      <div style={{ overflowX: "auto", border: "1px solid var(--line)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>{linhas.map(([a, b], i) => <tr key={i}><td style={{ ...td, fontWeight: 600, width: "28%", minWidth: 150 }}>{a}</td><td style={td}>{b}</td></tr>)}</tbody>
        </table>
      </div>
      {nota && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>{nota}</p>}
    </div>
  );
}

export default function FormulasFolha() {
  return (
    <div>
      <h2 className="screen-title">Fórmulas da folha</h2>
      <p className="screen-sub">Etapas 2 e 3 · competência {T.vigencia}. Aplicação ao empregado mensalista. Confira as condições de cada exercício no enunciado.</p>

      <Bloco titulo="1 · Adicionais e hora integrada" linhas={[
        ["Insalubridade", "salário mínimo (R$ " + brl(PARAMETROS_PADRAO.salarioMinimo) + ") × percentual (10%, 20% ou 40%)"],
        ["Periculosidade", "salário-base × 30%"],
        ["Salário integrado", "salário-base + adicional (cada empregado tem no máximo um adicional)"],
        ["HTI", "salário integrado ÷ carga horária mensal. Não arredonde: use 4 casas (ex.: 16,6459)"],
      ]} />

      <Bloco titulo="2 · Horas extras e remuneração bruta" linhas={[
        ["HE 50%", "horas × HTI × 1,5"],
        ["HE 100%", "horas × HTI × 2"],
        ["HE noturna 50%", "horas × HTI × 1,20 × 1,5 (critério do projeto)"],
        ["HE noturna 100%", "horas × HTI × 1,20 × 2"],
        ["Total de horas extras", "HE 50% + HE 100% + HE noturnas 50% e 100%"],
        ["DSR sobre horas extras", "(total de horas extras ÷ dias úteis) × repousos. Use os dias úteis e repousos do enunciado"],
        ["Remuneração bruta", "salário-base + adicional + total de horas extras + DSR"],
      ]} />

      <Bloco titulo="3 · Faltas e remuneração tributável" linhas={[
        ["Dias de falta", "(salário integrado ÷ 30) × dias de falta"],
        ["DSR fixo perdido", "(salário integrado ÷ 30) × repousos perdidos (um por semana com falta)"],
        ["Reflexo variável perdido", "(total de horas extras ÷ dias úteis) × repousos perdidos"],
        ["Total das faltas", "soma dos três itens acima"],
        ["Remuneração tributável", "remuneração bruta − total das faltas (base de INSS, IRRF e FGTS nos exercícios)"],
      ]} />

      <Bloco titulo="4 · INSS do empregado" linhas={[
        ["Base", "menor valor entre a remuneração tributável e R$ " + brl(teto) + " (teto)"],
        ["Parcela da faixa", "truncar em 2 casas (parte da base na faixa × alíquota da faixa)"],
        ["INSS", "soma das parcelas das faixas alcançadas"],
      ]} nota="A tabela com parcela a deduzir (cálculo rápido) pode diferir em até R$ 0,02 deste cálculo. Use um método só na folha inteira; o gabarito usa o cálculo por faixa." />

      <Bloco titulo="5 · IRRF e redução (Lei 15.270/2025)" linhas={[
        ["Dedução escolhida", "maior entre R$ " + brl(T.descontoSimplificado) + " (simplificado) e INSS + dependentes × R$ " + brl(T.deducaoDependente)],
        ["Base do IRRF", "maior entre zero e (remuneração tributável − dedução escolhida)"],
        ["Imposto da tabela", "maior entre zero e (base × alíquota da faixa − parcela a deduzir)"],
        ["Redução, até R$ " + brl(r.limiteIsento), "igual ao imposto da tabela (IRRF = 0)"],
        ["Redução, R$ " + brl(r.limiteIsento + 0.01) + " a R$ " + brl(r.limiteFim), "menor entre o imposto e (" + brl(r.a) + " − " + String(r.b).replace(".", ",") + " × remuneração tributável)"],
        ["Redução, acima de R$ " + brl(r.limiteFim), "zero"],
        ["IRRF a descontar", "maior entre zero e (imposto da tabela − redução)"],
      ]} nota="A faixa da redução usa a remuneração tributável sem descontar o INSS. A faixa da tabela usa a base do IRRF." />

      <Bloco titulo="6 · Vale-transporte, salário-família e fechamento" linhas={[
        ["Vale-transporte", "menor entre (salário-base × " + T.vtPercentual + "%) e o custo mensal do vale; sem opção, zero"],
        ["Salário-família", "filhos até 14 anos × R$ " + brl(T.salarioFamilia.cota) + ", se a remuneração bruta (antes das faltas) for até R$ " + brl(T.salarioFamilia.limite) + "; senão, zero"],
        ["Total de proventos", "remuneração bruta + salário-família"],
        ["Total de descontos", "total das faltas + INSS + IRRF + vale-transporte"],
        ["Salário líquido", "total de proventos − total de descontos"],
        ["FGTS (empresa)", "remuneração tributável × " + T.fgtsPercentual + "%; não entra nos descontos do empregado"],
      ]} />

      <div style={box}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>7 · Arredondamento</h3>
        <p style={{ margin: 0, fontSize: 13.5 }}>Arredonde cada resultado a centavos em cada etapa (cada tipo de hora extra, o total, o DSR, a bruta). A única exceção é o INSS, truncado por faixa. A HTI não se arredonda. A conferência aceita diferença de até R$ 0,02.</p>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Fontes: Receita Federal (tabelas 2026), INSS (tabela de contribuição e salário-família), eSocial (truncamento por faixa), CLT arts. 73, 192 e 193, Lei 605/1949.</p>
    </div>
  );
}
