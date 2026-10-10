import { useEffect, useState } from "react";

// Guia do professor (2026-10-09): mapa do sistema dentro do próprio menu.
// Só LEITURA e navegação — não grava nada no Firestore. O "✓ feito" fica no
// navegador do professor (localStorage), por turma.

const ROTEIRO_DO_DIA = [
  { key: "painel", titulo: "Painel", texto: "veja quem avançou e quem parou" },
  { key: "suporte", titulo: "Suporte", texto: "responda os chamados abertos", contador: "suporte" },
  { key: "fila", titulo: "Fila de correção", texto: "aprove ou peça correção", contador: "fila" },
  { key: "registro", titulo: "Registro do processo", texto: "confira o que foi feito" },
];

const FASES = [
  {
    id: "preparar", n: 1, titulo: "Preparar a turma", quando: "uma vez, no início do ciclo", marcavel: true,
    itens: [
      { key: "turmas", nome: "Turmas", texto: "Criar a turma e liberar o acesso dos alunos.", quando: "início do ciclo" },
      { key: "documentos", nome: "Documentos fiscais", texto: "Cadastrar as NFs (gabarito) e liberar para a turma.", quando: "antes de cada etapa", aviso: "Corrigir totais mexe no gabarito — faça backup antes" },
      { key: "roteiro", nome: "Roteiro / Plano de contas", texto: "Conferir o material de apoio que o aluno vê.", quando: "se mudar algo" },
    ],
  },
  {
    id: "acompanhar", n: 2, titulo: "Acompanhar o que os alunos fazem", quando: "todo dia de aula", marcavel: false,
    itens: [
      { key: "painel", nome: "Painel do professor", texto: "Visão geral da turma: quem avançou, quem parou." },
      { key: "dashboard-ciclo", nome: "Dashboard do ciclo", texto: "Andamento por etapa (digitação → balanço)." },
      { key: "historico", nome: "Histórico do aluno", texto: "Tudo de um aluno, nota a nota." },
      { key: "registro", nome: "Registro do processo", texto: "Linha do tempo — base da nota de processo." },
    ],
  },
  {
    id: "corrigir", n: 3, titulo: "Corrigir e orientar", quando: "semanal", marcavel: false,
    itens: [
      { key: "fila", nome: "Fila de correção", texto: "Lançamentos enviados: aprovar ou pedir correção.", contador: "fila", rotuloContador: "na fila" },
      { key: "suporte", nome: "Suporte", texto: "Chamados dos alunos. Responder, ou ↩ devolver a nota com orientação.", contador: "suporte", rotuloContador: "novos", aviso: "Devolver nota altera a nota do aluno — faça backup antes" },
      { key: "refazer", nome: "Refazer nota do aluno", texto: "Apaga tudo de uma NF do aluno para ele recomeçar (guarda cópia na lixeira).", aviso: "Mexe nos dados do aluno — faça backup antes" },
      { key: "relatorio", nome: "Relatório de orientação", texto: "Texto pronto por aluno com o que ajustar." },
      { key: "modelos", nome: "Modelos de mensagens", texto: "Respostas rápidas." },
    ],
  },
  {
    id: "fechar", n: 4, titulo: "Fechar e dar a nota", quando: "fim do ciclo", marcavel: true,
    itens: [
      { key: "notas", nome: "Notas", texto: "Completude + qualidade + autonomia = nota final." },
      { key: "registro", nome: "Registro do processo", texto: "Imprimir a linha do tempo do aluno para a nota de processo." },
    ],
  },
];

