import { CONTAS_FOLHA, CONTAS_NOVAS } from "../../lib/folha.js";

// Consulta do professor (13/11/2026): os 6 lançamentos contábeis da folha e das provisões, com as contas do Plano de contas.
// SÓ LEITURA: não lê nem grava nada no banco. As contas vêm de CONTAS_FOLHA (as mesmas da conferência dos lançamentos);
// o nome vem do Plano de contas em uso (se a conta ainda não existir nele, a linha avisa).
const C = CONTAS_FOLHA;
const LANC = [
  { n: 1, titulo: "Provisão de salários e remunerações", quando: "No último dia do mês da competência, pelo total da folha.", linhas: [
    ["D", C.despSalarios, "total das remunerações brutas do mês (todos os empregados)"],
    ["C", C.salariosPagar, "mesmo valor"] ] },
  { n: 2, titulo: "Encargos sociais sobre salários", quando: "Mesmo dia, sobre o total das remunerações.", linhas: [
    ["D", C.despEncargos, "INSS patronal + FGTS + RAT + terceiros (soma das 4 linhas de crédito)"],
    ["C", C.inssPagar, "INSS patronal sobre a remuneração"],
    ["C", C.fgtsPagar, "FGTS (8%)"],
    ["C", C.ratPagar, "RAT (alíquota da turma)"],
    ["C", C.terceirosPagar, "terceiros (se a alíquota for 0%, a linha vale 0,00: pode lançar 0,00 ou omitir)"] ] },
  { n: 3, titulo: "Provisão de férias + 1/3 constitucional", quando: "Mesmo dia: 1/12 da remuneração por mês, mais o terço.", linhas: [
    ["D", C.despFerias, "férias provisionadas + 1/3 constitucional"],
    ["C", C.provFerias, "mesmo valor"] ] },
  { n: 4, titulo: "Encargos sobre a provisão de férias", quando: "Mesmo dia, sobre a provisão do lançamento 3.", linhas: [
    ["D", C.despEncargos, "encargos (INSS, FGTS, RAT e terceiros) sobre as férias provisionadas"],
    ["C", C.encFerias, "mesmo valor (conta única de encargos sobre férias)"] ] },
  { n: 5, titulo: "Provisão do 13º salário", quando: "Mesmo dia: 1/12 da remuneração por mês.", linhas: [
    ["D", C.despDecimo, "13º provisionado no mês"],
    ["C", C.prov13, "mesmo valor"] ] },
  { n: 6, titulo: "Encargos sobre a provisão do 13º salário", quando: "Mesmo dia, sobre a provisão do lançamento 5.", linhas: [
    ["D", C.despEncargos, "encargos (INSS, FGTS, RAT e terceiros) sobre o 13º provisionado"],
    ["C", C.enc13, "mesmo valor (conta única de encargos sobre o 13º)"] ] },
];

const box = { border: "1px solid var(--line)", background: "var(--surface)", marginBottom: 16, padding: "14px 18px" };
const td = { padding: "7px 12px", borderBottom: "1px solid var(--line)", verticalAlign: "top", fontSize: 13.5 };

export default function ContabilizacaoFolhaConsulta({ contas }) {
  const nomeDe = (cod) => {
    const c = (contas || []).find((x) => x.codigo === cod);
    if (c) return { nome: c.nome, ok: true };
    const nova = CONTAS_NOVAS.find((x) => x.codigo === cod);
    return { nome: nova ? nova.nome + " (conta nova sugerida)" : "", ok: false };
  };
  const faltam = [...new Set(LANC.flatMap((l) => l.linhas.map((x) => x[1])))].filter((cod) => !nomeDe(cod).ok);
  return (
    <div>
      <div className="screen-eyebrow">consulta · folha de pagamento</div>
      <h2 className="screen-title">Contabilização da folha e das provisões</h2>
      <p className="screen-sub">Os 6 lançamentos do mês, com as contas do Plano de contas. Consulta para a Etapa 3 (professor e alunos). Os valores variam com a folha de cada turma; aqui aparece a conta e de onde vem o valor.</p>
      {faltam.length > 0 && <div className="balance-check bad" style={{ marginBottom: 14 }}>Estas contas ainda não estão no Plano de contas desta base: {faltam.join(", ")}. Avise o professor: sem elas não dá para concluir os lançamentos.</div>}
      {LANC.map((l) => (
        <div key={l.n} style={box}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{l.n}. {l.titulo}</h3>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ink-soft)" }}>{l.quando}</p>
          <div style={{ overflowX: "auto", border: "1px solid var(--line)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={{ ...td, width: 50 }}>D / C</th><th style={{ ...td, width: 90 }}>Código</th><th style={td}>Conta (Plano de contas)</th><th style={td}>Valor</th></tr></thead>
              <tbody>{l.linhas.map(([tipo, cod, valor], i) => {
                const c = nomeDe(cod);
                return (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 700 }}>{tipo}</td>
                    <td style={{ ...td, fontFamily: "var(--mono, monospace)" }}>{cod}</td>
                    <td style={{ ...td, paddingLeft: tipo === "C" ? 28 : 12, color: c.ok ? "inherit" : "var(--red)" }}>{c.nome || "— conta não encontrada —"}</td>
                    <td style={td}>{valor}</td>
                  </tr>);
              })}</tbody>
            </table>
          </div>
        </div>
      ))}
      <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Histórico sugerido no Livro diário: “Folha mês/ano · título do lançamento”. A conferência tolera R$ 0,50 de arredondamento e aceita a ordem das linhas em qualquer sequência.</p>
    </div>
  );
}
