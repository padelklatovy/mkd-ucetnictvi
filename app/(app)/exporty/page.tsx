import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { MonthSwitcher } from "@/components/dokumenty/month-switcher";

export const dynamic = "force-dynamic";

function monthRange(monthStr: string) {
  // monthStr = "2026-08"
  const [year, month] = monthStr.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthStr: string, delta: number) {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const sourceLabels: Record<string, string> = {
  fio: "Fio – spárováno s rezervací",
  fio_vs406: "Fio – platba na místě (barový QR, VS 406)",
};

export default async function ExportyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const monthStr = month || currentMonthStr();
  const { from, to } = monthRange(monthStr);

  const supabase = await createClient();

  const { data: reservationDocs, error } = await supabase
    .from("documents")
    .select("id,document_number,issue_date,amount_excl_vat,vat_amount,amount_total,revenue_source,variable_symbol,status,note")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .eq("direction", "vydany")
    .eq("is_archived", false)
    .eq("external_source", "padel-kalendar")
    .gte("issue_date", from)
    .lte("issue_date", to)
    .order("issue_date");

  const docs = reservationDocs ?? [];

  const bySource = (source: string | null) => docs.filter((d) => d.revenue_source === source);
  const fioDocs = bySource("fio");
  const csobDocs = bySource("fio_vs406");
  const unknownDocs = docs.filter((d) => !d.revenue_source);

  function sum(list: typeof docs, field: "amount_excl_vat" | "vat_amount" | "amount_total") {
    return list.reduce((s, d) => s + Number(d[field]), 0);
  }

  const totalExclVat = sum(docs, "amount_excl_vat");
  const totalVat = sum(docs, "vat_amount");
  const totalIncVat = sum(docs, "amount_total");

  const csvHref = `/api/exports/padel-revenue?month=${monthStr}`;

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Exporty</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Měsíční přehled tržeb za pronájem kurtu podle zdroje platby
          </p>
        </div>
        <a
          href={csvHref}
          className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
        >
          Stáhnout CSV
        </a>
      </div>

      <MonthSwitcher
        basePath="/exporty"
        monthStr={monthStr}
        prevMonth={shiftMonth(monthStr, -1)}
        nextMonth={shiftMonth(monthStr, 1)}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Fio – počet / tržba</div>
          <div className="text-lg font-semibold text-[#1e3a5f]">
            {fioDocs.length} / {formatCurrency(sum(fioDocs, "amount_total"))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Fio VS 406 (na místě) – počet / tržba</div>
          <div className="text-lg font-semibold text-[#1e3a5f]">
            {csobDocs.length} / {formatCurrency(sum(csobDocs, "amount_total"))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Základ DPH / DPH 12 %</div>
          <div className="text-lg font-semibold text-[#1e3a5f]">
            {formatCurrency(totalExclVat)} / {formatCurrency(totalVat)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Celkem s DPH</div>
          <div className="text-lg font-semibold text-green-600">{formatCurrency(totalIncVat)}</div>
        </div>
      </div>

      {unknownDocs.length > 0 ? (
        <div className="mb-6 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {unknownDocs.length} {unknownDocs.length === 1 ? "doklad" : "dokladů"} nemá rozpoznaný
          zdroj platby (ani Fio spárováno s rezervací, ani Fio VS 406 na místě) – zkontrolujte
          ručně, jde nejspíš o starší import před zavedením rozlišení zdroje.
        </div>
      ) : null}

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 mb-6">
        Nespárované bankovní platby a rezervace čekající na potvrzení platby teď najdete na
        stránce <Link href="/ke-kontrole" className="underline font-medium">Ke kontrole</Link> –
        appka je stahuje přímo z rezervačního systému.
      </div>      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 font-medium">Datum</th>
              <th className="px-4 py-2.5 font-medium">Doklad</th>
              <th className="px-4 py-2.5 font-medium">Zdroj platby</th>
              <th className="px-4 py-2.5 font-medium">VS</th>
              <th className="px-4 py-2.5 font-medium text-right">Základ DPH</th>
              <th className="px-4 py-2.5 font-medium text-right">DPH</th>
              <th className="px-4 py-2.5 font-medium text-right">Celkem</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2">{formatDate(d.issue_date)}</td>
                <td className="px-4 py-2">{d.document_number}</td>
                <td className="px-4 py-2">
                  {d.revenue_source ? sourceLabels[d.revenue_source] ?? d.revenue_source : "—"}
                </td>
                <td className="px-4 py-2 text-slate-500">{d.variable_symbol ?? "—"}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(Number(d.amount_excl_vat))}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(Number(d.vat_amount))}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(Number(d.amount_total))}</td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {error ? `Chyba načtení: ${error.message}` : "Žádné importované rezervace za zvolený měsíc."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
