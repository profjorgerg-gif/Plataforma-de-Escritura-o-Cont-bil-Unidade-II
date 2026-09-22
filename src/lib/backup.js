import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

function baixarJson(nomeArquivo, dados) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nomeArquivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function subcolecao(turmaId, matricula, nome) {
  const snap = await getDocs(collection(db, "turmas", turmaId, "alunos", matricula, nome));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Aluno baixa só os próprios dados — decisão registrada no modelo de dados
// (o protótipo exportava todos os alunos simulados de uma vez, o que não
// faz sentido com usuários reais).
export async function backupDoAluno(perfil) {
  const [lancamentos, digitacoesNFe, classificacoes, analisesFiscais] = await Promise.all([
    subcolecao(perfil.turmaId, perfil.matricula, "lancamentos"),
    subcolecao(perfil.turmaId, perfil.matricula, "digitacoesNFe"),
    subcolecao(perfil.turmaId, perfil.matricula, "classificacoes"),
    subcolecao(perfil.turmaId, perfil.matricula, "analisesFiscais"),
  ]);
  baixarJson(
    `backup-ci-unidadeII-aluno-${perfil.matricula}-${new Date().toISOString().slice(0, 10)}.json`,
    { geradoEm: new Date().toISOString(), matricula: perfil.matricula, turmaId: perfil.turmaId, lancamentos, digitacoesNFe, classificacoes, analisesFiscais }
  );
}

// Professor baixa a turma selecionada inteira — alunos + lançamentos de
// cada um. Ele é responsável pelos dados da própria turma; um export por
// aluno individual não faria sentido para quem está corrigindo/avaliando.
export async function backupDaTurma(turma) {
  const alunosSnap = await getDocs(collection(db, "turmas", turma.id, "alunos"));
  const alunos = alunosSnap.docs.map((d) => ({ matricula: d.id, ...d.data() }));
  const alunosComLancamentos = await Promise.all(
    alunos.map(async (a) => ({ ...a, lancamentos: await subcolecao(turma.id, a.matricula, "lancamentos") }))
  );
  baixarJson(
    `backup-ci-unidadeII-turma-${turma.nome.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.json`,
    { geradoEm: new Date().toISOString(), turma: { id: turma.id, nome: turma.nome }, alunos: alunosComLancamentos }
  );
}
