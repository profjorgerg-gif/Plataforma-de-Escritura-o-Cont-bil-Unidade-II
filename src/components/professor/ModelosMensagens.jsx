import { useState } from "react";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";

// Modelos de mensagens para o Google Classroom (pedido do professor,
// 2026-10-08). Textos prontos com dois campos: [NOME DO ALUNO] e [SEU NOME],
// preenchidos ao copiar. As edições do professor ficam só neste navegador
// (localStorage) — não mexe em regras do Firebase. Só LÊ a lista de alunos.

const CHAVE = "modelosMensagens_v1";

const MODELOS = [
  { grupo: "Relatórios", id: "rel-individual", titulo: "Relatório individual, com anexo", texto:
`Olá, [NOME DO ALUNO]!

Segue em anexo o seu relatório de orientação individual da Unidade II (Escrituração Contábil), gerado a partir do seu andamento na plataforma.

Como ler:
• "Documentos em dia": quantos já estão completos.
• "Corrigir": pendências que precisam de ajuste.
• "Conferir": pontos que vale revisar.
• "Onde corrigir": o caminho exato no menu da plataforma.

O que fazer:
1. Comece pelos itens "corrigir".
2. Faça os ajustes seguindo a coluna "Onde corrigir".
3. Lembre-se: o lançamento só chega à minha correção depois que você clica em ENVIAR. Rascunho eu não vejo.
4. Se houver lançamento repetido em rascunho, use o botão "Excluir rascunho" no Livro diário.

O relatório mostra a situação de hoje. Se você corrigir tudo, me avise ou aguarde a minha conferência.

Dúvidas? Me procure em aula.

[SEU NOME]` },
  { grupo: "Relatórios", id: "rel-turma", titulo: "Aviso para a turma sobre os relatórios", texto:
`Turma, atenção!

Acabei de conferir o andamento de cada um na plataforma (Unidade II) e vou encaminhar, de forma individual, o relatório de orientação de cada aluno.

No seu relatório você vai encontrar o que precisa corrigir e o caminho exato, no menu da plataforma, para fazer o ajuste.

Peço que:
1. Abram o relatório que receberem no Classroom (cada um recebe o seu).
2. Corrijam primeiro os itens marcados como "corrigir".
3. Enviem para correção tudo o que estiver em rascunho. Só chega até mim o que for enviado.

Quem não receber relatório está com o trabalho em dia. Parabéns!

Dúvidas, me procurem em aula.

[SEU NOME]` },
  { grupo: "Pendências do aluno", id: "rascunho", titulo: "Lançamentos parados em rascunho", texto:
`Olá, [NOME DO ALUNO]!

Ao conferir a plataforma, vi que você tem lançamentos salvos apenas como RASCUNHO no Livro diário. Rascunho fica só para você: eu não consigo ver nem corrigir.

O que fazer:
1. Menu → Livro diário (etapa 5).
2. Na linha do lançamento em rascunho, clique em ✏️ Editar.
3. Confira se débito = crédito e se o histórico descreve a operação.
4. Clique em "Enviar para análise do professor".

Só depois de enviar o lançamento chega à minha fila de correção.

[SEU NOME]` },
  { grupo: "Pendências do aluno", id: "duplicado", titulo: "Lançamento duplicado", texto:
`Olá, [NOME DO ALUNO]!

No Livro diário, um dos seus documentos ficou com dois lançamentos repetidos.

O que fazer:
1. Menu → Livro diário (etapa 5) e localize as linhas do mesmo documento.
2. Nos repetidos que estiverem em rascunho, clique em "🗑️ Excluir rascunho".
3. Fique com um só lançamento, confira o histórico e envie.

Se o repetido já tiver sido enviado, me avise que eu devolvo para você.

[SEU NOME]` },
  { grupo: "Pendências do aluno", id: "digitacao", titulo: "Digitação ou análise fiscal pendente", texto:
`Olá, [NOME DO ALUNO]!

Na plataforma, há documentos em que a digitação da NF-e ou a análise fiscal ainda não foi concluída. Sem isso o documento não libera a classificação.

O que fazer:
1. Menu → Digitação e análise fiscal (etapa 3).
2. Escolha o documento pendente.
3. Digite os dados da NF-e e salve.
4. Faça a análise de CFOP, NCM e CST e clique em "Enviar análise" (rascunho não conta).

[SEU NOME]` },
  { grupo: "Pendências do aluno", id: "classificacao", titulo: "Classificação pendente", texto:
`Olá, [NOME DO ALUNO]!

Notei documentos que já têm digitação e análise fiscal, mas ainda sem classificação contábil ou sem lançamento no Diário.

O que fazer:
1. Menu → Classificação contábil (etapa 4): defina a conta de débito e a de crédito e salve.
2. Clique em "usar no lançamento" para levar a classificação ao Livro diário.
3. No Livro diário (etapa 5), revise o histórico e envie para análise do professor.

[SEU NOME]` },
  { grupo: "Pendências do aluno", id: "devolvido", titulo: "Lançamento devolvido para correção", texto:
`Olá, [NOME DO ALUNO]!

Devolvi um dos seus lançamentos com uma observação. Leia com atenção o que está indicado.

O que fazer:
1. Menu → Livro diário (etapa 5).
2. Na linha devolvida, veja a observação e clique em ✏️ Editar.
3. Faça a correção e clique em "Reenviar para análise do professor".

[SEU NOME]` },
  { grupo: "Prazos e reconhecimento", id: "prazo", titulo: "Lembrete de prazo da unidade", texto:
`Olá, [NOME DO ALUNO]!

Lembrete: o prazo da Unidade II está se aproximando. Acompanhe o seu andamento em Menu → Meu progresso e priorize o que ainda estiver pendente.

Lembre-se de que só conta para a correção o que for ENVIADO, não o que estiver em rascunho.

Qualquer dúvida, me procure em aula.

[SEU NOME]` },
  { grupo: "Prazos e reconhecimento", id: "parabens", titulo: "Parabéns, aluno em dia", texto:
`Olá, [NOME DO ALUNO]!

Conferi o seu andamento na plataforma (Unidade II) e o seu trabalho está em dia, sem pendências importantes. Parabéns pelo capricho! Continue assim e mantenha o ritmo até o prazo da unidade.

[SEU NOME]` },
];

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; }
}
function gravar(estado) {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* sem armazenamento: segue só na sessão */ }
}

