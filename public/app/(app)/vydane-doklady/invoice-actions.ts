"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import {
  calcInvoiceTotals,
  dominantVatRate,
  vatPercentToEnum,
  type InvoiceLineItem,
} from "@/lib/utils/invoice";

export type AresResult = {
  name?: string;
  address?: string;
  dic?: string;
  error?: string;
};

export async function lookupAres(icoRaw: string): Promise<AresResult> {
  const ico = icoRaw.replace(/\s/g, "");
  if (!/^\d{8}$/.test(ico)) {
    return { error: "Zadejte platné 8místné IČO." };
  }

  try {
    const res = await fetch(
      `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`
    );
    if (!res.ok) {
      return { error: "Subjekt s tímto IČO nebyl v ARES nalezen." };
    }
    const data = await res.json();
    const name: string = data.obchodniJmeno || "";
    const s = data.sidlo || {};
    const street = [s.nazevUlice || s.nazevCastiObce, [s.cisloDomovni, s.cisloOrientacni].filter(Boolean).join("/")]
      .filter(Boolean)
      .join(" ");
    const cityLine = [s.psc, s.nazevObce].filter(Boolean).join(" ");
    const address = [street, cityLine].filter(Boolean).join("\n");
    const dic: string = data.dic ? (String(data.dic).startsWith("CZ") ? data.dic : "CZ" + data.dic) : "";

    return { name, address, dic };
  } catch {
    return { error: "Nepodařilo se načíst z ARES – zadejte údaje ručně." };
  }
}

async function nextInvoiceNumber(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const { data } = await supabase
    .from("documents")
    .select("document_number")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .eq("direction", "vydany")
    .eq("doc_type", "faktura")
    .like("document_number", `%/${year}`);

  let max = 0;
  (data ?? []).forEach((row) => {
    const m = row.document_number?.match(/^(\d+)\//);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  return `${max + 1}/${month}/${year}`;
}

export async function saveInvoice(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim() || null;
  const itemsRaw = String(formData.get("items") ?? "[]");
  const items: InvoiceLineItem[] = JSON.parse(itemsRaw);

  const totals = calcInvoiceTotals(items);
  const rate = dominantVatRate(items);

  const bankAccount = String(formData.get("bank_account_label") ?? "") || null;
  const bankIban = String(formData.get("bank_iban") ?? "") || null;

  const status = String(formData.get("paid")) === "true" ? "zaplaceny" : "ceka_na_uhradu";
  const paidDate = status === "zaplaceny" ? new Date().toISOString().slice(0, 10) : null;

  let documentNumber = String(formData.get("document_number") ?? "");
  if (!id && !documentNumber) {
    documentNumber = await nextInvoiceNumber(supabase);
  }

  const customerName = String(formData.get("customer_name") ?? "") || null;
  const customerAddress = String(formData.get("customer_address") ?? "") || null;
  const customerIco = String(formData.get("customer_ico") ?? "") || null;
  const customerDic = String(formData.get("customer_dic") ?? "") || null;

  // Odberatele ukladame/aktualizujeme do databaze partneru, aby slo priste
  // vybrat ze seznamu misto opakovaneho vyplnovani/hledani v ARES.
  let partnerId: string | null = null;
  if (customerName) {
    if (customerIco) {
      const { data: existing } = await supabase
        .from("business_partners")
        .select("id")
        .eq("company_id", DEFAULT_COMPANY_ID)
        .eq("ico", customerIco)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("business_partners")
          .update({ name: customerName, address: customerAddress, dic: customerDic })
          .eq("id", existing.id);
        partnerId = existing.id;
      } else {
        const { data: created } = await supabase
          .from("business_partners")
          .insert({
            company_id: DEFAULT_COMPANY_ID,
            name: customerName,
            address: customerAddress,
            ico: customerIco,
            dic: customerDic,
          })
          .select("id")
          .single();
        partnerId = created?.id ?? null;
      }
    }
  }

  const payload = {
    company_id: DEFAULT_COMPANY_ID,
    direction: "vydany" as const,
    doc_type: "faktura" as const,
    document_number: documentNumber,
    partner_id: partnerId,
    customer_name: customerName,
    customer_address: customerAddress,
    partner_ico: customerIco,
    partner_dic: customerDic,
    issue_date: String(formData.get("issue_date") ?? "") || null,
    taxable_supply_date: String(formData.get("taxable_supply_date") ?? "") || null,
    due_date: String(formData.get("due_date") ?? "") || null,
    paid_date: paidDate,
    amount_excl_vat: totals.base,
    vat_amount: totals.vat,
    amount_total: totals.total,
    vat_rate: vatPercentToEnum(rate),
    currency: "CZK",
    variable_symbol: String(formData.get("variable_symbol") ?? "") || null,
    payment_method: (String(formData.get("payment_method") ?? "prevod") as "prevod" | "hotovost" | "karta" | "ostatni"),
    payment_bank_account: bankAccount,
    payment_iban: bankIban,
    status: status as "zaplaceny" | "ceka_na_uhradu",
    note: String(formData.get("note") ?? "") || null,
  };

  let documentId = id;

  if (id) {
    const { error } = await supabase.from("documents").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await supabase.from("document_line_items").delete().eq("document_id", id);
  } else {
    const { data, error } = await supabase.from("documents").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    documentId = data.id;
  }

  if (documentId && items.length > 0) {
    const rows = items.map((it, idx) => ({
      company_id: DEFAULT_COMPANY_ID,
      document_id: documentId!,
      position: idx,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unitPrice,
      vat_rate_percent: it.vatRatePercent,
    }));
    const { error } = await supabase.from("document_line_items").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/vydane-doklady");
  redirect(`/faktura/${documentId}`);
}
