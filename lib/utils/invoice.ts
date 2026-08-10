import type { Enums } from "@/lib/types/database.types";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRatePercent: number;
};

export function calcLineTotal(item: InvoiceLineItem) {
  const base = (item.quantity || 0) * (item.unitPrice || 0);
  const vat = base * ((item.vatRatePercent || 0) / 100);
  return { base, vat, total: base + vat };
}

export function calcInvoiceTotals(items: InvoiceLineItem[]) {
  const byRate: Record<string, { base: number; vat: number }> = {};
  items.forEach((it) => {
    const { base, vat } = calcLineTotal(it);
    const key = String(it.vatRatePercent);
    if (!byRate[key]) byRate[key] = { base: 0, vat: 0 };
    byRate[key].base += base;
    byRate[key].vat += vat;
  });
  let base = 0;
  let vat = 0;
  Object.values(byRate).forEach((r) => {
    base += r.base;
    vat += r.vat;
  });
  return { byRate, base, vat, total: base + vat };
}

// Sazba s nejvetsim zakladem se pouzije jako souhrnna sazba na urovni dokladu
// (nas obecny model ma jen jednu sazbu na doklad; skutecny rozpad zustava v polozkach).
export function dominantVatRate(items: InvoiceLineItem[]): number {
  const totals = calcInvoiceTotals(items);
  let maxRate = 21;
  let maxBase = -1;
  Object.entries(totals.byRate).forEach(([rate, v]) => {
    if (v.base > maxBase) {
      maxBase = v.base;
      maxRate = Number(rate);
    }
  });
  return maxRate;
}

export function vatPercentToEnum(percent: number): Enums<"vat_rate"> {
  if (percent === 0) return "osvobozeno";
  if (percent >= 20) return "zakladni";
  if (percent >= 13) return "snizena";
  if (percent > 0) return "druha_snizena";
  return "mimo_dph";
}

export function generateSpdPayload(
  iban: string,
  amount: number,
  variableSymbol: string,
  message: string
): string {
  const clean = iban.replace(/\s/g, "");
  const msg = message.slice(0, 60);
  return `SPD*1.0*ACC:${clean}*AM:${amount.toFixed(2)}*CC:CZK*X-VS:${variableSymbol}*MSG:${msg}`;
}
