import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { InvoiceForm } from "@/components/dokumenty/invoice-form";

export const dynamic = "force-dynamic";

export default async function UpravaFakturyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: document }, { data: lineItems }, { data: bankAccounts }, { data: partners }, { data: allDescriptions }] =
    await Promise.all([
      supabase.from("documents").select("*").eq("id", id).single(),
      supabase.from("document_line_items").select("*").eq("document_id", id).order("position"),
      supabase
        .from("bank_accounts")
        .select("*")
        .eq("company_id", DEFAULT_COMPANY_ID)
        .eq("is_active", true)
        .order("name"),
      supabase.from("business_partners").select("*").eq("company_id", DEFAULT_COMPANY_ID).order("name"),
      supabase
        .from("document_line_items")
        .select("description")
        .eq("company_id", DEFAULT_COMPANY_ID)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  if (!document) notFound();

  const descriptionSuggestions = Array.from(
    new Set((allDescriptions ?? []).map((i) => i.description).filter((d) => d && d.trim()))
  ).slice(0, 30);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">
        Úprava faktury {document.document_number}
      </h1>
      <InvoiceForm
        document={document}
        existingItems={lineItems ?? []}
        bankAccounts={bankAccounts ?? []}
        suggestedNumber={document.document_number ?? ""}
        existingPartners={partners ?? []}
        descriptionSuggestions={descriptionSuggestions}
      />
    </div>
  );
}
