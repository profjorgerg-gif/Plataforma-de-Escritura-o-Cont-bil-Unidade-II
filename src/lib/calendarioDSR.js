// DSR pelo calendário real da competência (decisão do professor em 03/11/2026, chamado nº 0052).
// Dias de descanso = domingos + feriados que caem de segunda a sábado. Dias úteis = dias do mês − descanso (o sábado conta como útil).
// Feriados NACIONAIS (Carnaval e Corpus Christi são facultativos e não entram). O professor pode somar feriados estaduais/municipais.
export const FERIADOS_NACIONAIS = {
  2026: ["01-01", "04-03", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"],
  2027: ["01-01", "03-26", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"],
};
export const DSR_FIXO = { uteis: 24, descanso: 6 };

// extras: texto com datas "dd/mm", separadas por vírgula, espaço ou ponto e vírgula (ex.: "28/10, 15/10")
export function feriadosExtras(texto, ano) {
  return String(texto || "").split(/[,;\s]+/).map((s) => s.match(/^(\d{1,2})\/(\d{1,2})$/)).filter(Boolean)
    .map((m) => String(m[2]).padStart(2, "0") + "-" + String(m[1]).padStart(2, "0")).filter((x) => x);
}

// competencia "aaaa-mm". Devolve null se o ano não tem lista de feriados cadastrada.
export function diasDSRdoMes(competencia, extrasTexto) {
  const m = String(competencia || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const ano = Number(m[1]), mes = Number(m[2]);
  const lista = FERIADOS_NACIONAIS[ano];
  if (!lista || mes < 1 || mes > 12) return null;
  const dias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, "0");
  const feriados = [...new Set([...lista, ...feriadosExtras(extrasTexto, ano)])].filter((x) => x.startsWith(mm + "-"));
  let domingos = 0; const fer = [];
  for (let d = 1; d <= dias; d++) {
    const dom = new Date(Date.UTC(ano, mes - 1, d)).getUTCDay() === 0;
    if (dom) domingos++;
    else if (feriados.includes(mm + "-" + String(d).padStart(2, "0"))) fer.push(String(d).padStart(2, "0") + "/" + mm);
  }
  const descanso = domingos + fer.length;
  return { dias, domingos, feriados: fer, descanso, uteis: dias - descanso };
}

export const textoDSR = (d) => d ? `${d.uteis} dias úteis e ${d.descanso} de descanso (${d.domingos} domingo${d.domingos === 1 ? "" : "s"}${d.feriados.length ? " + " + d.feriados.length + " feriado" + (d.feriados.length === 1 ? "" : "s") + ": " + d.feriados.join(", ") : ""})` : "";
