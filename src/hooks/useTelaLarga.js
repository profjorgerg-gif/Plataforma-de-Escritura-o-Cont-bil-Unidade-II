import { useEffect, useState } from "react";

// true quando a tela é larga o bastante para trabalhar com janelas (computador). Só lê a largura; não grava nada.
export function useTelaLarga(minimo = 900) {
  const q = "(min-width: " + minimo + "px)";
  const [larga, setLarga] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q).matches : true));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const m = window.matchMedia(q);
    const f = () => setLarga(m.matches);
    f();
    m.addEventListener ? m.addEventListener("change", f) : m.addListener(f);
    return () => { m.removeEventListener ? m.removeEventListener("change", f) : m.removeListener(f); };
  }, [q]);
  return larga;
}
