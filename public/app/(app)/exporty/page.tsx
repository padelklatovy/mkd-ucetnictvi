import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { MonthSwitcher } from "@/components/dokumenty/month-switcher";
import { StatusBadge } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

function monthRange(monthStr: string) {
  // monthStr = "2026-08"
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDay)}`,
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

  const [
    { data: revenueDocsRaw, error: revenueError },
    { data: expenseDocsRaw, error: expenseError },
    { data: csobTxRaw, error: csobError },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("id,document_number,issue_date,amount_excl_vat,vat_amount,amount_total,revenue_source,variable_symbol,status,note")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .eq("direction", "vydany")
      .eq("is_archived", false)
      .eq("external_source", "padel-kalendar")
      .gte("issue_date", from)
      .lte("issue_date", to)
      .order("issue_date"),
    supabase
      .from("documents")
      .select("id,document_number,issue_date,due_date,paid_date,amount_excl_vat,vat_amount,amount_total,status,note,partner_ico,categories(name),business_partners(name)")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .eq("direction", "prijaty")
      .eq("is_archived", false)
      .gte("issue_date", from)
      .lte("issue_date", to)
      .order("issue_date"),
    supabase
      .from("bank_transactions")
      .select("id,transaction_date,direction,amount,currency,counterparty_name,variable_symbol,message_for_recipient,bank_accounts(name)")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .gte("transaction_date", from)
      .lte("transaction_date", to)
      .order("transaction_date"),
  ]);

  const csobTx = csobTxRaw ?? [];

  const revenueDocs = revenueDocsRaw ?? [];
  const expenseDocs = expenseDocsRaw ?? [];

  const bySource = (source: string | null) => revenueDocs.filter((d) => d.revenue_source === source);
  const fioDocs = bySource("fio");
  const csobDocs = bySource("fio_vs406");
  const unknownDocs = revenueDocs.filter((d) => !d.revenue_source);

  function sum<T extends { amount_excl_vat: number; vat_amount: number; amount_total: number }>(
    list: T[],
    field: "amount_excl_vat" | "vat_amount" | "amount_total"
  ) {
    return list.reduce((s, d) => s + Number(d[field]), 0);
  }

  const revenueExclVat = sum(revenueDocs, "amount_excl_vat");
  const revenueVat = sum(revenueDocs, "vat_amount");
  const revenueTotal = sum(revenueDocs, "amount_total");

  const expenseExclVat = sum(expenseDocs, "amount_excl_vat");
  const expenseVat = sum(expenseDocs, "vat_amount");
  const expenseTotal = sum(expenseDocs, "amount_total");

  const vatDifference = revenueVat - expenseVat;

  const csvHref = `/api/exports/padel-revenue?month=${monthStr}`;

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Exporty</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kompletní měsíční podklad pro účetní – příjmy i výdaje pohromadě
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

      {/* Celkový souhrn */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Příjmy celkem (s DPH)</div>
          <div className="text-lg font-semibold text-green-600">{formatCurrency(revenueTotal)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Výdaje celkem (s DPH)</div>
          <div className="text-lg font-semibold text-orange-600">{formatCurrency(expenseTotal)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Rozdíl</div>
          <div className={`text-lg font-semibold ${revenueTotal - expenseTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(revenueTotal - expenseTotal)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">DPH na výstupu / vstupu</div>
          <div className="text-lg font-semibold text-[#1e3a5f]">
            {formatCurrency(revenueVat)} / {formatCurrency(expenseVat)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Rozdíl {formatCurrency(vatDifference)} – orientačně, ne daňové přiznání
          </div>
        </div>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 mb-8">
        Nespárované bankovní platby a rezervace čekající na potvrzení platby najdete na stránce{" "}
        <Link href="/ke-kontrole" className="underline font-medium">Ke kontrole</Link> – appka je
        stahuje přímo z rezervačního systému.
      </div>

      {/* PŘÍJMY */}
      <h2 className="text-base font-semibold text-slate-800 mb-3">Příjmy – tržby za kurty</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
            {formatCurrency(revenueExclVat)} / {formatCurrency(revenueVat)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Celkem s DPH</div>
          <div className="text-lg font-semibold text-green-600">{formatCurrency(revenueTotal)}</div>
        </div>
      </div>

      {unknownDocs.length > 0 ? (
        <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {unknownDocs.length} {unknownDocs.length === 1 ? "doklad" : "dokladů"} nemá rozpoznaný
          zdroj platby – zkontrolujte ručně, jde nejspíš o starší import.
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm mb-10">
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
            {revenueDocs.map((d) => (
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
            {revenueDocs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {revenueError ? `Chyba načtení: ${revenueError.message}` : "Žádné importované rezervace za zvolený měsíc."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VÝDAJE */}
      <h2 className="text-base font-semibold text-slate-800 mb-3">Výdaje – přijaté doklady</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Počet dokladů</div>
          <div className="text-lg font-semibold text-[#1e3a5f]">{expenseDocs.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Základ DPH / DPH</div>
          <div className="text-lg font-semibold text-[#1e3a5f]">
            {formatCurrency(expenseExclVat)} / {formatCurrency(expenseVat)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Celkem s DPH</div>
          <div className="text-lg font-semibold text-orange-600">{formatCurrency(expenseTotal)}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 font-medium">Datum</th>
              <th className="px-4 py-2.5 font-medium">Doklad</th>
              <th className="px-4 py-2.5 font-medium">Dodavatel</th>
              <th className="px-4 py-2.5 font-medium">Kategorie</th>
              <th className="px-4 py-2.5 font-medium text-right">Základ DPH</th>
              <th className="px-4 py-2.5 font-medium text-right">DPH</th>
              <th className="px-4 py-2.5 font-medium text-right">Celkem</th>
              <th className="px-4 py-2.5 font-medium">Stav</th>
            </tr>
          </thead>
          <tbody>
            {expenseDocs.map((d) => (
              <tr key={d.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2">{formatDate(d.issue_date)}</td>
                <td className="px-4 py-2">
                  <Link href={`/prijate-doklady/${d.id}`} className="text-[#1e3a5f] hover:underline">
                    {d.document_number ?? "(bez čísla)"}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {(d as unknown as { business_partners?: { name: string } | null }).business_partners
                    ?.name ?? d.partner_ico ?? "—"}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {(d as unknown as { categories?: { name: string } | null }).categories?.name ?? "—"}
                </td>
                <td className="px-4 py-2 text-right">{formatCurrency(Number(d.amount_excl_vat))}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(Number(d.vat_amount))}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(Number(d.amount_total))}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={d.status} />
                </td>
              </tr>
            ))}
            {expenseDocs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  {expenseError ? `Chyba načtení: ${expenseError.message}` : "Žádné přijaté doklady za zvolený měsíc."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ČSOB VÝPIS */}
      <h2 className="text-base font-semibold text-slate-800 mb-3 mt-10">
        Bankovní pohyb – ČSOB (nahraný výpis)
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Ruční CSV import z internetbankingu, viz stránka Banka. Slouží jako podklad pro účetní,
        appka tyto transakce zatím automaticky nepáruje s doklady.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 font-medium">Datum</th>
              <th className="px-4 py-2.5 font-medium">Protistrana</th>
              <th className="px-4 py-2.5 font-medium">VS</th>
              <th className="px-4 py-2.5 font-medium">Zpráva</th>
              <th className="px-4 py-2.5 font-medium text-right">Částka</th>
            </tr>
          </thead>
          <tbody>
            {csobTx.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2">{formatDate(tx.transaction_date)}</td>
                <td className="px-4 py-2">{tx.counterparty_name ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500">{tx.variable_symbol ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-slate-400 max-w-xs truncate">
                  {tx.message_for_recipient ?? "—"}
                </td>
                <td
                  className={`px-4 py-2 text-right font-medium ${
                    tx.direction === "prichozi" ? "text-green-600" : "text-orange-600"
                  }`}
                >
                  {tx.direction === "odchozi" ? "-" : "+"}
                  {formatCurrency(Number(tx.amount), tx.currency)}
                </td>
              </tr>
            ))}
            {csobTx.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {csobError
                    ? `Chyba načtení: ${csobError.message}`
                    : "Žádný nahraný výpis za zvolený měsíc – nahrajte ho na stránce Banka."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
