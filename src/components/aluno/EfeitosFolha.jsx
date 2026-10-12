import { fmt, saldoConta } from "../../lib/contabil.js";
import { EstadoGravacao, CaixaTexto, Carregando, useCampos } from "../shared/AgbUI.jsx";

const DESPESAS = ["5.1.02", "5.1.03", "5.1.09", "5.1.11"];
const OBRIGACOES = ["2.1.3.01", "2.1.4.01", "2.1.4.03", "2.1.4.04", "2.1.4.05", "2.1.5.01", "2.1.5.02", "2.1.6.01", "2.1.6.02"];
const PERGUNTAS = [
  ["a", "a) Quais contas patrimoniais foram movimentadas pelos lançamentos da folha e das provisões?"],
  ["b", "b) Em quais grupos do Balanço Patrimonial essas contas são classificadas?"],
  ["c", "c) Quais contas da DRE foram afetadas?"],
  ["d", "d) Como essas provisões alteram o resultado do exercício?"],
  ["e", "e) Como essas provisões alteram o Passivo da empresa?"],
];

export default function EfeitosFolha({ trab, esc }) {
  const campos = useCampos(trab, false);
  if (trab.carregando || !esc.razao) return <Carregando />;
  const linhas = (codigos) => codigos.map((c) => esc.razao[c]).filter((b) => b && b.movimentos.length > 0).map((b) => ({ conta: b.conta, v: saldoConta(b) }));
  const desp = linhas(DESPESAS), obr = linhas(OBRIGACOES);
  const totD = desp.reduce((s, l) => s + l.v, 0), totO = obr.reduce((s, l) => s + l.v, 0);
  const Quadro = ({ titulo, itens, total, vazio }) => (
    <div className="panel">
      <div className="panel-head"><h3>{titulo}</h3></div>
      <div className="panel-body" style={{ padding: 0 }}>
        {itens.length === 0 ? <div className="empty-state">{vazio}</div> : (
          <table><tbody>
            {itens.map((l) => <tr key={l.conta.codigo}><td className="mono" style={{ width: 90 }}>{l.conta.codigo}</td><td>{l.conta.nome}</td><td className="num mono">{fmt(l.v)}</td></tr>)}
            <tr style={{ fontWeight: 700, background: "var(--paper)" }}><td colSpan={2}>Total</td><td className="num mono">{fmt(total)}</td></tr>
          </tbody></table>
        )}
      </div>
    </div>
  );
  return (
    <>
      <div className="screen-eyebrow">etapa 3 · contabilidade avançada</div>
      <h2 className="screen-title">Efeitos nas demonstrações</h2>
      <p className="screen-sub">Veja o que os lançamentos <b>aprovados</b> da folha já fizeram na DRE e no Balanço e responda às perguntas.</p>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />
      <Quadro titulo="DRE — despesas de pessoal reconhecidas (lançamentos aprovados)" itens={desp} total={totD} vazio="Nenhum lançamento da folha aprovado ainda. Os valores aparecem depois que o professor aprovar." />
      <Quadro titulo="Balanço — obrigações trabalhistas no Passivo circulante (lançamentos aprovados)" itens={obr} total={totO} vazio="Nenhum lançamento da folha aprovado ainda." />
      <div className="panel"><div className="panel-body">
        {PERGUNTAS.map(([k, q]) => <CaixaTexto key={k} rotulo={q} linhas={3} valor={campos.get("efeitos", k)} onChange={(v) => campos.set("efeitos", k, v)} />)}
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>O professor consegue ler o que você escreve aqui.</div>
      </div></div>
    </>
  );
}
