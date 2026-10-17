import { PARAMETROS_PADRAO } from "../../lib/folha.js";
import { TABELAS_2026 } from "../../lib/folhaAtividade.js";
import { MODALIDADES, VERBAS_DIREITO, direitosDe, ROTULO_DIREITO, INCIDENCIAS, OPCOES_INSS_FGTS, OPCOES_IRRF, DOCUMENTOS, PRAZO_PAGAMENTO_DIAS } from "../../lib/rescisao.js";

// Abas "Folha e encargos" e "Rescisão" do menu Tabelas. SÓ LEITURA: os números vêm do mesmo código da conferência.
const T = TABELAS_2026, P = PARAMETROS_PADRAO;
const brl = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const vir = (v) => String(v).replace(".", ",");
const box = { border: "1px solid var(--line)", background: "var(--surface)", marginBottom: 16, padding: "14px 18px" };
const th = { textAlign: "left", fontSize: 11.5, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-soft)", padding: "8px 12px", background: "var(--paper-deep)", borderBottom: "1px solid var(--line)" };
const td = { padding: "8px 12px", borderBottom: "1px solid var(--line)", verticalAlign: "top", fontSize: 13.5 };
const num = { ...td, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" };

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
const Cab = ({ eyebrow, titulo, sub }) => (<><div className="screen-eyebrow">{eyebrow}</div><h2 className="screen-title">{titulo}</h2><p className="screen-sub">{sub}</p></>);

export function TabelaFolhaEncargos() {
  return (
    <>
      <Cab eyebrow="tabelas · folha de pagamento" titulo="Folha e encargos" sub="Parâmetros usados nas etapas 2 e 3. A turma pode usar outros percentuais, definidos pelo professor." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
        <Bloco titulo="Remuneração e descontos">
          <Tabela cab={["Parâmetro", { t: "Valor", n: 1 }]}>
            <tr><td style={td}>Carga horária mensal</td><td style={num}>{P.cargaHoraria} h</td></tr>
            <tr><td style={td}>Adicional noturno</td><td style={num}>{vir(P.adicionalNoturno * 100)}%</td></tr>
            <tr><td style={td}>Hora extra 50% / 100%</td><td style={num}>× 1,5 / × 2</td></tr>
            <tr><td style={td}>DSR (dias úteis / descanso)</td><td style={num}>{P.diasUteisDSR} / {P.diasDescansoDSR}</td></tr>
            <tr><td style={td}>Adicional de periculosidade</td><td style={num}>30%</td></tr>
            <tr><td style={td}>Vale-transporte (desconto do empregado)</td><td style={num}>{T.vtPercentual}% do salário-base</td></tr>
            <tr><td style={td}>Salário-família (por filho até 14 anos)</td><td style={num}>R$ {brl(T.salarioFamilia.cota)}</td></tr>
            <tr><td style={td}>Limite do salário-família</td><td style={num}>R$ {brl(T.salarioFamilia.limite)}</td></tr>
          </Tabela>
        </Bloco>
        <Bloco titulo="Encargos da empresa e provisões">
          <Tabela cab={["Encargo", { t: "Percentual", n: 1 }]}>
            <tr><td style={td}>INSS patronal</td><td style={num}>{vir(P.inss)}%</td></tr>
            <tr><td style={td}>FGTS</td><td style={num}>{vir(P.fgts)}%</td></tr>
            <tr><td style={td}>RAT</td><td style={num}>{vir(P.rat)}%</td></tr>
            <tr><td style={td}>Terceiros</td><td style={num}>{vir(P.terceiros)}%</td></tr>
            <tr><td style={td}>Provisão de férias</td><td style={num}>1/12 + 1/3</td></tr>
            <tr><td style={td}>Provisão de 13º salário</td><td style={num}>1/12</td></tr>
          </Tabela>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>O INSS de 20% é só o patronal. O INSS do empregado está em Tabelas → INSS e IRRF.</p>
        </Bloco>
      </div>
    </>
  );
}

const ROT_INC = Object.fromEntries(OPCOES_INSS_FGTS);
const ROT_IR = Object.fromEntries(OPCOES_IRRF);

export function TabelaRescisao() {
  return (
    <>
      <Cab eyebrow="tabelas · rescisão" titulo="Rescisão trabalhista" sub="Regras e tabelas da etapa 4." />
      <Bloco titulo="Regras de cálculo">
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4, fontSize: 13.5 }}>
          <li><b>Aviso prévio:</b> 30 dias + 3 dias por ano completo de serviço, no máximo 90 dias (Lei 12.506/2011).</li>
          <li><b>Multa do FGTS:</b> 40% na dispensa sem justa causa; 20% no acordo (art. 484-A).</li>
          <li><b>Prazo de pagamento:</b> {PRAZO_PAGAMENTO_DIAS} dias corridos a contar do término do contrato (CLT art. 477 §6º).</li>
        </ul>
      </Bloco>
      <Bloco titulo="Direitos por modalidade">
        <Tabela cab={["Verba", ...MODALIDADES.map((m) => m.nome)]}>
          {VERBAS_DIREITO.map((v) => (
            <tr key={v.key}><td style={td}>{v.nome}</td>{MODALIDADES.map((m) => <td key={m.id} style={td}>{ROTULO_DIREITO[direitosDe(m.id)[v.key]]}</td>)}</tr>
          ))}
        </Tabela>
      </Bloco>
      <Bloco titulo="Incidências por verba">
        <Tabela cab={["Verba", "INSS", "FGTS", "IRRF"]}>
          {INCIDENCIAS.map((i) => <tr key={i.key}><td style={td}>{i.nome}</td><td style={td}>{ROT_INC[i.inss]}</td><td style={td}>{ROT_INC[i.fgts]}</td><td style={td}>{ROT_IR[i.irrf]}</td></tr>)}
        </Tabela>
      </Bloco>
      <Bloco titulo="Documentos e prazos">
        {DOCUMENTOS.map((g) => (
          <div key={g.grupo} style={{ marginBottom: 8 }}><b style={{ fontSize: 13.5 }}>{g.grupo}</b>
            <ul style={{ margin: "2px 0 0", paddingLeft: 20, fontSize: 13.5 }}>{g.itens.map((x) => <li key={x}>{x}</li>)}</ul></div>
        ))}
      </Bloco>
    </>
  );
}
