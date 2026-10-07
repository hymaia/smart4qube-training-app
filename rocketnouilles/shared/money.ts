const EURO = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** 1234 -> "12,34 €" */
export function formatEuros(cents: number): string {
  return EURO.format(Math.round(cents) / 100);
}

export function toCents(euros: number): number {
  return Math.round(euros * 100);
}
