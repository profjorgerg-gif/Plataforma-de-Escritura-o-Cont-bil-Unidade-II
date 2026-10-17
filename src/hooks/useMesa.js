import { useCallback, useEffect, useRef, useState } from "react";

// Janelas da "Mesa do professor" (2026-10-16). Só guarda, em memória, quais janelas estão abertas e onde.
// Não lê nem grava nada no Firestore. Cada tela (chave) tem no máximo uma janela; abrir de novo só traz para a frente.
// 2026-10-17 — "Organizar sozinho" (ideia do kit Mesa de janelas): 1 janela = tudo; 2 = lado a lado; 3 = 1 à esquerda + 2 à direita;
// 4 = grade 2x2; 5+ = 3 colunas. Desligado por padrão; a escolha fica só no navegador (localStorage). Não toca no Firestore.
function lerAuto(chave) { try { return localStorage.getItem(chave) === "1"; } catch { return false; } }
function posAuto(n, i, W, H) {
  const g = 3, c = (x, y, w, h) => ({ x: Math.floor(x + g / 2), y: Math.floor(y + g / 2), w: Math.max(300, Math.floor(w - g)), h: Math.max(160, Math.floor(h - g)), max: false });
  if (n === 1) return c(0, 0, W, H);
  if (n === 2) return c(i * W / 2, 0, W / 2, H);
  if (n === 3) return i === 0 ? c(0, 0, W / 2, H) : c(W / 2, (i - 1) * H / 2, W / 2, H / 2);
  if (n === 4) return c((i % 2) * W / 2, Math.floor(i / 2) * H / 2, W / 2, H / 2);
  const cols = 3, r = Math.ceil(n / cols);
  return c((i % cols) * W / cols, Math.floor(i / cols) * H / r, W / cols, H / r);
}

export function useMesa({ home = "painel-turma", avisarRepetida = false, chaveAuto = "mesa_auto" } = {}) {
  const [auto, setAutoEstado] = useState(() => lerAuto(chaveAuto));
  const setAuto = useCallback((v) => { setAutoEstado(v); try { localStorage.setItem(chaveAuto, v ? "1" : "0"); } catch { /* sem localStorage: vale só nesta sessão */ } }, [chaveAuto]);
  const [janelas, setJanelas] = useState([]);
  const ref = useRef([]);
  ref.current = janelas;
  const [aviso, setAviso] = useState(null);
  const z = useRef(10);
  const area = useRef({ w: 1200, h: 640 });
  const definirArea = useCallback((w, h) => { area.current = { w, h }; }, []);

  const abrir = useCallback((chave, foco = null, op = {}) => {
    if ((op.avisar ?? avisarRepetida) && ref.current.some((j) => j.chave === chave)) setAviso({ chave, n: Date.now() });
    setJanelas((js) => {
      const nz = ++z.current;
      const i = js.findIndex((j) => j.chave === chave);
      if (i >= 0) return js.map((j, k) => (k === i ? { ...j, foco, min: false, z: nz } : j));
      const { w: W, h: H } = area.current;
      const grande = chave === home;
      const w = Math.min(grande ? 1060 : 900, W - 12), h = Math.min(grande ? H - 12 : 560, H - 12);
      const n = js.length;
      return [...js, { chave, foco, x: Math.min(8 + n * 28, Math.max(0, W - w)), y: Math.min(6 + n * 28, Math.max(0, H - h)), w, h, min: false, max: false, z: nz, ord: nz }];
    });
  }, [home, avisarRepetida]);
  const limparAviso = useCallback(() => setAviso(null), []);
  const limpar = useCallback(() => setJanelas([]), []);
  const mudar = (chave, f) => setJanelas((js) => js.map((j) => (j.chave === chave ? { ...j, ...f(j) } : j)));
  const focar = useCallback((chave) => mudar(chave, () => ({ min: false, z: ++z.current })), []);
  const fechar = useCallback((chave) => setJanelas((js) => js.filter((j) => j.chave !== chave)), []);
  const minimizar = useCallback((chave) => mudar(chave, () => ({ min: true })), []);
  const alternarMax = useCallback((chave) => mudar(chave, (j) => ({ max: !j.max, z: ++z.current })), []);
  const geometria = useCallback((chave, g) => mudar(chave, () => g), []);
  const encaixar = useCallback((chave, lado) => {
    const { w: W, h: H } = area.current;
    if (lado === "max") return mudar(chave, () => ({ max: true, z: ++z.current }));
    mudar(chave, () => ({ max: false, x: lado === "dir" ? Math.ceil(W / 2) : 0, y: 0, w: Math.floor(W / 2), h: H, z: ++z.current }));
  }, []);
  const organizar = useCallback((modo) => {
    const { w: W, h: H } = area.current;
    setJanelas((js) => {
      const vis = js.filter((j) => !j.min).sort((a, b) => a.z - b.z);
      if (!vis.length) return js;
      const pos = {};
      if (modo === "auto") {
        const ord = [...vis].sort((a, b) => (a.ord || 0) - (b.ord || 0));
        ord.forEach((j, i) => { pos[j.chave] = posAuto(ord.length, i, W, H); });
      } else if (modo === "cascata") vis.forEach((j, i) => { pos[j.chave] = { x: Math.min(8 + i * 26, W - 320), y: Math.min(6 + i * 26, H - 180), w: Math.min(900, W - 40), h: Math.min(540, H - 20) }; });
      else {
        const c = Math.ceil(Math.sqrt(vis.length)), r = Math.ceil(vis.length / c);
        vis.forEach((j, i) => { pos[j.chave] = { x: Math.floor((i % c) * W / c), y: Math.floor(Math.floor(i / c) * H / r), w: Math.floor(W / c) - 2, h: Math.floor(H / r) - 2 }; });
      }
      return js.map((j) => (pos[j.chave] ? { ...j, ...pos[j.chave], max: false } : j));
    });
  }, []);
  const minimizarTodas = useCallback(() => setJanelas((js) => js.map((j) => ({ ...j, min: true }))), []);
  const fecharTodas = useCallback(() => setJanelas((js) => js.filter((j) => j.chave === home)), [home]);

  // com "Organizar sozinho" ligado: rearruma ao abrir, fechar, minimizar ou restaurar uma janela (não ao arrastar/redimensionar)
  const assinatura = janelas.map((j) => j.chave + (j.min ? "-" : "+")).join("|");
  useEffect(() => { if (auto) organizar("auto"); }, [auto, assinatura]); // eslint-disable-line react-hooks/exhaustive-deps

  return { auto, setAuto, janelas, aviso, limparAviso, limpar, definirArea, abrir, focar, fechar, minimizar, alternarMax, geometria, encaixar, organizar, minimizarTodas, fecharTodas };
}