export default function ModelosMensagens({ turma }) {
  const alunos = useAlunosDaTurma(turma?.id);
  const [estado, setEstado] = useState(ler); // { professor, edicoes: {id: texto} }
  const [aluno, setAluno] = useState("");
  const [editando, setEditando] = useState(null);
  const [rascunho, setRascunho] = useState("");
  const [copiado, setCopiado] = useState(null);

  const edicoes = estado.edicoes || {};
  const professor = estado.professor || "";
  const nomeAluno = alunos?.find((a) => a.matricula === aluno)?.nome || "";

  function atualizar(novo) { setEstado(novo); gravar(novo); }
  const textoDe = (m) => (edicoes[m.id] ?? m.texto);
  const preencher = (t) => t.split("[NOME DO ALUNO]").join(nomeAluno || "[NOME DO ALUNO]").split("[SEU NOME]").join(professor || "[SEU NOME]");

  async function copiar(m) {
    const texto = preencher(editando === m.id ? rascunho : textoDe(m));
    try { await navigator.clipboard.writeText(texto); setCopiado(m.id); setTimeout(() => setCopiado(null), 3000); }
    catch (e) { window.prompt("Não copiou automaticamente — selecione e copie (Ctrl+C):", texto); }
  }
  function abrirEdicao(m) { setEditando(m.id); setRascunho(textoDe(m)); }
  function salvarEdicao(m) { atualizar({ ...estado, edicoes: { ...edicoes, [m.id]: rascunho } }); setEditando(null); }
  function restaurar(m) {
    const novo = { ...edicoes }; delete novo[m.id];
    atualizar({ ...estado, edicoes: novo }); setEditando(null);
  }

  const grupos = [...new Set(MODELOS.map((m) => m.grupo))];

  return (
    <>
      <div className="screen-eyebrow">modelos de mensagens</div>
      <h2 className="screen-title">Modelos de mensagens para o Classroom</h2>
      <p className="screen-sub">Escolha o aluno e o seu nome uma vez: os campos [NOME DO ALUNO] e [SEU NOME] são preenchidos sozinhos. Clique em Copiar e cole no Classroom.</p>

      <div className="panel">
        <div className="panel-body">
          <div className="grid-2">
            <div className="field">
              <label>Aluno (para a mensagem individual)</label>
              <select value={aluno} onChange={(e) => setAluno(e.target.value)}>
                <option value="">— sem aluno (deixa o campo em branco) —</option>
                {(alunos || []).slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((a) => <option key={a.matricula} value={a.matricula}>{a.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Seu nome (assinatura)</label>
              <input value={professor} onChange={(e) => atualizar({ ...estado, professor: e.target.value })} placeholder="Ex.: Prof. Fulano" />
            </div>
          </div>
        </div>
      </div>

      {grupos.map((g) => (
        <div key={g}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-faint)", margin: "18px 0 8px", textTransform: "uppercase" }}>{g}</div>
          {MODELOS.filter((m) => m.grupo === g).map((m) => (
            <div key={m.id} className="panel" style={{ marginBottom: 10 }}>
              <div className="panel-head">
                <h3 style={{ margin: 0 }}>{m.titulo}{edicoes[m.id] !== undefined && <span className="tag-pill warn" style={{ marginLeft: 8 }}>editado</span>}</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {editando === m.id ? (
                    <>
                      <button className="btn secondary" onClick={() => salvarEdicao(m)}>Salvar edição</button>
                      <button className="btn secondary" onClick={() => setEditando(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      {edicoes[m.id] !== undefined && <button className="btn secondary" onClick={() => restaurar(m)}>Restaurar texto original</button>}
                      <button className="btn secondary" onClick={() => abrirEdicao(m)}>✏️ Editar</button>
                    </>
                  )}
                  <button className="btn" onClick={() => copiar(m)}>{copiado === m.id ? "Copiado ✓" : "Copiar"}</button>
                </div>
              </div>
              <div className="panel-body">
                {editando === m.id ? (
                  <textarea style={{ width: "100%", minHeight: 220, fontFamily: "inherit" }} value={rascunho} onChange={(e) => setRascunho(e.target.value)} />
                ) : (
                  <div style={{ whiteSpace: "pre-line", fontSize: 13, color: "var(--ink-soft)" }}>{preencher(textoDe(m))}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="helper-note">Suas edições e o seu nome ficam salvos só neste navegador. Em outro computador, volta o texto original.</div>
    </>
  );
}
