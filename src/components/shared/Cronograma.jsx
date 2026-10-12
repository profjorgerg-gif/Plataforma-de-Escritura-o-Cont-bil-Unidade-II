import { useEffect, useMemo, useState } from "react";
import { etapasEfetivas, situacaoEtapa } from "../../lib/roteiro.js";
import { useRoteiroTurma, useRoteiroDosAlunos } from "../../hooks/useRoteiro.js";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { linhasCronograma, montarSvgCronograma, hojeISO, textoProximoPrazo, textoVoceEstaAqui, nomeArquivoCronograma } from "../../lib/cronograma.js";

// Cronograma das 6 etapas (2026-10-12). Só LEITURA: lê os prazos de "Etapas e prazos" e desenha.
// - Aluno: situação de cada etapa dele.
// - Professor: prazos da turma selecionada; o andamento dos alunos só é carregado se o professor pedir.
// PDF = impressão do navegador (A4 paisagem, só a folha). Imagem = PNG gerado na hora a partir do mesmo desenho.

const TOM_DO_COD = { aprovada: "ok", entregue: "info", ajustar: "bad", liberada: "and", bloqueada: "blq" };

function useFolhaPaisagem() {
  // A4 paisagem só enquanto esta tela está aberta (as outras impressões, como os manuais, continuam em retrato).
  useEffect(() => {
    const st = document.createElement("style");
    st.setAttribute("data-cronograma", "1");
    st.textContent = "@page{size:A4 landscape;margin:8mm;}";
    document.head.appendChild(st);
    return () => { if (st.parentNode) st.parentNode.removeChild(st); };
  }, []);
}

function salvarPng(info, nome, onErro) {
  try {
    const blob = new Blob([info.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const f = 2;
      const c = document.createElement("canvas");
      c.width = info.W * f; c.height = info.H * f;
      const g = c.getContext("2d");
      g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => {
        if (!b) { onErro(); return; }
        const u = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = u; a.download = nome;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 3000);
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); onErro(); };
    img.src = url;
  } catch (e) { onErro(); }
}

