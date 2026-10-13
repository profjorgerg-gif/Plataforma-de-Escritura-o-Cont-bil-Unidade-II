import { useState } from "react";
import { Abas } from "../shared/AgbUI.jsx";

// Reúne telas que já existiam em abas de um mesmo item do menu do professor (2026-10-13).
// Só organiza a navegação: cada aba mostra a tela de sempre, sem mudar o que ela lê ou grava.
// abas = [{ key, label, render: () => JSX }]; inicial = key da aba que abre primeiro.
export default function TelaComAbas({ abas, inicial }) {
  const [ativa, setAtiva] = useState(abas.some((a) => a.key === inicial) ? inicial : abas[0].key);
  const atual = abas.find((a) => a.key === ativa) || abas[0];
  return (
    <>
      <Abas abas={abas.map((a) => ({ key: a.key, label: a.label }))} ativa={atual.key} onChange={setAtiva} />
      {atual.render()}
    </>
  );
}