const SITUACOES = [
  { t: "Aluno digitou a nota errada / valor errado", v: "Suporte → ↩ Devolver nota (o aluno refaz com a sua orientação)", key: "suporte", rot: "Abrir Suporte", aviso: true },
  { t: "Quero apagar tudo daquela NF do aluno e recomeçar", v: "Refazer nota do aluno (guarda cópia na lixeira; dá para restaurar)", key: "refazer", rot: "Abrir Refazer nota", aviso: true },
  { t: "O total da NF no gabarito está diferente", v: "Documentos fiscais → Conferir gabaritos (backup antes)", key: "documentos", rot: "Abrir Documentos fiscais", aviso: true },
  { t: "Aluno diz que perdeu o que digitou", v: "Registro do processo mostra o que foi salvo e quando", key: "registro", rot: "Abrir Registro" },
  { t: "Preciso da nota de processo", v: "Registro do processo (imprimir a linha do tempo) + Notas", key: "registro", rot: "Abrir Registro" },
  { t: "Quero testar como o aluno vê", v: "Modo de teste (conta de teste, sem afetar a turma)", key: "modoteste", rot: "Abrir Modo de teste" },
  { t: "Não sei por onde começar hoje", v: "Painel → depois os números vermelhos: Suporte e Fila de correção", key: "painel", rot: "Abrir Painel" },
  { t: "Preciso avisar a turma", v: "Modelos de mensagens, ou Suporte → + Mensagem ao aluno", key: "modelos", rot: "Abrir Modelos" },
];

const CUIDADOS = [
  { t: "Faça backup antes de mexer nos dados", v: "Clique em “Baixar backup” (no topo do menu) antes de: Conferir gabaritos → Corrigir, Devolver nota, Refazer nota do aluno.", tom: "red" },
  { t: "Avise a turma antes de corrigir totais", v: "Se o total de uma NF mudar, os alunos que já lançaram podem precisar ajustar. Avise pelo Classroom.", tom: "amber" },
  { t: "Ordem segura para subir atualizações", v: "1) Baixar backup · 2) subir os arquivos (pasta src inteira, um commit só) · 3) esperar o build ficar verde · 4) abrir o sistema e conferir.", tom: "green" },
  { t: "Mudou a regra do Firestore?", v: "Só copie e cole no Console depois de conferir o arquivo .rules recebido. Não misture com outra atualização.", tom: "green" },
  { t: "Modo de teste", v: "Use a conta de teste para ver as telas como o aluno. Ela não afeta a turma, mas lembre de sair do modo antes de corrigir alunos reais.", tom: "green" },
  { t: "Lixeira de segurança", v: "“Refazer nota” guarda cópia de tudo que apagou. Em caso de engano, use “Restaurar” na própria tela.", tom: "green" },
];

function lerFeitos(chave) {
  try { return JSON.parse(localStorage.getItem(chave) || "{}") || {}; } catch { return {}; }
}

