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

async function nextQuoteNumber(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const { data } = await supabase
    .from("quotes")
    .select("quote_number")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .like("quote_number", `NAB-%/${year}`);

  let max = 0;
  (data ?? []).forEach((row) => {
    const m = row.quote_number?.match(/^NAB-(\d+)\//);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  return `NAB-${max + 1}/${month}/${year}`;
}

export async function saveQuote(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim() || null;
  const itemsRaw = String(formData.get("items") ?? "[]");
  const items: InvoiceLineItem[] = JSON.parse(itemsRaw);

  const totals = calcInvoiceTotals(items);
  const rate = dominantVatRate(items);

  let quoteNumber = String(formData.get("quote_number") ?? "");
  if (!id && !quoteNumber) {
    quoteNumber = await nextQuoteNumber(supabase);
  }

  const customerName = String(formData.get("customer_name") ?? "") || null;
  const customerAddress = String(formData.get("customer_address") ?? "") || null;
  const customerIco = String(formData.get("customer_ico") ?? "") || null;
  const customerDic = String(formData.get("customer_dic") ?? "") || null;

  // Stejny automaticky-uloz-odberatele mechanismus jako u faktur.
  let partnerId: string | null = null;
  if (customerName && customerIco) {
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

  const payload = {
    company_id: DEFAULT_COMPANY_ID,
    quote_number: quoteNumber,
    partner_id: partnerId,
    customer_name: customerName,
    customer_address: customerAddress,
    customer_ico: customerIco,
    customer_dic: customerDic,
    issue_date: String(formData.get("issue_date") ?? "") || null,
    valid_until: String(formData.get("valid_until") ?? "") || null,
    delivery_time: String(formData.get("delivery_time") ?? "") || null,
    delivery_terms: String(formData.get("delivery_terms") ?? "") || null,
    payment_terms: String(formData.get("payment_terms") ?? "") || null,
    amount_excl_vat: totals.base,
    vat_amount: totals.vat,
    amount_total: totals.total,
    vat_rate: vatPercentToEnum(rate),
    status: (String(formData.get("status") ?? "navrh") as
      | "navrh"
      | "odeslana"
      | "prijata"
      | "zamitnuta"),
    note: String(formData.get("note") ?? "") || null,
  };

  let quoteId = id;

  if (id) {
    const { error } = await supabase.from("quotes").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await supabase.from("quote_line_items").delete().eq("quote_id", id);
  } else {
    const { data, error } = await supabase.from("quotes").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    quoteId = data.id;
  }

  if (quoteId && items.length > 0) {
    const rows = items.map((it, idx) => ({
      company_id: DEFAULT_COMPANY_ID,
      quote_id: quoteId!,
      position: idx,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unitPrice,
      vat_rate_percent: it.vatRatePercent,
    }));
    const { error } = await supabase.from("quote_line_items").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/nabidky");
  redirect(`/nabidka/${quoteId}`);
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

// Prevede nabidku na fakturu - zkopiruje vsechny polozky beze zmeny, nemusite
// nic prepisovat. Nabidka zustava zachovana, jen se oznaci jako "prevedena"
// a propoji se s nove vytvorenou fakturou.
export async function convertQuoteToInvoice(quoteId: string): Promise<void> {
  const supabase = await createClient();

  const [{ data: quote }, { data: items }, { data: bankAccounts }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", quoteId).single(),
    supabase.from("quote_line_items").select("*").eq("quote_id", quoteId).order("position"),
    supabase
      .from("bank_accounts")
      .select("*")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .eq("is_active", true)
      .order("name")
      .limit(1),
  ]);

  if (!quote) throw new Error("Nabídka nenalezena.");

  const documentNumber = await nextInvoiceNumber(supabase);
  const account = bankAccounts?.[0];
  const todayIso = new Date().toISOString().slice(0, 10);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const { data: newDoc, error } = await supabase
    .from("documents")
    .insert({
      company_id: DEFAULT_COMPANY_ID,
      direction: "vydany",
      doc_type: "faktura",
      document_number: documentNumber,
      partner_id: quote.partner_id,
      customer_name: quote.customer_name,
      customer_address: quote.customer_address,
      partner_ico: quote.customer_ico,
      partner_dic: quote.customer_dic,
      issue_date: todayIso,
      taxable_supply_date: todayIso,
      due_date: dueDate.toISOString().slice(0, 10),
      amount_excl_vat: quote.amount_excl_vat,
      vat_amount: quote.vat_amount,
      amount_total: quote.amount_total,
      vat_rate: quote.vat_rate ?? "zakladni",
      currency: "CZK",
      variable_symbol: documentNumber.replace(/\D/g, ""),
      payment_method: "prevod",
      payment_bank_account: account ? `${account.name} ${account.account_number}` : null,
      payment_iban: account?.iban ?? null,
      status: "ceka_na_uhradu",
      note: null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (items && items.length > 0) {
    const rows = items.map((it) => ({
      company_id: DEFAULT_COMPANY_ID,
      document_id: newDoc.id,
      position: it.position,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      vat_rate_percent: it.vat_rate_percent,
    }));
    await supabase.from("document_line_items").insert(rows);
  }

  await supabase
    .from("quotes")
    .update({ status: "prevedena", converted_to_document_id: newDoc.id })
    .eq("id", quoteId);

  revalidatePath("/nabidky");
  revalidatePath("/vydane-doklady");
  redirect(`/faktura/${newDoc.id}`);
}

export async function deleteQuote(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").update({ is_archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/nabidky");
}
