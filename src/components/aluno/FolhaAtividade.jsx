import { useMemo, useState } from "react";
import { fmt } from "../../lib/contabil.js";
import { calcularContracheque, PASSOS_CONTRACHEQUE, empregadoDeCampos, situacaoEmpregado, resumoAtividade, valorDoCampo, lerValor, TOLERANCIA_PEDAGOGICA, TABELAS_2026 } from "../../lib/folhaAtividade.js";
import { EstadoGravacao, MeuCalculo, CaixaTexto, Carregando, useCampos } from "../shared/AgbUI.jsx";
import EnunciadoEmpregado from "./EnunciadoEmpregado.jsx";
import { folhaEmUso } from "../../lib/folha.js";
import { casoDoEmpregado } from "../../lib/enunciadosCA.js";

const SEC = "fp";
export default function FolhaAtividade({ trab, ca, matricula }) {
  const campos = useCampos(trab, false);
  const [sel, setSel] = useState(null);
  const empregados = (ca.config && ca.config.empregados) || [];
  const fp = (trab.dados || {}).fp || {};
  // Os dados de cada empregado vêm do enunciado (calculados na hora, sem gravar nada); o que o aluno alterar passa a valer.
  const competencia = folhaEmUso(ca.folha).competencia;
  const baseDe = (id) => casoDoEmpregado(matricula || "", id, competencia);
  // O mínimo é automático: um contracheque por empregado da lista (= alunos da turma).
  const res = useMemo(() => resumoAtividade(fp, empregados.map((e) => e.id), empregados.length, baseDe), [fp, empregados.length, matricula, competencia]); // eslint-disable-line
  if (ca.config === undefined || trab.carregando) return <Carregando />;
  if (empregados.length === 0) return (
    <>
      <div className="screen-eyebrow">atividade · folha de pagamento</div>
      <h2 className="screen-title">Elaborar a folha de pagamento</h2>
      <div className="empty-state">O professor ainda não publicou a lista de empregados.</div>
    </>
  );
  const emp = empregados.find((e) => e.id === sel) || empregados[0];
  const caso = baseDe(emp.id);
  const get = (c) => valorDoCampo(fp, emp.id, c, caso);
  const set = (c, v) => campos.set(SEC, emp.id + "__" + c, v);
  const c = calcularContracheque(empregadoDeCampos(get));
  const usadoSalario = lerValor(get("salario"));
  const aberto = !!usadoSalario;

  const campo = (k, rotulo, tipo) => (
    <div className="field" style={{ margin: 0 }} key={k}>
      <label>{rotulo}</label>
      {tipo === "adicional" ? (
        <select value={get(k)} onChange={(e) => set(k, e.target.value)}><option value="">nenhum</option><option value="AI">insalubridade (informe o %)</option><option value="AP">periculosidade 30%</option></select>
      ) : tipo === "vt" ? (
        <select value={get(k)} onChange={(e) => set(k, e.target.value)}><option value="">não optou</option><option value="1">optou pelo vale-transporte</option></select>
      ) : (
        <input className="mono" inputMode="decimal" value={get(k)} onChange={(e) => set(k, e.target.value)} />
      )}
    </div>
  );

  return (
    <>
      <div className="screen-eyebrow">atividade · folha de pagamento</div>
      <h2 className="screen-title">Elaborar a folha de pagamento</h2>
      <p className="screen-sub">Cada empregado da lista já vem com os dados do caso. Escolha um empregado e calcule o contracheque até o salário líquido. Você faz a conta, o sistema confere.</p>
      {ca.config.fpSugestao && <div className="balance-check ok" style={{ marginBottom: 12 }}><b>Sugestão do professor:</b> {ca.config.fpSugestao}</div>}
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />
      <div className="panel"><div className="panel-body">
        <div style={{ marginBottom: 8 }}><b>{res.concluidos}</b> de {res.minimo} contracheques conferidos · um por empregado ({empregados.length} na lista) {res.pronto ? <span className="tag-pill ok">pronto para análise do professor</span> : <span className="tag-pill warn">em andamento</span>}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {empregados.map((e) => {
            const s = situacaoEmpregado(fp, e.id, undefined, baseDe(e.id));
            return <button key={e.id} className={"btn" + (e.id === emp.id ? "" : " secondary")} style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={() => setSel(e.id)}>{e.nome}{s.concluido ? " ✓" : s.iniciado ? " …" : ""}</button>;
          })}
        </div>
      </div></div>

      {ca.config.enunciadoAtivo !== false && <EnunciadoEmpregado matricula={matricula} emp={emp} competencia={competencia} obs={ca.config.enunciadoObs} get={get} set={set} automatico />}
      <div className="panel">
        <div className="panel-head"><h3>Situação de {emp.nome}</h3></div>
        <div className="panel-body">
          <p style={{ marginTop: 0, color: "var(--ink-soft)", fontSize: 13.5 }}>Estes são os dados do seu caso, já preenchidos. Se quiser praticar outra situação, pode alterar os valores; o que você alterar é o que vale para a conferência.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
            {campo("salario", "Salário-base (R$)")}
            {campo("adTipo", "Adicional", "adicional")}
            {campo("adPct", "% de insalubridade")}
            {campo("he50", "Horas extras 50%")}
            {campo("he100", "Horas extras 100%")}
            {campo("hen50", "Horas extras noturnas 50%")}
            {campo("hen100", "Horas extras noturnas 100%")}
            {campo("faltas", "Faltas injustificadas (dias)")}
            {campo("sem", "Semanas com falta (vazio = uma por semana)")}
            {campo("dep", "Dependentes (IRRF)")}
            {campo("filhos", "Filhos até 14 anos")}
            {campo("vt", "Vale-transporte", "vt")}
            {campo("vtCusto", "Custo mensal do vale (R$)")}
          </div>
        </div>
      </div>

      {aberto ? (
        <div className="panel">
          <div className="panel-head"><h3>Contracheque de {emp.nome}</h3></div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table>
              <thead><tr><th>Item</th><th>Como calcular</th><th className="num">Meu cálculo</th></tr></thead>
              <tbody>
                {PASSOS_CONTRACHEQUE.map((p) => (
                  <tr key={p.k} style={p.k === "liq" ? { fontWeight: 700 } : null}>
                    <td>{p.nome}</td><td style={{ color: "var(--ink-soft)", fontSize: 12.5, fontWeight: 400 }}>{p.como}</td>
                    <td className="num"><MeuCalculo largura={110} valor={get("m_" + p.k)} esperado={p.v(c)} tolerancia={TOLERANCIA_PEDAGOGICA} onChange={(x) => set("m_" + p.k, x)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "10px 18px", fontSize: 12.5, color: "var(--ink-faint)", borderTop: "1px solid var(--line-strong)" }}>
              Tolerância de R$ 0,02: critério <b>pedagógico</b>, só para arredondamento. Não vale para erro de base, alíquota, faixa ou teto. O FGTS ({TABELAS_2026.fgtsPercentual}%) é encargo da empresa, não desconto do empregado.
            </div>
          </div>
        </div>
      ) : <div className="empty-state">Informe o salário-base para liberar o contracheque.</div>}

      <div className="panel"><div className="panel-body">
        <CaixaTexto rotulo="Meu resumo sobre a folha (opcional, mas vale nota)" valor={campos.get(SEC, "resumo")} onChange={(v) => campos.set(SEC, "resumo", v)} linhas={5}
          dica="O que mais pesou nos descontos? Que diferença o dependente, a falta ou a hora extra fizeram no líquido?" />
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>O professor consegue ler o que você escreve aqui.</div>
      </div></div>
      <div className="panel"><div className="panel-body" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
        Tabelas de {TABELAS_2026.vigencia}: INSS e salário-família conforme a Portaria Interministerial MPS/MF nº 13/2026; IRRF conforme a tabela mensal, a dedução por dependente de R$ 189,59, o desconto simplificado de R$ 607,20 e a redução do art. 3º-A da Lei 9.250/1995 (Lei 15.270/2025).
      </div></div>
    </>
  );
}
