import type { Enums } from "@/lib/types/database.types";

export const statusLabels: Record<Enums<"document_status">, string> = {
  novy: "Nový",
  ke_kontrole: "Ke kontrole",
  schvaleny: "Schválený",
  ceka_na_uhradu: "Čeká na úhradu",
  zaplaceny: "Zaplacený",
  chybi_doklad: "Chybí doklad",
  predany_ucetni: "Předaný účetní",
};

// tmavomodra = default, zelena = vyreseno, oranzova = ke kontrole, cervena = chyba/po splatnosti
export const statusColors: Record<Enums<"document_status">, string> = {
  novy: "bg-slate-100 text-slate-700 border-slate-300",
  ke_kontrole: "bg-orange-50 text-orange-700 border-orange-300",
  schvaleny: "bg-blue-50 text-blue-700 border-blue-300",
  ceka_na_uhradu: "bg-orange-50 text-orange-700 border-orange-300",
  zaplaceny: "bg-green-50 text-green-700 border-green-300",
  chybi_doklad: "bg-red-50 text-red-700 border-red-300",
  predany_ucetni: "bg-slate-100 text-slate-500 border-slate-300",
};

export const docTypeLabels: Record<Enums<"document_type">, string> = {
  faktura: "Faktura",
  zalohova_faktura: "Zálohová faktura",
  dobropis: "Dobropis",
  pokladni_doklad: "Pokladní doklad",
  smlouva: "Smlouva",
  ostatni: "Ostatní",
};

export const vatRateLabels: Record<Enums<"vat_rate">, string> = {
  zakladni: "21 %",
  snizena: "12 %",
  druha_snizena: "10 %",
  osvobozeno: "Osvobozeno",
  mimo_dph: "Mimo DPH",
};

export const paymentMethodLabels: Record<Enums<"payment_method">, string> = {
  prevod: "Převod",
  hotovost: "Hotovost",
  karta: "Karta",
  ostatni: "Ostatní",
};

export const directionLabels: Record<Enums<"document_direction">, string> = {
  prijaty: "Přijatý doklad",
  vydany: "Vydaný doklad",
};
