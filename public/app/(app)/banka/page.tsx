import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CsobImportPanel } from "@/components/dokumenty/csob-import-panel";
import { MonthSwitcher } from "@/components/dokumenty/month-switcher";

export const dynamic = "force-dynamic";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function shiftMonth(monthStr: string, delta: number) {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthRange(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return { from: `${year}-${pad2(month)}-01`, to: `${year}-${pad2(month)}-${pad2(lastDay)}` };
}

export default async function BankaPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const monthStr = month || currentMonthStr();
  const { from, to } = monthRange(monthStr);

  const supabase = await createClient();

  const { data: transactions, error } = await supabase
    .from("bank_transactions")
    .select("id,transaction_date,direction,amount,currency,counterparty_name,counterparty_account,variable_symbol,message_for_recipient,bank_accounts(name)")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .gte("transaction_date", from)
    .lte("transaction_date", to)
    .order("transaction_date", { ascending: false });

  const rows = transactions ?? [];
  const prichozi = rows.filter((r) => r.direction === "prichozi");
  const odchozi = rows.filter((r) => r.direction === "odchozi");
  const sumAmount = (list: typeof rows) => list.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Banka</h1>
      <p className="text-sm text-slate-500 mb-6">
        Bankovní účty mimo automatické napojení – zatím ČSOB, ruční import výpisu (PDF nebo CSV).
      </p>

      <CsobImportPanel />

      <MonthSwitcher
        basePath="/banka"
        monthStr={monthStr}
        prevMonth={shiftMonth(monthStr, -1)}
        nextMonth={shiftMonth(monthStr, 1)}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Příchozí platby</div>
          <div className="text-lg font-semibold text-green-600">
            {prichozi.length} / {formatCurrency(sumAmount(prichozi))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Odchozí platby</div>
          <div className="text-lg font-semibold text-orange-600">
            {odchozi.length} / {formatCurrency(sumAmount(odchozi))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Rozdíl</div>
          <div className="text-lg font-semibold text-[#1e3a5f]">
            {formatCurrency(sumAmount(prichozi) - sumAmount(odchozi))}
          </div>
        </div>
      </div>

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
            {rows.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2">{formatDate(tx.transaction_date)}</td>
                <td className="px-4 py-2">
                  {tx.counterparty_name ?? "—"}
                  {tx.counterparty_account ? (
                    <span className="text-xs text-slate-400"> ({tx.counterparty_account})</span>
                  ) : null}
                </td>
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {error ? `Chyba načtení: ${error.message}` : "Za zvolené období žádné transakce – nahrajte výpis výše."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
