import { buscarCfop, buscarNcm } from "../../hooks/useLookupFiscal.js";

// Lista compacta com o significado oficial de cada CFOP/NCM já digitado no
// formulário — só consulta, nunca diz se o código está certo para a
// operação (ver nota em useLookupFiscal.js).
export default function DicasFiscais({ mapaCfop, mapaNcm, cfops = [], ncms = [] }) {
  const cfopsUnicos = [...new Set(cfops.map((c) => String(c || "").trim()).filter(Boolean))];
  const ncmsUnicos = [...new Set(ncms.map((n) => String(n || "").trim()).filter(Boolean))];

  const dicasCfop = cfopsUnicos.map((c) => ({ codigo: c, dado: buscarCfop(mapaCfop, c) }));
  const dicasNcm = ncmsUnicos.map((n) => ({ codigo: n, dado: buscarNcm(mapaNcm, n) }));

  const temAlgo = dicasCfop.length > 0 || dicasNcm.length > 0;
  if (!temAlgo) return null;

  return (
    <div className="helper-note" style={{ marginTop: 10 }}>
      <b>O que esses códigos significam (só consulta — não indica se estão certos para esta operação):</b>
      <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
        {dicasCfop.map(({ codigo, dado }) => (
          <li key={"cfop-" + codigo} style={{ marginBottom: 4 }}>
            <span className="mono">CFOP {codigo}</span> — {dado ? dado.titulo : "código não encontrado na tabela oficial"}
          </li>
        ))}
        {dicasNcm.map(({ codigo, dado }) => (
          <li key={"ncm-" + codigo} style={{ marginBottom: 4 }}>
            <span className="mono">NCM {codigo}</span> — {dado ? dado.descricao : "código não encontrado (confira os dígitos)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
