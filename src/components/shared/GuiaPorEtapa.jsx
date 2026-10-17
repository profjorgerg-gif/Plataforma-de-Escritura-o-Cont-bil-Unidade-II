import { CONTAS_FOLHA, CONTAS_NOVAS, PARAMETROS_PADRAO } from "../../lib/folha.js";
import { CONTAS_RESC, CONTAS_NOVAS_RESC } from "../../lib/rescisao.js";

// Abas do "Guia de lançamentos" do projeto inteiro (uma por etapa). SÓ LEITURA: não lê nem grava nada no banco.
// Os códigos das contas vêm das mesmas tabelas que a conferência usa (lib/folha.js e lib/rescisao.js).
const D = { color: "var(--blue)", fontWeight: 600 };
const C = { color: "var(--amber)", fontWeight: 600 };
const mono = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 };
const box = { border: "1px solid var(--line)", background: "var(--surface)", marginBottom: 16, padding: "14px 18px" };
const th = { textAlign: "left", fontSize: 11.5, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-soft)", padding: "8px 12px", background: "var(--paper-deep)", borderBottom: "1px solid var(--line)" };
const td = { padding: "8px 12px", borderBottom: "1px solid var(--line)", verticalAlign: "top", fontSize: 13.5 };

function Tabela({ cab, children }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--line)", margin: "6px 0 10px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{cab.map((c, i) => <th key={i} style={th}>{c}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
const Bloco = ({ titulo, children }) => <div style={box}><h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{titulo}</h3>{children}</div>;
const Cab = ({ eyebrow, titulo, sub }) => (<><div className="screen-eyebrow">{eyebrow}</div><h2 className="screen-title">{titulo}</h2><p className="screen-sub">{sub}</p></>);

function nome(cod, contas) {
  const c = (contas || []).find((x) => x.codigo === cod) || CONTAS_NOVAS.find((x) => x.codigo === cod) || CONTAS_NOVAS_RESC.find((x) => x.codigo === cod);
  return c ? c.nome : "";
}
// várias contas na mesma célula
const Contas = ({ cods, t, contas }) => (
  <>{cods.map((cod) => <div key={cod} style={{ ...mono, ...(t === "D" ? D : C) }}>{cod} {nome(cod, contas)}</div>)}</>
);

export function GuiaEtapa2() {
  return (
    <>
      <Cab eyebrow="guia de lançamentos · etapa 2" titulo="Etapa 2: folha de pagamento (contracheque)" sub="Nesta etapa não há lançamento contábil: você calcula o contracheque de cada empregado." />
      <Bloco titulo="O que fazer">
        <ol style={{ margin: "0 0 0 18px", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <li>Leia o enunciado do empregado (salário, adicionais, horas extras, faltas, dependentes, vale-transporte).</li>
          <li>Siga os passos do contracheque, na ordem da atividade, e digite cada valor.</li>
          <li>Para INSS e IRRF use as tabelas e fórmulas em <b>Tabelas → INSS e IRRF 2026</b>.</li>
          <li>Os lançamentos contábeis da folha só acontecem na Etapa 3 (veja a aba da Etapa 3).</li>
        </ol>
      </Bloco>
    </>
  );
}

export function GuiaEtapa3({ contas }) {
  const F = CONTAS_FOLHA, p = PARAMETROS_PADRAO;
  const lin = [
    ["1. Provisão de salários", [F.despSalarios], [F.salariosPagar], "Total da remuneração da folha."],
    ["2. Encargos sobre salários", [F.despEncargos], [F.inssPagar, F.fgtsPagar, F.ratPagar, F.terceirosPagar], "Base × percentual de cada encargo (INSS, FGTS, RAT, Terceiros); cada um arredondado separadamente."],
    ["3. Provisão de férias + 1/3", [F.despFerias], [F.provFerias], "Remuneração ÷ 12, mais 1/3 desse valor."],
    ["4. Encargos sobre a provisão de férias", [F.despEncargos], [F.encFerias], "Encargos calculados sobre o valor do lançamento 3."],
    ["5. Provisão do 13º salário", [F.despDecimo], [F.prov13], "Remuneração ÷ 12."],
    ["6. Encargos sobre a provisão do 13º", [F.despEncargos], [F.enc13], "Encargos calculados sobre o valor do lançamento 5."],
  ];
  return (
    <>
      <Cab eyebrow="guia de lançamentos · etapa 3" titulo="Etapa 3: folha, provisões e contabilização" sub="Os 6 lançamentos da folha do mês, com as contas e a forma de calcular cada valor." />
      <Bloco titulo="Os 6 lançamentos">
        <Tabela cab={["Lançamento", "Débito", "Crédito", "Como calcular o valor"]}>
          {lin.map((l) => (
            <tr key={l[0]}><td style={td}>{l[0]}</td><td style={td}><Contas cods={l[1]} t="D" contas={contas} /></td><td style={td}><Contas cods={l[2]} t="C" contas={contas} /></td><td style={td}>{l[3]}</td></tr>
          ))}
        </Tabela>
        <p style={{ margin: 0, fontSize: 13.5 }}>Percentuais usados nos encargos (padrão do projeto): INSS {String(p.inss).replace(".", ",")}%, FGTS {p.fgts}%, RAT {p.rat}%, Terceiros {String(p.terceiros).replace(".", ",")}%. Veja em <b>Tabelas → Folha e encargos</b>; a turma pode ter outros percentuais, informados pelo professor.</p>
      </Bloco>
      <Bloco titulo="Lembretes">
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4, fontSize: 13.5 }}>
          <li>Débitos e créditos de cada lançamento precisam fechar com o mesmo total.</li>
          <li>As contas novas (RAT, Terceiros, provisões) estão no Plano de contas, em <b>Tabelas</b>.</li>
        </ul>
      </Bloco>
    </>
  );
}

export function GuiaEtapa4({ contas }) {
  const R = CONTAS_RESC;
  const lin = [
    ["1. Verbas rescisórias", [R.despSalarios, R.despAviso, R.provFerias, R.despFerias, R.prov13, R.despDecimo], [R.rescPagar], "Cada verba na sua conta; férias e 13º baixam a provisão e o que faltar vai à despesa. O crédito é o total bruto."],
    ["2. FGTS rescisório e multa", [R.despEncargos, R.despMulta], [R.fgtsPagar], "FGTS de 8% sobre as verbas e a multa (40% ou 20%)."],
    ["3. Encargos patronais", [R.despEncargos], [R.inssPagar, R.ratPagar, R.terceirosPagar], "Percentuais patronais sobre as verbas que têm incidência."],
    ["4. Pagamento", [R.rescPagar], [R.banco], "Total bruto das verbas pagas ao empregado."],
  ];
  return (
    <>
      <Cab eyebrow="guia de lançamentos · etapa 4" titulo="Etapa 4: rescisão trabalhista" sub="Os lançamentos da rescisão. Partidas com valor zero não entram (ex.: justa causa não tem aviso nem multa)." />
      <Bloco titulo="Os 4 lançamentos">
        <Tabela cab={["Lançamento", "Débito", "Crédito", "Como calcular o valor"]}>
          {lin.map((l) => (
            <tr key={l[0]}><td style={td}>{l[0]}</td><td style={td}><Contas cods={l[1]} t="D" contas={contas} /></td><td style={td}><Contas cods={l[2]} t="C" contas={contas} /></td><td style={td}>{l[3]}</td></tr>
          ))}
        </Tabela>
        <p style={{ margin: 0, fontSize: 13.5 }}>Direitos de cada modalidade, aviso prévio, multa e incidências estão em <b>Tabelas → Rescisão</b>.</p>
      </Bloco>
    </>
  );
}

export function GuiaEtapas56() {
  return (
    <>
      <Cab eyebrow="guia de lançamentos · etapas 5 e 6" titulo="Etapas 5 e 6: análise gerencial" sub="Estas etapas não têm lançamentos contábeis." />
      <Bloco titulo="De onde vêm os números">
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4, fontSize: 13.5 }}>
          <li>A análise usa o <b>balanço patrimonial</b> e a <b>DRE</b> que você montou na Etapa 1.</li>
          <li>Se um valor da análise estiver estranho, volte aos lançamentos da Etapa 1 (aba Etapa 1 deste guia) e confira.</li>
        </ul>
      </Bloco>
    </>
  );
}
