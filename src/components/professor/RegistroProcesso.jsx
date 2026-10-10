import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useDocumentosDaTurma } from "../../hooks/useDocumentosDaTurma.js";
import { useChamados } from "../../hooks/useChamados.js";

// Registro do processo (2026-10-09). Linha do tempo de tudo que o aluno fez
// e de tudo que aconteceu entre aluno e professor (chamados, devoluções,
// correções), para apoiar a nota de processo. Só LÊ dados — não altera nada.
// A nota continua sendo decisão do professor.

const ROTULO_ETAPA = { digitacao: "Digitação da NF-e", analise: "Análise fiscal", classificacao: "Classificação contábil", lancamento: "Lançamento no diário" };

function paraData(v) {
  if (!v) return null;
  const d = v.toDate ? v.toDate() : new Date(v);
  return isNaN(d) ? null : d;
}
function fmtDH(d) {
  return d ? d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
}

async function lerColecao(turmaId, matricula, nome) {
  const s = await getDocs(collection(db, "turmas", turmaId, "alunos", matricula, nome));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export default function RegistroProcesso({ turma }) {
  const turmaId = turma?.id;
  const alunos = useAlunosDaTurma(turmaId);
  const documentos = useDocumentosDaTurma(turmaId);
  const { chamados } = useChamados(turmaId, null);
  const [mat, setMat] = useState("");
  const [filtroDoc, setFiltroDoc] = useState("");
  const [eventos, setEventos] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  const aluno = (alunos || []).find((a) => a.matricula === mat);
  const numero = (id) => (documentos || []).find((d) => d.id === id)?.numero || id;

  async function gerar(m = mat) {
    if (!m) { setEventos(null); return; }
    setCarregando(true); setErro("");
    try {
      const [dig, ana, cla, lan, lix] = await Promise.all(
        ["digitacoesNFe", "analisesFiscais", "classificacoes", "lancamentos", "lixeira"].map((n) => lerColecao(turmaId, m, n)));
      const ev = [];
      const add = (quando, quem, tipo, doc, texto) => { const d = paraData(quando); ev.push({ d, quem, tipo, doc: doc || "", texto }); };
      dig.forEach((x) => add(x.atualizadoEm, "aluno", "digitacao", x.id, "Digitou/atualizou a NF-e (total digitado " + (x.total ?? "—") + ")"));
      ana.forEach((x) => {
        add(x.atualizadoEm, "aluno", "analise", x.id, x.status === "enviado" ? "Enviou a análise fiscal" : "Salvou a análise fiscal como rascunho");
        if (x.devolucao) add(x.devolucao.em, "professor", "devolucao", x.id, "Reabriu a análise fiscal: " + (x.devolucao.orientacao || ""));
      });
      cla.forEach((x) => add(x.criadoEm, "aluno", "classificacao", x.documento, "Classificou: " + (x.fato || "") + " · valor " + (x.valor ?? "—")));
      lan.forEach((x) => {
        add(x.criadoEm, "aluno", "lancamento", x.documento, "Criou lançamento (" + (x.status || "") + "): " + (x.historico || ""));
        (x.historicoCorrecoes || []).forEach((h) => add(h.em, "professor", "correcao", x.documento, "Devolveu lançamento para correção: " + (h.obs || "")));
      });
      lix.forEach((x) => add(x.excluidoEm, "professor", "lixeira", x.documento, "Removeu para refazer — " + (ROTULO_ETAPA[x.tipo] || x.tipo) + (x.motivo ? " (" + x.motivo + ")" : "")));
      const meus = (chamados || []).filter((c) => c.matricula === m);
      let resolvidos = 0, devolucoes = 0, respostasAluno = 0;
      meus.forEach((c) => {
        add(c.criadoEm, c.iniciadoPor === "professor" ? "professor" : "aluno", "chamado", c.documentoId, "Chamado aberto: " + c.assunto);
        (c.mensagens || []).forEach((msg, i) => {
          if (msg.tipo === "sistema") { if (/resolvido/.test(msg.texto)) resolvidos++; add(msg.em, "sistema", "chamado", c.documentoId, msg.texto); return; }
          if (msg.tipo === "devolucao") { devolucoes++; add(msg.em, "professor", "devolucao", c.documentoId, "Devolveu a nota (" + (msg.etapas || []).map((e) => ROTULO_ETAPA[e] || e).join(", ") + "): " + msg.texto); return; }
          if (i === 0 && msg.autor === (c.iniciadoPor || "aluno")) return;
          if (msg.autor === "aluno") respostasAluno++;
          add(msg.em, msg.autor, "chamado", c.documentoId, (msg.autor === "aluno" ? "Aluno escreveu: " : "Professor respondeu: ") + msg.texto);
        });
      });
      ev.sort((a, b) => (a.d?.getTime() || 0) - (b.d?.getTime() || 0));
      setEventos(ev);
      setResumo({
        chamados: meus.length, resolvidos, devolucoes, respostasAluno,
        correcoes: lan.reduce((t, x) => t + (x.historicoCorrecoes || []).length, 0),
        notasDigitadas: dig.length, analisesEnviadas: ana.filter((x) => x.status === "enviado").length,
        classificacoes: cla.length, lancamentos: lan.length, lancAprovados: lan.filter((x) => x.status === "aprovado").length,
        removidos: lix.length,
      });
    } catch (e) { setErro("Não foi possível montar o registro: " + e.message); setEventos(null); }
    setCarregando(false);
  }

  function imprimir() {
    const anterior = document.title;
    const d = new Date(); const dois = (n) => String(n).padStart(2, "0");
    document.title = "Registro do processo - " + (aluno?.nome || mat) + " - " + `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}_${dois(d.getHours())}h${dois(d.getMinutes())}`;
    const restaurar = () => { document.title = anterior; window.removeEventListener("afterprint", restaurar); };
    window.addEventListener("afterprint", restaurar);
    window.print();
  }

  const lista = (eventos || []).filter((e) => !filtroDoc || e.doc === filtroDoc);
  const cor = { aluno: "ok", professor: "warn", sistema: "" };

  return (
    <>
      <div className="screen-eyebrow">gestão da turma</div>
      <h2 className="screen-title">Registro do processo</h2>
      <p className="screen-sub no-print">Linha do tempo de tudo que o aluno fez e de tudo que foi conversado, devolvido e corrigido. Serve de apoio para a sua nota de processo — o sistema só registra; a nota é decisão sua. Só leitura: nada é alterado.</p>

      <div className="panel no-print"><div className="panel-body">
        <div className="field"><label>Aluno</label>
          <select value={mat} onChange={(e) => { setMat(e.target.value); setFiltroDoc(""); gerar(e.target.value); }}>
            <option value="">— escolha —</option>
            {(alunos || []).map((a) => <option key={a.matricula} value={a.matricula}>{a.nome || a.matricula}</option>)}
          </select></div>
        {eventos && (
          <div className="field"><label>Filtrar por nota (opcional)</label>
            <select value={filtroDoc} onChange={(e) => setFiltroDoc(e.target.value)}>
              <option value="">Todas as notas</option>
              {(documentos || []).map((d) => <option key={d.id} value={d.id}>Nº {d.numero}</option>)}
            </select></div>
        )}
        {carregando && <div className="helper-note">Montando o registro…</div>}
        {erro && <div className="balance-check bad">{erro}</div>}
      </div></div>

      {eventos && resumo && (
        <>
          <div className="panel">
            <div className="panel-head"><h3>Resumo do processo — {aluno?.nome || mat}</h3>
              <button className="btn secondary no-print" onClick={imprimir}>Imprimir</button></div>
            <div className="panel-body">
              <table><tbody>
                <tr><td>Notas digitadas</td><td className="mono">{resumo.notasDigitadas}</td><td>Análises enviadas</td><td className="mono">{resumo.analisesEnviadas}</td></tr>
                <tr><td>Classificações feitas</td><td className="mono">{resumo.classificacoes}</td><td>Lançamentos (aprovados)</td><td className="mono">{resumo.lancamentos} ({resumo.lancAprovados})</td></tr>
                <tr><td>Chamados de suporte</td><td className="mono">{resumo.chamados} ({resumo.resolvidos} resolvidos)</td><td>Respostas do aluno</td><td className="mono">{resumo.respostasAluno}</td></tr>
                <tr><td>Devoluções de nota recebidas</td><td className="mono">{resumo.devolucoes}</td><td>Correções de lançamento</td><td className="mono">{resumo.correcoes}</td></tr>
                <tr><td>Itens removidos para refazer</td><td className="mono">{resumo.removidos}</td><td></td><td></td></tr>
              </tbody></table>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Linha do tempo{filtroDoc ? " — NF " + numero(filtroDoc) : ""}</h3></div>
            <div className="panel-body" style={{ padding: 0 }}>
              {lista.length === 0 ? <div className="empty-state">Nenhuma movimentação registrada.</div> : (
                <table>
                  <thead><tr><th>Data e hora</th><th>Quem</th><th>Nota</th><th>O que aconteceu</th></tr></thead>
                  <tbody>{lista.map((e, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ whiteSpace: "nowrap" }}>{fmtDH(e.d)}</td>
                      <td><span className={"tag-pill " + cor[e.quem]}>{e.quem}</span></td>
                      <td className="mono">{e.doc ? numero(e.doc) : "—"}</td>
                      <td style={{ whiteSpace: "pre-wrap" }}>{e.texto}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
          <div className="helper-note">Datas de digitação e análise mostram a última gravação de cada nota; as demais são de cada ação. Nada é apagado deste registro.</div>
        </>
      )}
    </>
  );
}
