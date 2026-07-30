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
