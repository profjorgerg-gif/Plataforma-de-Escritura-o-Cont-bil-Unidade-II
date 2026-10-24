import { useEffect, useRef } from "react";

// Trava de leitura (2026-10-24): enquanto o professor "vê como o aluno", campos de digitação e botões de gravar ficam desabilitados.
// Menu e abas continuam funcionando. As regras do Firestore são a segunda barreira (não aceitam escrita em nome de aluno real).
const GRAVA = /salvar|enviar|excluir|apagar|entreg|lan[cç]ar|devolv|gravar|confirm|criar|adicionar|remover|limpar|zerar|importar|finalizar|conclu|refazer|restaur|marcar|aplicar|usar sugest|responder|publicar|cancelar lan/i;

export default function TravaLeitura({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const travar = () => {
      el.querySelectorAll("input, textarea, select").forEach((x) => { if (!x.disabled) { x.disabled = true; x.dataset.travaLeitura = "1"; } });
      el.querySelectorAll("button").forEach((b) => {
        if (!b.disabled && GRAVA.test(b.textContent || "")) { b.disabled = true; b.dataset.travaLeitura = "1"; b.title = "Somente visualização"; }
      });
    };
    travar();
    const mo = new MutationObserver(travar);
    mo.observe(el, { childList: true, subtree: true });
    // segunda barreira: se algum botão de gravar escapar, o clique é barrado
    const barra = (ev) => {
      const b = ev.target.closest && ev.target.closest("button");
      if (b && GRAVA.test(b.textContent || "")) { ev.preventDefault(); ev.stopPropagation(); }
    };
    el.addEventListener("click", barra, true);
    return () => { mo.disconnect(); el.removeEventListener("click", barra, true); };
  }, []);
  return <div ref={ref}>{children}</div>;
}
