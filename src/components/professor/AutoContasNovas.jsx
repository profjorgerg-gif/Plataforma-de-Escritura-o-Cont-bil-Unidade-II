import { useEffect, useRef } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";
import { CONTAS_NOVAS } from "../../lib/folha.js";
import { CONTAS_NOVAS_RESC } from "../../lib/rescisao.js";
import { naturezaDe, destinoDe } from "../../data/planoContasOficial.js";

// Chamado Nº 0079 (17/11/2026): aluno sem a conta 2.1.3.03 na Contabilização da rescisão.
// Quando o professor abre a plataforma, cria sozinho as contas que a folha e a rescisão exigem e que ainda não estão no Plano de contas
// (as mesmas dos botões "Criar contas" de Folha e Rescisão). Só ACRESCENTA contas que faltam; nunca altera nem apaga as existentes.
export default function AutoContasNovas() {
  const { contas, deFallback } = usePlanoContas();
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current || !contas || deFallback) return;
    const faltam = [...CONTAS_NOVAS, ...CONTAS_NOVAS_RESC].filter((c, i, v) => v.findIndex((x) => x.codigo === c.codigo) === i && !contas.some((x) => x.codigo === c.codigo));
    if (!faltam.length) { feito.current = true; return; }
    feito.current = true;
    faltam.forEach((c) => {
      setDoc(doc(db, "planoContas", c.codigo), { nome: c.nome, grupo: c.grupo, subgrupo: c.subgrupo, natureza: naturezaDe(c.grupo, false), destino: destinoDe(c.grupo) }).catch(() => {});
    });
  }, [contas, deFallback]);
  return null;
}
