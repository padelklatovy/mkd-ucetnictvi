"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import type { Enums, TablesInsert } from "@/lib/types/database.types";

function num(v: FormDataEntryValue | null): number {
  if (!v) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function str(v: FormDataEntryValue | null): string | null {
  const s = v ? String(v).trim() : "";
  return s.length ? s : null;
}

export async function saveDocument(formData: FormData) {
  const supabase = await createClient();

  const id = str(formData.get("id"));
  const direction = String(formData.get("direction")) as Enums<"document_direction">;

  const amountExclVat = num(formData.get("amount_excl_vat"));
  const vatAmount = num(formData.get("vat_amount"));

  const payload: TablesInsert<"documents"> = {
    company_id: DEFAULT_COMPANY_ID,
    direction,
    doc_type: (str(formData.get("doc_type")) as Enums<"document_type">) ?? "faktura",
    document_number: str(formData.get("document_number")),
    partner_id: str(formData.get("partner_id")),
    partner_ico: str(formData.get("partner_ico")),
    partner_dic: str(formData.get("partner_dic")),
    issue_date: str(formData.get("issue_date")),
    taxable_supply_date: str(formData.get("taxable_supply_date")),
    due_date: str(formData.get("due_date")),
    paid_date: str(formData.get("paid_date")),
    amount_excl_vat: amountExclVat,
    vat_rate: (str(formData.get("vat_rate")) as Enums<"vat_rate">) ?? "zakladni",
    vat_amount: vatAmount,
    amount_total: amountExclVat + vatAmount,
    currency: str(formData.get("currency")) ?? "CZK",
    variable_symbol: str(formData.get("variable_symbol")),
    payment_method: (str(formData.get("payment_method")) as Enums<"payment_method">) ?? "prevod",
    category_id: str(formData.get("category_id")),
    project_id: str(formData.get("project_id")),
    note: str(formData.get("note")),
    status: (str(formData.get("status")) as Enums<"document_status">) ?? "novy",
  };

  if (id) {
    const { error } = await supabase.from("documents").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("documents").insert(payload);
    if (error) throw new Error(error.message);
  }

  const listPath = direction === "prijaty" ? "/prijate-doklady" : "/vydane-doklady";
  revalidatePath(listPath);
  redirect(listPath);
}

export async function archiveDocument(id: string, direction: Enums<"document_direction">) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ is_archived: true })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const listPath = direction === "prijaty" ? "/prijate-doklady" : "/vydane-doklady";
  revalidatePath(listPath);
}
