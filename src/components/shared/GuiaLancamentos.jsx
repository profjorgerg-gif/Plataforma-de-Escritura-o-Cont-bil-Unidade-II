import { useState } from "react";

// Guia de lançamentos (compras e vendas). SÓ LEITURA: não lê nem grava nada no banco.
// Os valores dos exemplos são inventados; nunca saem das notas cadastradas pelo professor.
// As contas seguem a conferência automática da Fila de correção (lib/conferenciaFila.js) e o plano de contas oficial.

const D = { color: "var(--blue)", fontWeight: 600 };
const C = { color: "var(--amber)", fontWeight: 600 };
const mono = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 };
const box = { border: "1px solid var(--line)", background: "var(--surface)", marginBottom: 16 };
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
const Conta = ({ cod, nome, t }) => <span style={{ ...mono, ...(t === "D" ? D : t === "C" ? C : null) }}>{cod} {nome}</span>;

function Bloco({ titulo, children }) {
  return <div style={{ ...box, padding: "14px 18px" }}><h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{titulo}</h3>{children}</div>;
}

export default function GuiaLancamentos({ professor = false }) {
  return (
    <>
      <div className="screen-eyebrow">consulta · lançamentos</div>
      <h2 className="screen-title">Guia de lançamentos: compras e vendas</h2>
      <p className="screen-sub">As contas certas de cada lançamento de uma nota fiscal. Consulte antes de escolher débito e crédito.</p>
      <div className="helper-note" style={{ marginBottom: 14 }}>Os números dos exemplos são <b>inventados</b> (nota de R$ 10.000,00, com alíquotas só para ilustrar). Na sua atividade, use sempre os valores da nota.</div>

      <Bloco titulo="A regra em duas linhas">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          <div style={{ border: "1px solid var(--line)", padding: "10px 12px", minWidth: 0 }}><b>Compra de mercadoria para revenda.</b> O imposto da nota é <b>a recuperar</b> (ativo). A mercadoria entra pelo valor da nota sem os impostos recuperáveis, e a dívida é com o fornecedor.</div>
          <div style={{ border: "1px solid var(--line)", padding: "10px 12px", minWidth: 0 }}><b>Venda de mercadoria.</b> O imposto da nota é <b>a recolher</b> (passivo) e aparece também como <b>dedução</b> da receita. O cliente deve o valor total da nota.</div>
        </div>
        <p style={{ margin: "10px 0 0" }}><b>Nesta etapa, toda compra e toda venda é a prazo.</b> Na compra o crédito vai para Duplicatas a Pagar, e na venda o débito vai para Duplicatas a Receber. Nunca use Caixa ou Banco nesses lançamentos.</p>
      </Bloco>

      <Bloco titulo="Compras (nota de entrada)">
        <Tabela cab={["Lançamento", "Débito", "Crédito", "Valor"]}>
          <tr><td style={td}>Compra principal</td><td style={td}><Conta t="D" cod="1.1.3.01" nome="Mercadorias para Revenda" /></td><td style={td}><Conta t="C" cod="2.1.1.01" nome="Duplicatas a Pagar" /><br /><span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>ou 2.1.1.02 Fornecedores Diversos</span></td><td style={td}>Crédito: total da NF. Débito: total da NF menos os impostos lançados junto.</td></tr>
          <tr><td style={td}>ICMS</td><td style={td}><Conta t="D" cod="1.1.2.11" nome="ICMS a Recuperar" /></td><td style={td}><Conta t="C" cod="1.1.3.01" nome="Mercadorias para Revenda" /></td><td style={td}>ICMS da NF</td></tr>
          <tr><td style={td}>PIS</td><td style={td}><Conta t="D" cod="1.1.2.14" nome="PIS a Recuperar" /></td><td style={td}><Conta t="C" cod="1.1.3.01" nome="Mercadorias para Revenda" /></td><td style={td}>PIS da NF</td></tr>
          <tr><td style={td}>COFINS</td><td style={td}><Conta t="D" cod="1.1.2.15" nome="COFINS a Recuperar" /></td><td style={td}><Conta t="C" cod="1.1.3.01" nome="Mercadorias para Revenda" /></td><td style={td}>COFINS da NF</td></tr>
          <tr><td style={td}>Desconto obtido <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>(só se a NF tiver)</span></td><td style={td}><span style={{ ...mono, ...D }}>Fornecedores</span></td><td style={td}><Conta t="C" cod="4.3.03" nome="Descontos Obtidos" /></td><td style={td}>Desconto da NF</td></tr>
        </Tabela>
        <p className="helper-note" style={{ margin: "0 0 10px" }}>Pode lançar tudo em um lançamento só, ou em lançamentos separados (a compra e depois cada imposto). As duas formas chegam ao mesmo resultado.</p>
        <b style={{ fontSize: 13.5 }}>Exemplo, em um lançamento só</b>
        <Tabela cab={["Conta", { t: "Débito", n: 1 }, { t: "Crédito", n: 1 }]}>
          <tr><td style={td}><Conta t="D" cod="1.1.3.01" nome="Mercadorias para Revenda" /></td><td style={num}>7.875,00</td><td style={num}></td></tr>
          <tr><td style={td}><Conta t="D" cod="1.1.2.11" nome="ICMS a Recuperar" /></td><td style={num}>1.200,00</td><td style={num}></td></tr>
          <tr><td style={td}><Conta t="D" cod="1.1.2.14" nome="PIS a Recuperar" /></td><td style={num}>165,00</td><td style={num}></td></tr>
          <tr><td style={td}><Conta t="D" cod="1.1.2.15" nome="COFINS a Recuperar" /></td><td style={num}>760,00</td><td style={num}></td></tr>
          <tr><td style={{ ...td, paddingLeft: 32 }}><Conta t="C" cod="2.1.1.01" nome="Duplicatas a Pagar" /></td><td style={num}></td><td style={num}>10.000,00</td></tr>
          <tr style={{ fontWeight: 700 }}><td style={td}>Totais</td><td style={num}>10.000,00</td><td style={num}>10.000,00</td></tr>
        </Tabela>
      </Bloco>

      <Bloco titulo="Vendas (nota de saída)">
        <Tabela cab={["Lançamento", "Débito", "Crédito", "Valor"]}>
          <tr><td style={td}>Venda principal</td><td style={td}><Conta t="D" cod="1.1.2.01" nome="Duplicatas a Receber" /><br /><span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>ou 1.1.2.02 Clientes</span></td><td style={td}><Conta t="C" cod="4.1.1.01" nome="Receita de Vendas de Mercadorias" /></td><td style={td}>Total da NF</td></tr>
          <tr><td style={td}>ICMS sobre vendas</td><td style={td}><Conta t="D" cod="4.2.01" nome="ICMS sobre Vendas" /></td><td style={td}><Conta t="C" cod="2.1.8.04" nome="ICMS a recolher" /></td><td style={td}>ICMS da NF</td></tr>
          <tr><td style={td}>PIS e COFINS sobre vendas</td><td style={td}><Conta t="D" cod="4.2.02" nome="PIS/COFINS sobre Vendas" /></td><td style={td}><Conta t="C" cod="2.1.8.05" nome="PIS a recolher" /><br /><Conta t="C" cod="2.1.8.06" nome="COFINS a recolher" /></td><td style={td}>PIS + COFINS da NF</td></tr>
          <tr><td style={td}>Desconto incondicional <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>(só se a NF tiver)</span></td><td style={td}><Conta t="D" cod="4.2.04" nome="Descontos Incondicionais" /></td><td style={td}><span style={{ ...mono, ...C }}>Clientes / Duplicatas a Receber</span></td><td style={td}>Desconto da NF</td></tr>
        </Tabela>
        <b style={{ fontSize: 13.5 }}>Exemplo</b>
        <Tabela cab={["Conta", { t: "Débito", n: 1 }, { t: "Crédito", n: 1 }]}>
          <tr><td style={td}><Conta t="D" cod="1.1.2.01" nome="Duplicatas a Receber" /></td><td style={num}>10.000,00</td><td style={num}></td></tr>
          <tr><td style={{ ...td, paddingLeft: 32 }}><Conta t="C" cod="4.1.1.01" nome="Receita de Vendas de Mercadorias" /></td><td style={num}></td><td style={num}>10.000,00</td></tr>
          <tr><td style={td}><Conta t="D" cod="4.2.01" nome="ICMS sobre Vendas" /></td><td style={num}>1.800,00</td><td style={num}></td></tr>
          <tr><td style={{ ...td, paddingLeft: 32 }}><Conta t="C" cod="2.1.8.04" nome="ICMS a recolher" /></td><td style={num}></td><td style={num}>1.800,00</td></tr>
          <tr><td style={td}><Conta t="D" cod="4.2.02" nome="PIS/COFINS sobre Vendas" /></td><td style={num}>925,00</td><td style={num}></td></tr>
          <tr><td style={{ ...td, paddingLeft: 32 }}><Conta t="C" cod="2.1.8.05" nome="PIS a recolher" /></td><td style={num}></td><td style={num}>165,00</td></tr>
          <tr><td style={{ ...td, paddingLeft: 32 }}><Conta t="C" cod="2.1.8.06" nome="COFINS a recolher" /></td><td style={num}></td><td style={num}>760,00</td></tr>
          <tr style={{ fontWeight: 700 }}><td style={td}>Totais</td><td style={num}>12.725,00</td><td style={num}>12.725,00</td></tr>
        </Tabela>
      </Bloco>

      <Bloco titulo="Erros que o sistema devolve">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
          <div style={{ minWidth: 0 }}><b>Na compra</b><ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
            <li>Conta de venda: Clientes, Duplicatas a Receber ou Receita.</li>
            <li>Crédito em Caixa ou Banco: a compra é a prazo.</li>
            <li>Imposto a recolher no lugar de imposto a recuperar.</li>
            <li>Valor a pagar ou valor em Mercadorias diferente da nota.</li>
          </ul></div>
          <div style={{ minWidth: 0 }}><b>Na venda</b><ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
            <li>Fornecedores no crédito.</li>
            <li>Débito em Caixa ou Banco: a venda é a prazo.</li>
            <li>Imposto a recuperar no lugar de imposto a recolher.</li>
            <li>Desconto creditado em Receita (ele reduz o valor a receber).</li>
          </ul></div>
          <div style={{ minWidth: 0 }}><b>Nos dois</b><ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
            <li>Desconto na conta errada: saída usa 4.2.04, entrada usa 4.3.03.</li>
            <li>Lançamento sem a nota de origem.</li>
            <li>Lançamento repetido para a mesma nota.</li>
          </ul></div>
        </div>
      </Bloco>

      <Bloco titulo="Antes de enviar, confira">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>A nota é de <b>entrada</b> (compra) ou de <b>saída</b> (venda)?</li>
          <li>Débito e crédito têm o mesmo total?</li>
          <li>O imposto está na conta certa: a recuperar na compra, a recolher na venda?</li>
          <li>O valor de cada imposto é o que está na nota?</li>
          <li>A nota tem desconto? Então falta o lançamento do desconto.</li>
        </ul>
      </Bloco>

      {professor && (
        <div style={{ ...box, padding: "14px 18px", borderLeft: "3px solid var(--green)" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Para o professor: como o sistema confere</h3>
          <p style={{ marginTop: 0 }}>A Fila de correção compara cada lançamento com a nota cadastrada em Documentos fiscais e sugere um resultado. Quem decide é você.</p>
          <Tabela cab={["Resultado", "Quando aparece"]}>
            <tr><td style={td}><b style={{ color: "var(--green)" }}>✓ confere</b></td><td style={td}>Contas do tipo certo e valores iguais aos da nota (tolerância de R$ 0,02).</td></tr>
            <tr><td style={td}><b style={{ color: "var(--red)" }}>✗ devolver</b></td><td style={td}>Conta de outro tipo (compra com conta de venda e o inverso), valor diferente, desconto na conta errada, sem nota de origem ou duplicado.</td></tr>
            <tr><td style={td}><b style={{ color: "var(--amber)" }}>⚪ confira</b></td><td style={td}>Pode ter motivo: pagamento à vista (Caixa ou Banco), ICMS-ST a Recuperar, débito em outra conta de estoque quando a nota não é de revenda, nota com desconto ou IPI na compra.</td></tr>
          </Tabela>
          <b style={{ fontSize: 13.5 }}>O que vale saber ao orientar</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
            <li>A conferência é por <b>tipo de conta</b> (por exemplo, qualquer 2.1.1.* na compra), não por uma conta única.</li>
            <li>No desconto da compra e no PIS/COFINS da venda, o sistema confere a conta do desconto ou da dedução e o valor, e não a outra perna do lançamento.</li>
            <li>Notas com desconto ou IPI nunca são devolvidas sozinhas na compra: ficam em ⚪ para você.</li>
            <li>O valor esperado sai da NF cadastrada. Se o total da NF no gabarito estiver errado, a conferência erra junto: use "Conferir gabaritos" antes de corrigir, com backup.</li>
          </ul>
        </div>
      )}
    </>
  );
}

// Botão que abre o guia POR CIMA da tela atual (janela). Fechar volta exatamente para onde o aluno estava:
// a tela de baixo continua montada, então nada do que ele digitou se perde. Não grava nada.
export function BotaoGuiaLancamentos({ rotulo = "📘 Guia de lançamentos" }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" className="btn secondary no-print" style={{ padding: "5px 12px", fontSize: 13 }} onClick={() => setAberto(true)}>{rotulo}</button>
      {aberto && (
        <div className="modal-backdrop no-print" role="dialog" aria-modal="true" aria-label="Guia de lançamentos" onClick={(e) => { if (e.target === e.currentTarget) setAberto(false); }}>
          <div className="modal" style={{ width: 900, maxHeight: "88vh" }}>
            <div className="modal-head" style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <h3>Guia de lançamentos</h3>
              <button type="button" className="modal-close" onClick={() => setAberto(false)}>fechar ✕</button>
            </div>
            <div className="modal-body"><GuiaLancamentos /></div>
          </div>
        </div>
      )}
    </>
  );
}
