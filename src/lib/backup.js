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

// Professor baixa a turma selecionada inteira — TODOS os alunos, com TUDO
// que cada um já fez até o momento (lançamentos, digitações de NF-e,
// classificações, análises fiscais). Serve como rede de segurança para
// quem esquecer de gerar o próprio backup individual — o professor sempre
// tem uma cópia recente de tudo, sem depender do aluno lembrar.
export async function backupDaTurma(turma) {
  const alunosSnap = await getDocs(collection(db, "turmas", turma.id, "alunos"));
  const alunos = alunosSnap.docs.map((d) => ({ matricula: d.id, ...d.data() }));
  const alunosCompletos = await Promise.all(
    alunos.map(async (a) => {
      const [lancamentos, digitacoesNFe, classificacoes, analisesFiscais] = await Promise.all([
        subcolecao(turma.id, a.matricula, "lancamentos"),
        subcolecao(turma.id, a.matricula, "digitacoesNFe"),
        subcolecao(turma.id, a.matricula, "classificacoes"),
        subcolecao(turma.id, a.matricula, "analisesFiscais"),
      ]);
      return { ...a, lancamentos, digitacoesNFe, classificacoes, analisesFiscais };
    })
  );
  baixarJson(
    `backup-ci-unidadeII-turma-${turma.nome.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.json`,
    { geradoEm: new Date().toISOString(), turma: { id: turma.id, nome: turma.nome }, alunos: alunosCompletos }
  );
}
