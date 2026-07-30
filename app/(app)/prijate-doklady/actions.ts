"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import type { Enums, TablesInsert } from "@/lib/types/database.types";
import {
  extractDocumentDataFromFile,
  type ExtractedDocumentData,
} from "@/lib/ai/extract-document";

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

export async function uploadDocumentFile(formData: FormData) {
  const supabase = await createClient();

  const documentId = String(formData.get("document_id"));
  const direction = String(formData.get("direction")) as Enums<"document_direction">;
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    throw new Error("Nebyl vybrán žádný soubor.");
  }

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Povolené formáty jsou pouze PDF, JPG a PNG.");
  }
  const maxSizeBytes = 15 * 1024 * 1024; // 15 MB
  if (file.size > maxSizeBytes) {
    throw new Error("Soubor je příliš velký (max. 15 MB).");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${DEFAULT_COMPANY_ID}/${documentId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("doklady")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { error: dbError } = await supabase.from("document_files").insert({
    document_id: documentId,
    company_id: DEFAULT_COMPANY_ID,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: user?.id ?? null,
  });
  if (dbError) {
    await supabase.storage.from("doklady").remove([storagePath]);
    throw new Error(dbError.message);
  }

  const detailPath =
    direction === "prijaty" ? `/prijate-doklady/${documentId}` : `/vydane-doklady/${documentId}`;
  revalidatePath(detailPath);
}

export async function deleteDocumentFile(
  fileId: string,
  storagePath: string,
  documentId: string,
  direction: Enums<"document_direction">
) {
  const supabase = await createClient();

  const { error: storageError } = await supabase.storage.from("doklady").remove([storagePath]);
  if (storageError) throw new Error(storageError.message);

  const { error: dbError } = await supabase.from("document_files").delete().eq("id", fileId);
  if (dbError) throw new Error(dbError.message);

  const detailPath =
    direction === "prijaty" ? `/prijate-doklady/${documentId}` : `/vydane-doklady/${documentId}`;
  revalidatePath(detailPath);
}

export async function getSignedFileUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("doklady")
    .createSignedUrl(storagePath, 60 * 5); // 5 minut
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function extractDocumentFields(fileId: string): Promise<ExtractedDocumentData> {
  const supabase = await createClient();

  const { data: file, error: fileError } = await supabase
    .from("document_files")
    .select("storage_path,mime_type")
    .eq("id", fileId)
    .single();
  if (fileError || !file) throw new Error("Příloha nebyla nalezena.");

  const { data: blob, error: downloadError } = await supabase.storage
    .from("doklady")
    .download(file.storage_path);
  if (downloadError || !blob) throw new Error("Soubor se nepodařilo stáhnout ze Storage.");

  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = file.mime_type ?? "application/pdf";

  return extractDocumentDataFromFile(base64, mimeType);
}

export type QuickImportResult = {
  fileName: string;
  success: boolean;
  documentId?: string;
  documentNumber?: string | null;
  partnerName?: string | null;
  amountTotal?: number | null;
  needsAttention: boolean;
  error?: string;
};

// Hromadny import: pro kazdy soubor rovnou vytvori doklad, nahraje prilohu,
// posle na AI vytezeni a ulozi vysledek. Zadne rucni vyplnovani formulare.
// Doklad vzdy skonci ve stavu "ke_kontrole" (nebo "chybi_doklad" pri chybe),
// aby si ho uzivatel mohl v klidu proletet v seznamu - nic se "tise" neschova.
export async function quickImportDocument(
  formData: FormData,
  direction: Enums<"document_direction">
): Promise<QuickImportResult> {
  const supabase = await createClient();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { fileName: "?", success: false, needsAttention: true, error: "Prázdný soubor." };
  }

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    return {
      fileName: file.name,
      success: false,
      needsAttention: true,
      error: "Nepodporovaný formát (jen PDF, JPG, PNG).",
    };
  }
  const maxSizeBytes = 15 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      fileName: file.name,
      success: false,
      needsAttention: true,
      error: "Soubor je příliš velký (max. 15 MB).",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. zalozit prazdny doklad, abychom meli ID pro cestu k priloze
  const { data: newDoc, error: createError } = await supabase
    .from("documents")
    .insert({
      company_id: DEFAULT_COMPANY_ID,
      direction,
      doc_type: "ostatni",
      status: "ke_kontrole",
      currency: "CZK",
      vat_rate: "zakladni",
      payment_method: "prevod",
      created_by: user?.id ?? null,
      note: "Vytvořeno hromadným importem, čeká na kontrolu.",
    })
    .select("id")
    .single();

  if (createError || !newDoc) {
    return {
      fileName: file.name,
      success: false,
      needsAttention: true,
      error: `Nepodařilo se založit doklad: ${createError?.message}`,
    };
  }

  const documentId = newDoc.id;

  // 2. nahrat prilohu
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${DEFAULT_COMPANY_ID}/${documentId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("doklady")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    await supabase
      .from("documents")
      .update({ note: `Import: nahrání souboru selhalo (${uploadError.message})` })
      .eq("id", documentId);
    return {
      fileName: file.name,
      success: false,
      documentId,
      needsAttention: true,
      error: `Nahrání selhalo: ${uploadError.message}`,
    };
  }

  await supabase.from("document_files").insert({
    document_id: documentId,
    company_id: DEFAULT_COMPANY_ID,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: user?.id ?? null,
  });

  // 3. poslat na AI vytezeni a rovnou ulozit vysledek
  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const extracted = await extractDocumentDataFromFile(base64, file.type);

    // zkusit dohledat existujiciho partnera podle ICO
    let partnerId: string | null = null;
    if (extracted.partner_ico) {
      const { data: partnerMatch } = await supabase
        .from("business_partners")
        .select("id")
        .eq("company_id", DEFAULT_COMPANY_ID)
        .eq("ico", extracted.partner_ico)
        .maybeSingle();
      partnerId = partnerMatch?.id ?? null;
    }

    const amountExclVat = extracted.amount_excl_vat ?? 0;
    const vatAmount = extracted.vat_amount ?? 0;
    const amountTotal = extracted.amount_total ?? amountExclVat + vatAmount;

    const missingCoreData = !amountTotal || amountTotal === 0;

    const noteParts = ["Vytvořeno hromadným importem a vytěženo AI - zkontrolujte prosím."];
    if (extracted.partner_name) noteParts.push(`Dodavatel dle AI: ${extracted.partner_name}.`);
    if (extracted.note) noteParts.push(`Poznámka AI: ${extracted.note}`);

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        document_number: extracted.document_number,
        partner_id: partnerId,
        partner_ico: extracted.partner_ico,
        partner_dic: extracted.partner_dic,
        issue_date: extracted.issue_date,
        taxable_supply_date: extracted.taxable_supply_date,
        due_date: extracted.due_date,
        variable_symbol: extracted.variable_symbol,
        currency: extracted.currency ?? "CZK",
        amount_excl_vat: amountExclVat,
        vat_amount: vatAmount,
        amount_total: amountTotal,
        vat_rate: extracted.vat_rate_suggested ?? "zakladni",
        status: missingCoreData ? "chybi_doklad" : "ke_kontrole",
        note: noteParts.join(" "),
      })
      .eq("id", documentId);

    if (updateError) throw new Error(updateError.message);

    return {
      fileName: file.name,
      success: true,
      documentId,
      documentNumber: extracted.document_number,
      partnerName: extracted.partner_name,
      amountTotal,
      needsAttention: missingCoreData,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Vytěžení selhalo.";
    await supabase
      .from("documents")
      .update({
        status: "chybi_doklad",
        note: `Import: AI vytěžení selhalo (${message}). Přiložený soubor je uložen, doplňte údaje ručně.`,
      })
      .eq("id", documentId);

    return {
      fileName: file.name,
      success: false,
      documentId,
      needsAttention: true,
      error: message,
    };
  } finally {
    revalidatePath(direction === "prijaty" ? "/prijate-doklady" : "/vydane-doklady");
  }
}
