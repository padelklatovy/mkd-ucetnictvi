import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { QuoteForm } from "@/components/dokumenty/quote-form";

export const dynamic = "force-dynamic";

export default async function UpravaNabidkyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: quote }, { data: lineItems }, { data: partners }, { data: descItems }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", id).single(),
    supabase.from("quote_line_items").select("*").eq("quote_id", id).order("position"),
    supabase.from("business_partners").select("*").eq("company_id", DEFAULT_COMPANY_ID).order("name"),
    supabase
      .from("quote_line_items")
      .select("description")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (!quote) notFound();

  const descriptionSuggestions = Array.from(
    new Set((descItems ?? []).map((i) => i.description).filter((d) => d && d.trim()))
  ).slice(0, 30);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Úprava nabídky {quote.quote_number}</h1>
      <QuoteForm
        quote={quote}
        existingItems={lineItems ?? []}
        suggestedNumber={quote.quote_number ?? ""}
        existingPartners={partners ?? []}
        descriptionSuggestions={descriptionSuggestions}
      />
    </div>
  );
}
