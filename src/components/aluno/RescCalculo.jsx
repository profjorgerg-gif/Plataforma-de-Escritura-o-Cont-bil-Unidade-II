import { useMemo } from "react";
import { fmt } from "../../lib/contabil.js";
import { nomeModalidade, calcularRescisao, fmtData } from "../../lib/rescisao.js";
import { EstadoGravacao, MeuCalculo, CaixaTexto, Carregando, useCampos } from "../shared/AgbUI.jsx";

export default function RescCalculo({ trab, resc }) {
  const campos = useCampos(trab, false);
  const r = useMemo(() => calcularRescisao(resc.caso), [resc.caso]);
  if (resc.caso === undefined || trab.carregando) return <Carregando />;
  const c = r.caso;
  const cel = (k, esp, l = 110) => <MeuCalculo largura={l} valor={campos.get("rcalc", k)} esperado={esp} tolerancia={0.02} onChange={(v) => campos.set("rcalc", k, v)} />;
  const sec = (titulo, linhas, nota) => (
    <div className="panel">
      <div className="panel-head"><h3>{titulo}</h3></div>
      <div className="panel-body" style={{ padding: 0 }}>
        <table><tbody>{linhas.map(([k, nome, esp, w]) => (
          <tr key={k}><td>{nome}</td><td className="num">{cel(k, esp, w)}</td></tr>
        ))}</tbody></table>
        {nota && <div style={{ padding: "10px 18px", fontSize: 12.5, color: "var(--ink-faint)", borderTop: "1px solid var(--line-strong)" }}>{nota}</div>}
      </div>
    </div>
  );
  const prazos = [["anos", "Anos completos de serviço", r.anos], ["avisoDias", "Dias de aviso prévio (30 dias + 3 por ano completo, máximo 90)", r.avisoDias], ["projDias", "Dias de projeção do aviso indenizado (0 se não houver)", r.projDias], ["avF", "Avos de férias proporcionais (com a projeção)", r.avF], ["av13", "Avos de 13º (com a projeção)", r.av13]];
  return (
    <>
      <div className="screen-eyebrow">fase 2 · contabilidade avançada · rescisão</div>
      <h2 className="screen-title">Cálculo das verbas rescisórias</h2>
      <p className="screen-sub">
        {c.nome} · {nomeModalidade(c.modalidade)} · admissão {fmtData(c.admissao)} · desligamento {fmtData(c.desligamento)} · salário R$ {fmt(c.salario)}.
        Calcule cada valor (arredonde cada parcela para centavos antes de somar). Se o empregado não tem direito a uma verba, digite 0. Os valores são brutos: os descontos de INSS e IRRF do empregado ficam fora desta etapa.
      </p>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />

      {sec("Prazos e avos", prazos.map(([k, n, e]) => [k, n, e, 70]),
        "O aviso prévio indenizado conta como tempo de serviço: projete a data de desligamento e conte os avos de férias e 13º até a data projetada (CLT art. 487 §1º; Súmula 371 do TST). Mês com 15 dias ou mais conta como mês inteiro. No acordo (art. 484-A) o aviso indenizado é pago pela metade; a CLT não fixa a projeção, então este exercício adota a projeção também pela metade (critério de cálculo, não regra literal da lei).")}
      {sec("Verbas rescisórias (brutas)", [
        ["saldo", "Saldo de salário (dias trabalhados no mês, base de 30 dias)", r.saldo],
        ["aviso", "Aviso prévio indenizado", r.aviso],
        ["fv", "Férias vencidas", r.fv], ["fv3", "1/3 sobre férias vencidas", r.fv3],
        ["fp", "Férias proporcionais", r.fp], ["fp3", "1/3 sobre férias proporcionais", r.fp3],
        ["d13", "13º salário proporcional", r.d13],
        ["bruto", "Total bruto das verbas rescisórias", r.bruto],
      ])}
      {sec("FGTS e encargos patronais", [
        ["baseFgts", "Base do FGTS rescisório", r.baseFgts], ["fgts8", "FGTS rescisório (" + r.p.fgts + "%)", r.fgts8],
        ["multa", "Multa rescisória do FGTS (40% ou 20%, sobre saldo + depósito rescisório)", r.multa],
        ["baseInss", "Base do INSS patronal", r.baseInss], ["inss", "INSS patronal (" + r.p.inss + "%)", r.inss],
        ["rat", "RAT (" + r.p.rat + "%)", r.rat], ["terceiros", "Terceiros (" + r.p.terceiros + "%)", r.terceiros],
      ], "Percentuais didáticos do projeto. Base do FGTS: o que é remuneração ou aviso indenizado, sem férias indenizadas. Base do INSS: só o que é remuneração.")}

      <div className="panel"><div className="panel-body">
        <CaixaTexto rotulo="Desafio profissional (5 a 10 linhas): o gerente quer pagar a rescisão só no mês seguinte, junto com a folha. Ele pode? Qual é o prazo e o risco de descumpri-lo?"
          valor={campos.get("rcalc", "desafio")} onChange={(v) => campos.set("rcalc", "desafio", v)} linhas={6} />
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>O professor consegue ler o que você escreve aqui.</div>
      </div></div>
    </>
  );
}
