import { useCallback, useEffect, useState } from "react";

// Tema claro/escuro (2026-10-16). Guardado só neste navegador. Padrão: claro (igual a hoje).
// O atributo só vale enquanto a área logada está aberta; as telas de acesso continuam claras.
const CHAVE = "temaPlataforma";
function ler() { try { return localStorage.getItem(CHAVE) === "escuro" ? "escuro" : "claro"; } catch { return "claro"; } }

export function useTema() {
  const [tema, setTema] = useState(ler);
  useEffect(() => {
    const el = document.documentElement;
    if (tema === "escuro") el.setAttribute("data-tema", "escuro"); else el.removeAttribute("data-tema");
    return () => { el.removeAttribute("data-tema"); };
  }, [tema]);
  const alternar = useCallback(() => {
    setTema((t) => {
      const n = t === "escuro" ? "claro" : "escuro";
      try { localStorage.setItem(CHAVE, n); } catch { /* sem armazenamento */ }
      return n;
    });
  }, []);
  return { tema, alternar };
}
