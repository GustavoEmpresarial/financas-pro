/**
 * addMonthsKeepingDay anda `months` meses a partir de uma data "AAAA-MM-DD",
 * preso ao ultimo dia do mes de destino.
 *
 * `new Date(y, m - 1 + i, d)` e uma armadilha: o JS normaliza o estouro de
 * dia, entao 31/01 + 1 mes vira 03/03 em vez de 28/02. E o mesmo bug que
 * existia no backend legado (adiamento de conta, avanco de assinatura) —
 * corrigido la em server/shared/dates.AddMonthsKeepingDay. Esta e a
 * contraparte no cliente, usada no parcelamento de compra no cartão.
 */
export function addMonthsKeepingDay(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Ancora no dia 1, onde não há estouro possível, e só então prende o dia.
  const firstOfTarget = new Date(y, m - 1 + months, 1);
  const lastDayOfTarget = new Date(
    firstOfTarget.getFullYear(),
    firstOfTarget.getMonth() + 1,
    0,
  ).getDate();
  const day = Math.min(d, lastDayOfTarget);
  const target = new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth(), day);

  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
