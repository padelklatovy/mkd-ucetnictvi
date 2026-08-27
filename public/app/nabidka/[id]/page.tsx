import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { calcLineTotal, type InvoiceLineItem } from "@/lib/utils/invoice";
import { PrintButton } from "@/components/dokumenty/print-button";
import { ConvertToInvoiceButton } from "@/components/dokumenty/convert-to-invoice-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("quote_number").eq("id", id).single();
  if (!quote) return { title: "Nabídka" };
  return { title: `Nabídka ${quote.quote_number ?? "bez čísla"} - MKD Enterprise` };
}

const statusLabels: Record<string, string> = {
  navrh: "NÁVRH",
  odeslana: "ODESLÁNA ZÁKAZNÍKOVI",
  prijata: "PŘIJATA ZÁKAZNÍKEM",
  zamitnuta: "ZAMÍTNUTA",
  prevedena: "PŘEVEDENA NA FAKTURU",
};

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

  const byRate: Record<string, { base: number; vat: number }> = {};
  items.forEach((it) => {
    const { base, vat } = calcLineTotal(it);
    const key = String(it.vatRatePercent);
    if (!byRate[key]) byRate[key] = { base: 0, vat: 0 };
    byRate[key].base += base;
    byRate[key].vat += vat;
  });

  const placeOfIssue = company.address
    ? company.address.split(",").pop()?.trim().replace(/^\d{3}\s?\d{2}\s+/, "")
    : null;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link href="/nabidky" className="text-sm text-[#1e3a5f] hover:underline">
          ← Zpět na nabídky
        </Link>
        <div className="flex items-center gap-3">
          {quote.status !== "prevedena" ? (
            <Link
              href={`/nabidky/${quote.id}/uprava`}
              className="text-sm text-[#1e3a5f] hover:underline"
            >
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#1e3a5f]">Nabídka {quote.quote_number}</h1>
            <p className="text-sm text-slate-600 mt-1">{statusLabels[quote.status] ?? quote.status}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div>
            <div className="text-xs font-semibold text-slate-600 uppercase mb-1">Dodavatel</div>
            <div className="font-medium text-slate-800">{company.name}</div>
            <div className="text-slate-600 whitespace-pre-line">{company.address}</div>
            <div className="text-slate-600 mt-1">
              IČO {company.ico}
              {company.dic ? ` · DIČ ${company.dic}` : ""}
            </div>
            {company.phone ? <div className="text-slate-600">Tel: {company.phone}</div> : null}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 uppercase mb-1">Zákazník</div>
            <div className="font-medium text-slate-800">{quote.customer_name ?? "—"}</div>
            <div className="text-slate-600 whitespace-pre-line">{quote.customer_address}</div>
            {quote.customer_ico ? (
              <div className="text-slate-600 mt-1">
                IČO {quote.customer_ico}
                {quote.customer_dic ? ` · DIČ ${quote.customer_dic}` : ""}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8 text-sm border-t border-b border-slate-100 py-3">
          {placeOfIssue ? (
            <div>
              <div className="text-xs text-slate-600">Místo vystavení</div>
              <div>{placeOfIssue}</div>
            </div>
          ) : null}
          <div>
            <div className="text-xs text-slate-600">Vystaveno</div>
            <div>{formatDate(quote.issue_date)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Platnost nabídky do</div>
            <div>{formatDate(quote.valid_until)}</div>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-xs text-slate-600 border-b border-slate-200">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 px-2">Popis</th>
              <th className="py-2 px-2 text-right">Množ.</th>
              <th className="py-2 px-2 text-right">Cena/j.</th>
              <th className="py-2 px-2 text-right">Základ</th>
              <th className="py-2 px-2 text-right">DPH %</th>
              <th className="py-2 px-2 text-right">DPH</th>
              <th className="py-2 pl-2 text-right">Celkem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const t = calcLineTotal(it);
              return (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="py-2 pr-2">{idx + 1}</td>
                  <td className="py-2 px-2">{it.description || "—"}</td>
                  <td className="py-2 px-2 text-right">{it.quantity}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(it.unitPrice)}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(t.base)}</td>
                  <td className="py-2 px-2 text-right">{it.vatRatePercent}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(t.vat)}</td>
                  <td className="py-2 pl-2 text-right">{formatCurrency(t.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-72 text-sm">
            <div className="font-semibold text-slate-700 mb-1">Rekapitulace DPH</div>
            {Object.entries(byRate).map(([rate, v]) => (
              <div key={rate} className="flex justify-between text-slate-600">
                <span>DPH {rate} %</span>
                <span>
                  Zákl. {formatCurrency(v.base)} · DPH {formatCurrency(v.vat)}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 mt-2 pt-2">
              <span>Celkem bez DPH</span>
              <span>{formatCurrency(Number(quote.amount_excl_vat))}</span>
            </div>
            <div className="flex justify-between">
              <span>DPH</span>
              <span>{formatCurrency(Number(quote.vat_amount))}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-[#1e3a5f] mt-1">
              <span>Celkem s DPH</span>
              <span>{formatCurrency(Number(quote.amount_total))}</span>
            </div>
          </div>
        </div>

        {quote.note ? <p className="text-xs text-slate-600 mb-6">{quote.note}</p> : null}

        <div className="text-[11px] text-slate-600 border-t border-slate-100 pt-4">
          Tato nabídka není daňový doklad. {company.name} · IČO {company.ico}
          {company.dic ? ` · DIČ ${company.dic}` : ""}
        </div>
      </div>
    </div>
  );
}
