import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { calcLineTotal, generateSpdPayload, type InvoiceLineItem } from "@/lib/utils/invoice";
import { PrintButton } from "@/components/dokumenty/print-button";

export const dynamic = "force-dynamic";

export default async function FakturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: document }, { data: lineItems }, { data: company }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase.from("document_line_items").select("*").eq("document_id", id).order("position"),
    supabase.from("companies").select("*").limit(1).maybeSingle(),
  ]);

  if (!document || !company) notFound();

  const items: InvoiceLineItem[] = (lineItems ?? []).map((it) => ({
    description: it.description,
    quantity: Number(it.quantity),
    unit: it.unit,
    unitPrice: Number(it.unit_price),
    vatRatePercent: Number(it.vat_rate_percent),
  }));

  let qrDataUrl: string | null = null;
  if (document.payment_iban && document.variable_symbol) {
    const spd = generateSpdPayload(
      document.payment_iban,
      Number(document.amount_total),
      document.variable_symbol,
      `Faktura ${document.document_number}`
    );
    try {
      qrDataUrl = await QRCode.toDataURL(spd, { width: 140, margin: 1 });
    } catch {
      qrDataUrl = null;
    }
  }

  const byRate: Record<string, { base: number; vat: number }> = {};
  items.forEach((it) => {
    const { base, vat } = calcLineTotal(it);
    const key = String(it.vatRatePercent);
    if (!byRate[key]) byRate[key] = { base: 0, vat: 0 };
    byRate[key].base += base;
    byRate[key].vat += vat;
  });

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link href={`/vydane-doklady/${document.id}`} className="text-sm text-[#1e3a5f] hover:underline">
          ← Zpět na doklad
        </Link>
        <div className="flex items-center gap-3">
          {document.doc_type === "faktura" ? (
            <Link
              href={`/vydane-doklady/${document.id}/uprava-faktury`}
              className="text-sm text-[#1e3a5f] hover:underline"
            >
              Upravit fakturu
            </Link>
          ) : null}
          <PrintButton />
        </div>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm print:shadow-none print:rounded-none p-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#1e3a5f]">Faktura {document.document_number}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {document.status === "zaplaceny" ? "UHRAZENO" : "NEUHRAZENO"}
            </p>
          </div>
          {qrDataUrl ? (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR platba" width={110} height={110} />
              <div className="text-[10px] text-slate-400 mt-1">Zaplatit QR kódem</div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Dodavatel</div>
            <div className="font-medium text-slate-800">{company.name}</div>
            <div className="text-slate-600 whitespace-pre-line">{company.address}</div>
            <div className="text-slate-600 mt-1">
              IČO {company.ico}
              {company.dic ? ` · DIČ ${company.dic}` : ""}
            </div>
            {company.phone ? <div className="text-slate-600">Tel: {company.phone}</div> : null}
            {document.payment_bank_account ? (
              <div className="text-slate-600 mt-1">Účet: {document.payment_bank_account}</div>
            ) : null}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Odběratel</div>
            <div className="font-medium text-slate-800">{document.customer_name ?? "—"}</div>
            <div className="text-slate-600 whitespace-pre-line">{document.customer_address}</div>
            {document.partner_ico ? (
              <div className="text-slate-600 mt-1">
                IČO {document.partner_ico}
                {document.partner_dic ? ` · DIČ ${document.partner_dic}` : ""}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8 text-sm border-t border-b border-slate-100 py-3">
          <div>
            <div className="text-xs text-slate-400">Vystaveno</div>
            <div>{formatDate(document.issue_date)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">DUZP</div>
            <div>{formatDate(document.taxable_supply_date)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Splatnost</div>
            <div>{formatDate(document.due_date)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Variabilní symbol</div>
            <div>{document.variable_symbol ?? "—"}</div>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
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
              <span>{formatCurrency(Number(document.amount_excl_vat))}</span>
            </div>
            <div className="flex justify-between">
              <span>DPH</span>
              <span>{formatCurrency(Number(document.vat_amount))}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-[#1e3a5f] mt-1">
              <span>Celkem s DPH</span>
              <span>{formatCurrency(Number(document.amount_total))}</span>
            </div>
          </div>
        </div>

        {document.note ? <p className="text-xs text-slate-500 mb-6">{document.note}</p> : null}

        <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-4">
          {company.regnote || `${company.name} · IČO ${company.ico} · DIČ ${company.dic ?? ""}`}
        </div>
      </div>
    </div>
  );
}