export default function GuiaProfessor({ turma, onIr, contadores = {} }) {
  const [aba, setAba] = useState("fluxo");
  const chave = "guiaProf_feito_" + (turma?.id || "sem-turma");
  const [feitos, setFeitos] = useState(() => lerFeitos(chave));
  useEffect(() => { setFeitos(lerFeitos(chave)); }, [chave]);

  function alternar(id) {
    const novo = { ...feitos, [id]: !feitos[id] };
    setFeitos(novo);
    try { localStorage.setItem(chave, JSON.stringify(novo)); } catch { /* sem armazenamento: segue só em memória */ }
  }

  const num = (c) => (c && contadores[c] > 0 ? contadores[c] : 0);

  return (
    <div>
      <div className="panel">
        <div className="panel-head"><h2>🧭 Guia do professor</h2></div>
        <p className="helper-note" style={{ marginTop: 0 }}>
          Mapa do sistema: o que fazer, em que ordem, e em qual item do menu.
          {turma?.nome ? <> Turma selecionada: <strong>{turma.nome}</strong>.</> : null} Clique em “Abrir” para ir direto à tela.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["fluxo", "Fluxo da turma"], ["resolver", "Preciso resolver…"], ["cuidados", "Boas práticas / cuidados"]].map(([k, r]) => (
            <button key={k} className={"btn " + (aba === k ? "" : "secondary")} onClick={() => setAba(k)}>{r}</button>
          ))}
        </div>
      </div>

      {aba === "fluxo" && (
        <>
          <div className="panel">
            <div className="panel-head"><h2>☀ Roteiro do dia de aula</h2></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
              {ROTEIRO_DO_DIA.map((p, i) => (
                <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ border: "1px solid var(--line, #d9d2c0)", borderRadius: 6, padding: "8px 12px", background: "var(--paper)", minWidth: 170 }}>
                    <div style={{ fontWeight: 700, color: "var(--green)" }}>{i + 1}. {p.titulo}
                      {num(p.contador) > 0 && <span className="nav-badge" style={{ marginLeft: 8 }}>{num(p.contador)}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{p.texto}</div>
                    <button className="btn" style={{ marginTop: 6, padding: "2px 10px", fontSize: 12 }} onClick={() => onIr(p.key)}>Abrir</button>
                  </div>
                  {i < ROTEIRO_DO_DIA.length - 1 && <span style={{ color: "var(--amber)", fontSize: 22 }}>→</span>}
                </div>
              ))}
            </div>
          </div>

          {FASES.map((f) => (
            <div className="panel" key={f.id}>
              <div className="panel-head" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: feitos[f.id] ? "var(--green)" : "var(--amber)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{feitos[f.id] ? "✓" : f.n}</span>
                <h2 style={{ margin: 0, textAlign: "left" }}>{f.titulo}</h2>
                <span className="tag-pill">{f.quando}</span>
                {f.marcavel && (
                  <label style={{ marginLeft: "auto", fontSize: 13, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!feitos[f.id]} onChange={() => alternar(f.id)} /> ✓ feito
                  </label>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
                {f.itens.map((it, i) => (
                  <div key={it.key + i} style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 200px", minWidth: 200 }}>
                    <div style={{ flex: 1, height: "100%", position: "relative", border: "1px solid var(--line, #d9d2c0)", borderRadius: 6, padding: 10, background: "var(--paper)" }}>
                      <div style={{ fontWeight: 700, color: "var(--green)", marginBottom: 3 }}>{it.nome}
                        {num(it.contador) > 0 && <span className="nav-badge" style={{ marginLeft: 8 }}>{num(it.contador)} {it.rotuloContador}</span>}
                      </div>
                      <div style={{ fontSize: 13 }}>{it.texto}</div>
                      {it.quando && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>Quando: {it.quando}</div>}
                      {it.aviso && <div style={{ fontSize: 12, marginTop: 6, background: "#f4e7c9", color: "var(--amber)", borderRadius: 4, padding: "3px 8px" }}>⚠ {it.aviso}</div>}
                      <button className="btn" style={{ marginTop: 8, padding: "2px 10px", fontSize: 12 }} onClick={() => onIr(it.key)}>Abrir</button>
                    </div>
                    {i < f.itens.length - 1 && <span style={{ color: "var(--amber)", fontSize: 22 }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {aba === "resolver" && (
        <div className="panel">
          <div className="panel-head"><h2>Preciso resolver…</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }}>
            {SITUACOES.map((s) => (
              <div key={s.t} style={{ border: "1px solid var(--line, #d9d2c0)", borderRadius: 6, padding: "10px 12px", background: "var(--paper)" }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>“{s.t}”</div>
                <div style={{ fontSize: 13.5 }}>{s.v}</div>
                {s.aviso && <div style={{ fontSize: 12, marginTop: 6, background: "#f4e7c9", color: "var(--amber)", borderRadius: 4, padding: "3px 8px", display: "inline-block" }}>⚠ mexe nos dados do aluno — backup antes</div>}
                <div><button className="btn" style={{ marginTop: 8, padding: "2px 10px", fontSize: 12 }} onClick={() => onIr(s.key)}>{s.rot}</button></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {aba === "cuidados" && (
        <div className="panel">
          <div className="panel-head"><h2>Boas práticas / cuidados</h2></div>
          <div style={{ display: "grid", gap: 10 }}>
            {CUIDADOS.map((c) => (
              <div key={c.t} className={c.tom === "red" ? "aviso-pedagogico" : "helper-note"} style={{ margin: 0 }}>
                <strong>{c.t}.</strong> {c.v}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
