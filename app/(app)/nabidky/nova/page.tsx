import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { QuoteForm } from "@/components/dokumenty/quote-form";

export const dynamic = "force-dynamic";

function suggestedNumberPreview(nextSeq: number) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `NAB-${nextSeq}/${month}/${now.getFullYear()}`;
}

export default async function NovaNabidkaPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string }>;
}) {
  const { partner } = await searchParams;
  const supabase = await createClient();

  const [{ data: existingNumbers }, { data: partners }, { data: lineItems }] = await Promise.all([
    supabase
      .from("quotes")
      .select("quote_number")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .like("quote_number", `NAB-%/${new Date().getFullYear()}`),
    supabase.from("business_partners").select("*").eq("company_id", DEFAULT_COMPANY_ID).order("name"),
    supabase
      .from("quote_line_items")
      .select("description")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // vezmeme napovidane popisy i z fakturacnich polozek, at je napoveda spolecna
  const { data: invoiceLineItems } = await supabase
    .from("document_line_items")
    .select("description")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .order("created_at", { ascending: false })
    .limit(200);

  let max = 0;
  (existingNumbers ?? []).forEach((row) => {
    const m = row.quote_number?.match(/^NAB-(\d+)\//);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  const descriptionSuggestions = Array.from(
    new Set(
      [...(lineItems ?? []), ...(invoiceLineItems ?? [])]
        .map((i) => i.description)
        .filter((d) => d && d.trim())
    )
  ).slice(0, 30);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Nová nabídka</h1>
      <QuoteForm
        suggestedNumber={suggestedNumberPreview(max + 1)}
        existingPartners={partners ?? []}
        descriptionSuggestions={descriptionSuggestions}
        preselectedPartnerId={partner}
      />
    </div>
  );
}
