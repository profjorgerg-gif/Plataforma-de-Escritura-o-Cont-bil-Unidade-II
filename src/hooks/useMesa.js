import { useCallback, useRef, useState } from "react";

// Janelas da "Mesa do professor" (2026-10-16). Só guarda, em memória, quais janelas estão abertas e onde.
// Não lê nem grava nada no Firestore. Cada tela (chave) tem no máximo uma janela; abrir de novo só traz para a frente.
export function useMesa({ home = "painel-turma", avisarRepetida = false } = {}) {
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
      return [...js, { chave, foco, x: Math.min(8 + n * 28, Math.max(0, W - w)), y: Math.min(6 + n * 28, Math.max(0, H - h)), w, h, min: false, max: false, z: nz }];
    });
  }, [home, avisarRepetida]);
  const limparAviso = useCallback(() => setAviso(null), []);
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
      if (modo === "cascata") vis.forEach((j, i) => { pos[j.chave] = { x: Math.min(8 + i * 26, W - 320), y: Math.min(6 + i * 26, H - 180), w: Math.min(900, W - 40), h: Math.min(540, H - 20) }; });
      else {
        const c = Math.ceil(Math.sqrt(vis.length)), r = Math.ceil(vis.length / c);
        vis.forEach((j, i) => { pos[j.chave] = { x: Math.floor((i % c) * W / c), y: Math.floor(Math.floor(i / c) * H / r), w: Math.floor(W / c) - 2, h: Math.floor(H / r) - 2 }; });
      }
      return js.map((j) => (pos[j.chave] ? { ...j, ...pos[j.chave], max: false } : j));
    });
  }, []);
  const minimizarTodas = useCallback(() => setJanelas((js) => js.map((j) => ({ ...j, min: true }))), []);
  const fecharTodas = useCallback(() => setJanelas((js) => js.filter((j) => j.chave === home)), [home]);

  return { janelas, aviso, limparAviso, definirArea, abrir, focar, fechar, minimizar, alternarMax, geometria, encaixar, organizar, minimizarTodas, fecharTodas };
}
