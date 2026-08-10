import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { InvoiceForm } from "@/components/dokumenty/invoice-form";

export const dynamic = "force-dynamic";

function currentInvoiceNumberPreview(nextSeq: number) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${nextSeq}/${month}/${now.getFullYear()}`;
}

export default async function NovaFakturaPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string }>;
}) {
  const { partner } = await searchParams;
  const supabase = await createClient();

  const [{ data: bankAccounts }, { data: existingNumbers }, { data: partners }, { data: lineItems }] =
    await Promise.all([
      supabase
        .from("bank_accounts")
        .select("*")
        .eq("company_id", DEFAULT_COMPANY_ID)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("documents")
        .select("document_number")
        .eq("company_id", DEFAULT_COMPANY_ID)
        .eq("direction", "vydany")
        .eq("doc_type", "faktura")
        .like("document_number", `%/${new Date().getFullYear()}`),
      supabase
        .from("business_partners")
        .select("*")
        .eq("company_id", DEFAULT_COMPANY_ID)
        .order("name"),
      supabase
        .from("document_line_items")
        .select("description")
        .eq("company_id", DEFAULT_COMPANY_ID)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  let max = 0;
  (existingNumbers ?? []).forEach((row) => {
    const m = row.document_number?.match(/^(\d+)\//);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  const descriptionSuggestions = Array.from(
    new Set((lineItems ?? []).map((i) => i.description).filter((d) => d && d.trim()))
  ).slice(0, 30);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Nová faktura</h1>
      <InvoiceForm
        bankAccounts={bankAccounts ?? []}
        suggestedNumber={currentInvoiceNumberPreview(max + 1)}
        existingPartners={partners ?? []}
        descriptionSuggestions={descriptionSuggestions}
        preselectedPartnerId={partner}
      />
    </div>
  );
}
