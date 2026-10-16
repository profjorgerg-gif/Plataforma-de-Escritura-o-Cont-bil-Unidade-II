// Mesa do aluno (2026-10-16): fase de teste. Enquanto MESA_ALUNO_ABERTA for false, o botão "Mesa" só aparece para quem abrir
// a plataforma uma vez pelo endereço com ?mesa=1 (os representantes da turma). Isso só liga um aviso neste navegador; não grava nada na nuvem.
export const MESA_ALUNO_ABERTA = false;
export function mesaAlunoLiberada() {
  if (MESA_ALUNO_ABERTA) return true;
  try {
    if (new URLSearchParams(window.location.search).get("mesa") === "1") localStorage.setItem("mesaAlunoLiberada", "1");
    return localStorage.getItem("mesaAlunoLiberada") === "1";
  } catch { return false; }
}
