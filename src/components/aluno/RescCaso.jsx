import { useMemo } from "react";
import { fmt } from "../../lib/contabil.js";
import { MODALIDADES, VERBAS_DIREITO, ROTULO_DIREITO, calcularRescisao, direitosDe, fmtData } from "../../lib/rescisao.js";
import { EstadoGravacao, Carregando, useCampos } from "../shared/AgbUI.jsx";

const Marca = ({ ok }) => (ok === null ? null : <span style={{ fontWeight: 700, color: ok ? "var(--green)" : "var(--red)", marginLeft: 6 }}>{ok ? "✓" : "✗"}</span>);

export default function RescCaso({ trab, resc }) {
  const campos = useCampos(trab, false);
  const r = useMemo(() => calcularRescisao(resc.caso), [resc.caso]);
  if (resc.caso === undefined || trab.carregando) return <Carregando />;
  const c = r.caso, dir = direitosDe(c.modalidade);
  const modAluno = campos.get("rcaso", "modalidade");
  const modOk = modAluno ? modAluno === c.modalidade : null;
  return (
    <>
      <div className="screen-eyebrow">fase 2 · contabilidade avançada · rescisão</div>
      <h2 className="screen-title">Rescisão: caso e direitos</h2>
      <p className="screen-sub">Leia o caso, identifique a modalidade da rescisão e diga a que verbas o empregado tem direito. O sistema confere, sem mostrar a resposta.</p>
      <EstadoGravacao estado={trab.estado} salvoEm={trab.salvoEm} erroMsg={trab.erroMsg} onSalvar={trab.salvarAgora} />

      <div className="panel">
        <div className="panel-head"><h3>O caso (informado pelo professor)</h3></div>
        <div className="panel-body" style={{ fontSize: 14 }}>
          <b>{c.nome}</b>, admitido em {fmtData(c.admissao)}, salário contratual de <b>R$ {fmt(c.salario)}</b>. Desligado em <b>{fmtData(c.desligamento)}</b>.
          {Number(c.periodosVencidos) > 0 ? " Há 1 período de férias vencido e não gozado, dentro do prazo para concessão." : " Não há período de férias vencido."}
          {" "}Saldo do FGTS antes da rescisão: R$ {fmt(c.saldoFgts)}. Provisões já constituídas: férias e 1/3 R$ {fmt(c.provFerias)}; 13º salário R$ {fmt(c.prov13)}.
          <div style={{ marginTop: 8, color: "var(--ink-soft)" }}>Motivo informado: <b>{MODALIDADES.find((m) => m.id === c.modalidade).iniciativa}</b></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>1. Qual é a modalidade da rescisão?</h3></div>
        <div className="panel-body">
          <div className="field" style={{ maxWidth: 420 }}>
            <select value={modAluno} onChange={(e) => campos.set("rcaso", "modalidade", e.target.value)}>
              <option value="">— escolha —</option>
              {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <Marca ok={modOk} />
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Pergunte-se: quem tomou a iniciativa? Houve falta grave? O prazo do contrato chegou ao fim?</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>2. Direitos do empregado nesta modalidade</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Verba</th><th style={{ width: 230 }}>Sua resposta</th></tr></thead>
            <tbody>
              {VERBAS_DIREITO.map((v) => {
                const res = campos.get("rcaso", "d_" + v.key);
                return (
                  <tr key={v.key}>
                    <td>{v.nome}</td>
                    <td>
                      <select value={res} onChange={(e) => campos.set("rcaso", "d_" + v.key, e.target.value)}>
                        <option value="">— escolha —</option>
                        {Object.entries(ROTULO_DIREITO).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                      </select>
                      <Marca ok={res ? res === dir[v.key] : null} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "10px 18px", fontSize: 12.5, color: "var(--ink-faint)", borderTop: "1px solid var(--line-strong)" }}>
            Confira os direitos pela CLT e pelo material de apoio. Marcar "parcial" vale para verbas pagas só em parte nessa modalidade.
          </div>
        </div>
      </div>
    </>
  );
}
