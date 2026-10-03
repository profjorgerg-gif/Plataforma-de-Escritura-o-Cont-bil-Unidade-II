import { useEffect, useState } from "react";

// Consulta de CFOP/NCM "ao digitar" (2026-10-03) — mesmos dados já publicados
// para a tela Consulta CFOP/NCM (public/dados/{cfop,ncm}.json), reaproveitados
// aqui como um dicionário código → descrição oficial, para mostrar uma dica
// discreta logo abaixo dos campos onde CFOP/NCM são digitados (Digitação da
// NF-e do aluno e Gabarito do professor). Mostra só o que o código SIGNIFICA
// — nunca se ele está certo para aquela operação, que é exatamente o
// julgamento que a Análise fiscal pede pro aluno fazer sozinho.
//
// Cache em módulo (fora do hook): a tabela de NCM tem 15 mil linhas — uma vez
// carregada numa tela, as outras reaproveitam sem baixar de novo.
const cache = {};
function carregar(arquivo) {
  if (cache[arquivo]) return cache[arquivo];
  cache[arquivo] = fetch(arquivo).then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  });
  return cache[arquivo];
}

function useMapaFiscal(arquivo, chaveFn) {
  const [mapa, setMapa] = useState(null); // null = ainda carregando
  useEffect(() => {
    let vivo = true;
    carregar(arquivo)
      .then((dados) => { if (vivo) setMapa(new Map(dados.map((d) => [chaveFn(d.codigo), d]))); })
      .catch(() => { if (vivo) setMapa(new Map()); });
    return () => { vivo = false; };
  }, [arquivo]);
  return mapa;
}

export const soDigitos = (s) => String(s || "").replace(/\D/g, "");

export function useLookupCfop() {
  return useMapaFiscal("/dados/cfop.json", (c) => String(c).trim());
}

export function useLookupNcm() {
  return useMapaFiscal("/dados/ncm.json", soDigitos);
}

export function buscarCfop(mapaCfop, codigo) {
  if (!mapaCfop || !codigo) return null;
  return mapaCfop.get(String(codigo).trim()) || null;
}

export function buscarNcm(mapaNcm, codigo) {
  if (!mapaNcm || !codigo) return null;
  const d = soDigitos(codigo);
  if (d.length < 4) return null; // poucos dígitos ainda, não vale a pena buscar
  return mapaNcm.get(d) || null;
}
