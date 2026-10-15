import { useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { PASSOS_FLUXO, idFluxo } from "../../lib/fluxoLotes.js";

const ROTULO = { andamento: "em andamento", enviado: "aguardando o professor", devolvido: "devolvido para correção", aprovado: "aprovado", bloqueada: "bloqueado" };

// Faixa do passo (situação do lote) + botão de envio. Usado nas telas Digitação, Análise fiscal e Classificação.
// pronto: o aluno já fez tudo o que o passo pede em todas as notas do lote; faltam: texto do que falta.
export function FluxoFaixa({ turmaId, matricula, est, passo, pronto, faltam }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const p = est.passos[passo];
  const nomePasso = (PASSOS_FLUXO.find((x) => x.key === passo) || {}).rotulo || passo;

  async function enviar() {
    setEnviando(true); setErro("");
    try {
      const ref = doc(db, "turmas", turmaId, "alunos", matricula, "fluxo", idFluxo(est.lote.id, passo));
      const atual = await getDoc(ref);
      const antigo = atual.exists() && Array.isArray(atual.data().historico) ? atual.data().historico : [];
      const historico = [...antigo, { acao: "enviado", em: new Date().toISOString() }];
      if (atual.exists()) {
        await updateDoc(ref, { status: "enviado", documentos: est.lote.documentos, enviadoEm: serverTimestamp(), historico });
      } else {
        await setDoc(ref, { status: "enviado", lote: est.lote.id, passo, documentos: est.lote.documentos, enviadoEm: serverTimestamp(), historico });
      }
    } catch (e) { setErro("Não foi possível enviar: " + e.message + ". Seu trabalho continua salvo; tente de novo."); }
    setEnviando(false);
  }

  return (
    <div className="panel">
      <div className="panel-head"><h3>{est.lote.nome} · {nomePasso}</h3><span className={"status " + (p.status === "aprovado" ? "aprovado" : p.status === "devolvido" ? "correcao" : p.status === "enviado" ? "enviado" : "rascunho")}>{ROTULO[p.status]}</span></div>
      <div className="panel-body">
        <p style={{ margin: "0 0 8px" }}>Notas deste lote: {est.lote.documentos.length}{est.lote.prazo ? " · prazo " + est.lote.prazo : ""}.</p>
        {p.status === "devolvido" && (
          <div className="aviso-pedagogico">↩ O professor devolveu este passo.{p.orientacao ? " Orientação: " + p.orientacao : ""} Corrija e envie de novo.</div>
        )}
        {p.status === "enviado" && <div className="helper-note">⏳ Enviado. Aguarde a análise do professor. Quando ele aprovar, o próximo passo abre sozinho. Enquanto isso você só pode consultar o que fez.</div>}
        {p.status === "aprovado" && <div className="balance-check ok">✓ Passo aprovado pelo professor.</div>}
        {(p.status === "andamento" || p.status === "devolvido") && (
          <>
            {!pronto && <div className="helper-note">Para enviar o lote: {faltam}</div>}
            <div className="btn-row">
              <button className="btn" disabled={!pronto || enviando} onClick={enviar}>
                {enviando ? "Enviando…" : p.status === "devolvido" ? "Reenviar lote para análise" : "Enviar lote para análise"}
              </button>
            </div>
            {erro && <div className="aviso-pedagogico">{erro}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export function PassoBloqueado({ passo, anterior }) {
  const nome = (PASSOS_FLUXO.find((x) => x.key === passo) || {}).rotulo || passo;
  return (
    <>
      <div className="screen-eyebrow">fluxo por etapas</div>
      <h2 className="screen-title">🔒 {nome}</h2>
      <div className="helper-note">Este passo abre quando o professor aprovar o passo anterior ({anterior}) do lote em andamento.</div>
    </>
  );
}

export function SemLote({ est }) {
  return (
    <>
      <div className="screen-eyebrow">fluxo por etapas</div>
      <h2 className="screen-title">Nenhum lote disponível agora</h2>
      <div className="helper-note">
        {est && est.totalLiberados > 0 && est.concluidos === est.totalLiberados
          ? "Você concluiu todos os lotes liberados até agora. Aguarde o professor liberar o próximo."
          : "O professor ainda não liberou um lote de notas para a turma."}
      </div>
    </>
  );
}

// o que falta, por passo, para o aluno poder enviar o lote
export function prontoDoPasso(passo, docsLote, progresso, numeroDe) {
  const fonte = passo === "digitacao" ? progresso && progresso.digitacoes : passo === "analise" ? progresso && progresso.analises : progresso && progresso.classificacoes;
  if (!progresso || fonte === null || fonte === undefined) return { pronto: false, faltam: "carregando seu andamento…" };
  const falta = [];
  docsLote.forEach((d) => {
    let ok = false;
    if (passo === "digitacao") ok = !!(progresso.digitacoes && progresso.digitacoes[d.id]);
    if (passo === "analise") ok = !!(progresso.analises && progresso.analises[d.id] && progresso.analises[d.id].status === "enviado");
    if (passo === "classificacao") ok = !!(progresso.classificacoes && progresso.classificacoes.some((c) => c.documento === d.id));
    if (!ok) falta.push("Nº " + numeroDe(d));
  });
  const o = { digitacao: "digitar e salvar", analise: "concluir a análise de", classificacao: "classificar" }[passo];
  return { pronto: falta.length === 0 && docsLote.length > 0, faltam: o + " " + falta.join(", ") + "." };
}
