import { fmt } from "../../lib/contabil.js";

export default function DocumentosFiscais({ documentos }) {
  return (
    <>
      <div className="screen-eyebrow">03 · documentos fiscais</div>
      <h2 className="screen-title">Documentos disponibilizados</h2>
      <p className="screen-sub">NF-e didáticas liberadas pelo professor para a sua turma. O conteúdo detalhado só aparece depois de você digitar a nota na etapa seguinte.</p>
      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          {documentos.length === 0 ? (
            <div className="empty-state">Nenhum documento liberado para esta turma ainda.</div>
          ) : (
            <table>
              <thead><tr><th>Nota</th><th>Direção</th><th>Emitente/Destinatário</th><th>CFOP</th><th className="num">Valor total</th></tr></thead>
              <tbody>
                {documentos.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">Nº {d.numero}</td>
                    <td>{d.direcao === "entrada" ? "Entrada" : "Saída"}</td>
                    <td>{(d.direcao === "entrada" ? d.emitente?.nome : d.destinatario?.nome) || "—"}</td>
                    <td className="mono">{d.cfop}</td>
                    <td className="num mono">{fmt(d.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
