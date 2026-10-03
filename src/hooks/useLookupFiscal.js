import { useEffect, useMemo, useState } from "react";

// Consulta de CFOP/NCM "ao digitar" (2026-10-03) — mesmos dados já publicados
// para a tela Consulta CFOP/NCM (public/dados/{cfop,ncm}.json), reaproveitados
// aqui para: (1) autocompletar — uma lista de sugestões aparece assim que o
// aluno/professor digita o primeiro número do CFOP ou do NCM, pra escolher
// entre as opções correlacionadas; e (2) uma dica de confirmação do que o
// código escolhido significa. Em nenhum dos dois casos o sistema diz se o
// código está CERTO para a operação — isso continua sendo o julgamento que a
// Análise fiscal pede pro aluno fazer sozinho.
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

function useDados(arquivo) {
  const [dados, setDados] = useState(null); // null = ainda carregando
  useEffect(() => {
    let vivo = true;
    carregar(arquivo)
      .then((d) => { if (vivo) setDados(d); })
      .catch(() => { if (vivo) setDados([]); });
    return () => { vivo = false; };
  }, [arquivo]);
  return dados;
}

export const soDigitos = (s) => String(s || "").replace(/\D/g, "");

// Array completo (para autocompletar por prefixo) — null enquanto carrega.
export function useDadosCfop() { return useDados("/dados/cfop.json"); }
export function useDadosNcm() { return useDados("/dados/ncm.json"); }

// Mapa código → registro (para a dica de confirmação de um código exato).
export function useLookupCfop() {
  const dados = useDadosCfop();
  return useMemo(() => (dados ? new Map(dados.map((d) => [String(d.codigo).trim(), d])) : null), [dados]);
}
export function useLookupNcm() {
  const dados = useDadosNcm();
  return useMemo(() => (dados ? new Map(dados.map((d) => [soDigitos(d.codigo), d])) : null), [dados]);
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
