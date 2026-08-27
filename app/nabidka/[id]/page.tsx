import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { calcLineTotal, type InvoiceLineItem } from "@/lib/utils/invoice";
import { PrintButton } from "@/components/dokumenty/print-button";
import { ConvertToInvoiceButton } from "@/components/dokumenty/convert-to-invoice-button";

export const dynamic = "force-dynamic";

const GREEN_DARK = "#1e3a2f";
const GREEN_MID = "#2f5744";
const GREEN_BG = "#eef4f0";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("quote_number").eq("id", id).single();
  if (!quote) return { title: "Nabídka" };
  return { title: `Nabídka ${quote.quote_number ?? "bez čísla"} - PADELUN` };
}

const statusLabels: Record<string, string> = {
  navrh: "NÁVRH",
  odeslana: "ODESLÁNA ZÁKAZNÍKOVI",
  prijata: "PŘIJATA ZÁKAZNÍKEM",
  zamitnuta: "ZAMÍTNUTA",
  prevedena: "PŘEVEDENA NA FAKTURU",
};

// Popis polozky muze mit druhy radek jako kurzivou psany podnazev
// (napr. "Padelove rakety ADIDAS MATCH 3.4" / "Pro zacatecniky a mirne pokrocile hrace"),
// oddeleny znakem noveho radku v poli popisu.
function splitDescription(desc: string): { title: string; subtitle: string | null } {
  const idx = desc.indexOf("\n");
  if (idx === -1) return { title: desc, subtitle: null };
  return { title: desc.slice(0, idx), subtitle: desc.slice(idx + 1).trim() || null };
}