function Folha({ info, nomeArquivo, acoesExtras }) {
  const [erro, setErro] = useState(false);
  useFolhaPaisagem();
  return (
    <>
      <div className="no-print btn-row" style={{ margin: "0 0 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => window.print()}>🖨️ Imprimir / Salvar PDF</button>
        <button className="btn secondary" onClick={() => { setErro(false); salvarPng(info, nomeArquivo, () => setErro(true)); }}>🖼️ Salvar imagem (PNG)</button>
        {acoesExtras}
      </div>
      {erro && <div className="no-print balance-check" style={{ marginBottom: 12 }}>Não foi possível gerar a imagem neste navegador. Use “Imprimir / Salvar PDF” e, no destino, escolha “Salvar como PDF”.</div>}
      <div className="crono-folha" dangerouslySetInnerHTML={{ __html: info.svg }} />
    </>
  );
}

export function CronogramaAluno({ etapas, nome, matricula, turmaNome }) {
  const hoje = hojeISO();
  const linhas = useMemo(() => linhasCronograma(etapas.map((e) => ({
    id: e.id, n: e.n, titulo: e.tituloCrono || e.titulo, disc: e.disc, prazo: e.prazo, aulas: e.aulas, entrega: e.entrega,
    hachurada: !e.disponivel, sit: { texto: e.curto, tom: TOM_DO_COD[e.cod] || "blq" },
  }))), [etapas]);
  const atual = linhas.find((l, i) => etapas[i].atual) || null;
  const info = useMemo(() => montarSvgCronograma({
    linhas, titulo: "Cronograma das " + etapas.length + " etapas",
    meta: [nome || "Aluno(a)", [matricula ? "Matrícula " + matricula : "", turmaNome || ""].filter(Boolean).join(" · ") || " "],
    aqui: textoVoceEstaAqui(atual, etapas.length, hoje), colunaSituacao: "Sua situação", hoje, emitidoEm: hoje,
  }), [linhas, atual, etapas.length, nome, matricula, turmaNome, hoje]);
  return (
    <>
      <div className="screen-eyebrow no-print">planejamento</div>
      <h2 className="screen-title no-print">Cronograma</h2>
      <p className="screen-sub no-print">As {etapas.length} etapas do projeto, com prazo e situação. As faixas hachuradas são etapas que o professor ainda não liberou. Os prazos acompanham o que o professor definiu para a sua turma.</p>
      <Folha info={info} nomeArquivo={nomeArquivoCronograma(nome || "aluno", hoje)} />
    </>
  );
}

export function CronogramaProfessor({ turma }) {
  const hoje = hojeISO();
  const turmaId = turma ? turma.id : null;
  const config = useRoteiroTurma(turmaId);
  const alunos = useAlunosReaisDaTurma(turmaId);
  const [ver, setVer] = useState(false);
  const { mapa, recarregar } = useRoteiroDosAlunos(turmaId, ver ? alunos : null);
  const lista = useMemo(() => etapasEfetivas(config || null), [config]);
  const total = alunos ? alunos.length : 0;

  const linhas = useMemo(() => {
    const base = lista.map((e, i) => {
      const o = { id: e.id, n: i + 1, titulo: e.tituloCrono || e.titulo, disc: e.disc || "", prazo: e.prazo, aulas: e.aulas, entrega: e.entrega, hachurada: false, nota: "", sit: { texto: "—", tom: "blq" } };
      if (ver && mapa && alunos) {
        const c = { bloqueada: 0, entregue: 0, aprovada: 0, ajustar: 0, liberada: 0 };
        alunos.forEach((a) => { const r = mapa[a.matricula] || { estado: {}, entregas: {} }; c[situacaoEtapa(lista, i, r.estado, r.entregas).cod]++; });
        const lib = total - c.bloqueada;
        o.hachurada = lib === 0;
        o.sit = lib === 0 ? { texto: "Não liberada", tom: "blq" } : { texto: "Liberada a " + lib + " de " + total, tom: "and" };
        if (lib > 0) o.nota = c.aprovada + (c.aprovada === 1 ? " aprovada" : " aprovadas") + " · " + c.entregue + " p/ analisar" + (c.ajustar ? " · " + c.ajustar + " a ajustar" : "");
      }
      return o;
    });
    return linhasCronograma(base);
  }, [lista, ver, mapa, alunos, total]);

  // a disciplina de cada etapa vem do mesmo cadastro das 6 etapas
  const DISC = { f1: "CI", fp: "CA", ca: "CA", resc: "CA", agb: "AGB", comp: "AGB" };
  const linhasComDisc = useMemo(() => linhas.map((l) => ({ ...l, disc: DISC[l.id] || l.disc })), [linhas]); // eslint-disable-line

  const info = useMemo(() => montarSvgCronograma({
    linhas: linhasComDisc, titulo: "Cronograma das " + linhasComDisc.length + " etapas",
    meta: ["Turma: " + (turma ? turma.nome : "—"), alunos ? total + (total === 1 ? " aluno" : " alunos") : " "],
    aqui: textoProximoPrazo(linhasComDisc, hoje), colunaSituacao: ver ? "Turma" : "Situação", hoje, emitidoEm: hoje,
  }), [linhasComDisc, turma, alunos, total, hoje, ver]);

  if (!turma) return (<><div className="screen-eyebrow">planejamento</div><h2 className="screen-title">Cronograma</h2><div className="empty-state">Nenhuma turma selecionada. Crie ou selecione uma em “Turmas”.</div></>);

  return (
    <>
      <div className="screen-eyebrow no-print">planejamento</div>
      <h2 className="screen-title no-print">Cronograma · {turma.nome}</h2>
      <p className="screen-sub no-print">Os prazos vêm de “Etapas e prazos”: mudou o prazo lá, o cronograma muda aqui. O andamento dos alunos só é carregado quando você pedir.</p>
      <Folha
        info={info}
        nomeArquivo={nomeArquivoCronograma(turma.nome, hoje)}
        acoesExtras={<button className="btn secondary" onClick={() => (ver ? recarregar() : setVer(true))}>{ver ? "↻ Atualizar andamento da turma" : "Mostrar andamento da turma"}</button>}
      />
      {ver && !mapa && <div className="no-print helper-note" style={{ marginTop: 10 }}>Carregando o andamento dos alunos…</div>}
    </>
  );
}
