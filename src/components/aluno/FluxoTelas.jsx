import DigitacaoAnaliseFiscal from "./DigitacaoAnaliseFiscal.jsx";
import ClassificacaoContabil from "./ClassificacaoContabil.jsx";
import { FluxoFaixa, PassoBloqueado, SemLote, prontoDoPasso } from "./FluxoLote.jsx";
import { passoEditavel } from "../../lib/fluxoLotes.js";

// Telas do aluno quando o fluxo por etapas está LIGADO na turma (2027.1). Com o fluxo desligado, nada disto aparece.
const QUAL = { digitacao: "digitacao", "analise-fiscal": "analise", classificacao: "classificacao" };
const ANTERIOR = { analise: "Digitação da NF-e", classificacao: "Análise fiscal" };

export default function FluxoTelas({ screen, est, erro, docsLote, progresso, turmaId, matricula, contas, onUsarNoLancamento }) {
  const passo = QUAL[screen];
  if (!est.lote) return <SemLote est={est} />;
  const p = est.passos[passo];
  if (!p.liberado) return <PassoBloqueado passo={passo} anterior={ANTERIOR[passo]} />;
  if (docsLote.length === 0) return <div className="empty-state">As notas deste lote ainda não estão disponíveis para a sua turma. Avise o professor.</div>;
  const { pronto, faltam } = prontoDoPasso(passo, docsLote, progresso, (d) => d.numero);
  const travado = !passoEditavel(p);
  return (
    <>
      {erro && <div className="aviso-pedagogico">{erro}</div>}
      <FluxoFaixa turmaId={turmaId} matricula={matricula} est={est} passo={passo} pronto={pronto} faltam={faltam} />
      {passo === "digitacao" && <DigitacaoAnaliseFiscal key="dig" parte="dig" travado={travado} turmaId={turmaId} matricula={matricula} documentos={docsLote} />}
      {passo === "analise" && <DigitacaoAnaliseFiscal key="ana" parte="ana" travado={travado} turmaId={turmaId} matricula={matricula} documentos={docsLote} />}
      {passo === "classificacao" && (
        <ClassificacaoContabil key="cla" travado={travado} turmaId={turmaId} matricula={matricula} documentos={docsLote} progresso={progresso} contas={contas} onUsarNoLancamento={onUsarNoLancamento} />
      )}
    </>
  );
}