export default async function NabidkaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: quote }, { data: lineItems }, { data: company }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", id).single(),
    supabase.from("quote_line_items").select("*").eq("quote_id", id).order("position"),
    supabase.from("companies").select("*").limit(1).maybeSingle(),
  ]);

  if (!quote || !company) notFound();

  const items: InvoiceLineItem[] = (lineItems ?? []).map((it) => ({
    description: it.description,
    quantity: Number(it.quantity),
    unit: it.unit,
    unitPrice: Number(it.unit_price),
    vatRatePercent: Number(it.vat_rate_percent),
  }));

  const hasTerms =
    quote.valid_until || quote.delivery_time || quote.delivery_terms || quote.payment_terms;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link href="/nabidky" className="text-sm text-[#1e3a2f] hover:underline">
          ← Zpět na nabídky
        </Link>
        <div className="flex items-center gap-3">
          {quote.status !== "prevedena" ? (
            <Link href={`/nabidky/${quote.id}/uprava`} className="text-sm text-[#1e3a2f] hover:underline">
              Upravit nabídku
            </Link>
          ) : null}
          <PrintButton />
        </div>
      </div>

      {quote.status === "prevedena" && quote.converted_to_document_id ? (
        <div className="max-w-3xl mx-auto mb-4 rounded-md border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700 print:hidden">
          Tahle nabídka už byla převedena na fakturu.{" "}
          <Link href={`/faktura/${quote.converted_to_document_id}`} target="_blank" className="underline font-medium">
            Zobrazit fakturu →
          </Link>
        </div>
      ) : quote.status === "prijata" || quote.status === "navrh" || quote.status === "odeslana" ? (
        <div className="max-w-3xl mx-auto mb-4 flex justify-end print:hidden">
          <ConvertToInvoiceButton quoteId={quote.id} />
        </div>
      ) : null}

      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm print:shadow-none print:rounded-none p-10">
        {/* HLAVICKA - PADELUN branding */}
        <div className="flex justify-between items-baseline mb-3">
          <div className="text-2xl font-bold tracking-tight" style={{ color: GREEN_DARK }}>
            PADELUN
          </div>
          <div className="text-xs italic" style={{ color: GREEN_MID }}>
            Materiál &amp; technologie pro padel
          </div>
        </div>
        <div className="h-px mb-6" style={{ backgroundColor: GREEN_MID }} />

        {/* TMAVY PRUH S NAZVEM */}
        <div className="rounded-md px-6 py-5 mb-6" style={{ backgroundColor: GREEN_DARK }}>
          <h1 className="text-2xl font-bold text-white">Cenová nabídka {quote.quote_number}</h1>
          {quote.customer_name ? (
            <p className="text-sm text-white/80 mt-1">
              Materiál a vybavení pro padelový kurt — {quote.customer_name}
            </p>
          ) : null}
          <p className="text-xs text-white/60 mt-2">{statusLabels[quote.status] ?? quote.status}</p>
        </div>

        <div className="flex justify-between text-sm mb-6">
          <div>
            <span className="font-semibold text-slate-700">Odběratel: </span>
            <span className="text-slate-700">{quote.customer_name ?? "—"}</span>
            {quote.customer_ico ? (
              <span className="text-slate-500">
                {" "}
                · IČO {quote.customer_ico}
                {quote.customer_dic ? ` · DIČ ${quote.customer_dic}` : ""}
              </span>
            ) : null}
            {quote.customer_address ? (
              <div className="text-slate-500 whitespace-pre-line mt-0.5">{quote.customer_address}</div>
            ) : null}
          </div>
          <div className="text-right shrink-0 ml-4">
            <span className="font-semibold text-slate-700">Datum nabídky: </span>
            <span className="text-slate-700">{formatDate(quote.issue_date)}</span>
          </div>
        </div>

        {/* TABULKA POLOZEK */}
        <table className="w-full text-sm mb-4 border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr style={{ backgroundColor: GREEN_DARK }}>
              <th className="py-2 pl-3 pr-2 text-left text-xs font-semibold text-white rounded-l-md">Č.</th>
              <th className="py-2 px-2 text-left text-xs font-semibold text-white">Položka</th>
              <th className="py-2 px-2 text-right text-xs font-semibold text-white">Množství</th>
              <th className="py-2 px-2 text-right text-xs font-semibold text-white">
                Jedn. cena bez DPH
              </th>
              <th className="py-2 pr-3 pl-2 text-right text-xs font-semibold text-white rounded-r-md">
                Celkem bez DPH
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const t = calcLineTotal(it);
              const { title, subtitle } = splitDescription(it.description);
              return (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-2.5 pl-3 pr-2 text-slate-500 align-top">{idx + 1}</td>
                  <td className="py-2.5 px-2 align-top">
                    <div className="font-medium text-slate-800">{title || "—"}</div>
                    {subtitle ? <div className="text-xs italic text-slate-500">{subtitle}</div> : null}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-700 align-top">
                    {it.quantity} {it.unit}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-700 align-top">
                    {formatCurrency(it.unitPrice)}
                  </td>
                  <td className="py-2.5 pr-3 pl-2 text-right font-medium text-slate-800 align-top">
                    {formatCurrency(t.base)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* SOUHRN */}
        <div className="flex justify-end mb-8">
          <div className="w-72 text-sm rounded-md overflow-hidden">
            <div className="flex justify-between px-4 py-1.5" style={{ backgroundColor: GREEN_BG }}>
              <span className="text-slate-600">Celkem bez DPH</span>
              <span className="text-slate-800">{formatCurrency(Number(quote.amount_excl_vat))}</span>
            </div>
            <div className="flex justify-between px-4 py-1.5" style={{ backgroundColor: GREEN_BG }}>
              <span className="text-slate-600">
                DPH {quote.vat_rate === "snizena" ? "12" : quote.vat_rate === "zakladni" ? "21" : ""} %
              </span>
              <span className="text-slate-800">{formatCurrency(Number(quote.vat_amount))}</span>
            </div>
            <div
              className="flex justify-between px-4 py-2 font-semibold"
              style={{ backgroundColor: GREEN_BG, color: GREEN_DARK }}
            >
              <span>Celkem s DPH</span>
              <span>{formatCurrency(Number(quote.amount_total))}</span>
            </div>
          </div>
        </div>

        {/* PODMINKY NABIDKY */}
        {hasTerms ? (
          <div
            className="rounded-md mb-6 pl-4 pr-5 py-4"
            style={{ backgroundColor: GREEN_BG, borderLeft: `4px solid ${GREEN_MID}` }}
          >
            <div className="font-semibold text-sm mb-1.5" style={{ color: GREEN_DARK }}>
              Podmínky nabídky
            </div>
            <div className="text-sm text-slate-600 space-y-0.5">
              {quote.valid_until ? <div>Platnost nabídky: {formatDate(quote.valid_until)}</div> : null}
              {quote.delivery_time ? <div>Dodací lhůta: {quote.delivery_time}</div> : null}
              {quote.delivery_terms ? <div>Doprava: {quote.delivery_terms}</div> : null}
              {quote.payment_terms ? <div>Platební podmínky: {quote.payment_terms}</div> : null}
            </div>
          </div>
        ) : null}

        {quote.note ? (
          <p className="text-sm text-slate-600 mb-6 whitespace-pre-line">{quote.note}</p>
        ) : (
          <p className="text-sm text-slate-600 mb-6">
            Děkujeme za poptávku a přejeme hodně úspěchů s novým padelovým kurtem. V případě zájmu
            jsme připraveni doplnit i další vybavení nebo rozšířit váš areál o další kurty.
          </p>
        )}

        <div className="text-sm text-slate-700 mb-8">
          <div>S pozdravem,</div>
          <div className="font-semibold mt-2">Dr. Ing. Karel Luňáček</div>
          <div style={{ color: GREEN_MID }}>PADELUN</div>
          <div className="text-slate-500">info@padelun.cz</div>
        </div>

        <div className="h-px mb-3" style={{ backgroundColor: GREEN_MID }} />
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>
            {company.name} — PADELUN Consulting{company.dic ? ` | DIČ: ${company.dic}` : ""}
          </span>
          <span>Strana 1 / 1</span>
        </div>
      </div>
    </div>
  );
}
