import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { directionLabels } from "@/lib/utils/labels";
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

export default async function PrehledPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const monthStr = month || currentMonthStr();
  const { from: monthFromStr, to: monthToStr } = monthRange(monthStr);
  const isCurrentMonth = monthStr === currentMonthStr();

  const supabase = await createClient();
  const companyId = DEFAULT_COMPANY_ID;

  const [
    { data: documents },
    { data: recentDocuments },
    { count: nezaplaceneCount },
    { data: confirmedMatches },
    { count: docsToCheckCount },
    { count: bankTxTotalCount },
    { count: autoImportedCount },
    { count: autoImportedThisMonthCount },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("direction,amount_total,vat_amount,issue_date,status,due_date,paid_date")
      .eq("company_id", companyId)
      .gte("issue_date", monthFromStr)
      .lte("issue_date", monthToStr),
    supabase
      .from("documents")
      .select("id,direction,document_number,customer_name,partner_id,amount_total,status,created_at,external_source,business_partners(name)")
      .eq("company_id", companyId)
      .gte("issue_date", monthFromStr)
      .lte("issue_date", monthToStr)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("direction", "vydany")
      .is("paid_date", null),
    supabase
      .from("payment_matches")
      .select("bank_transaction_id")
      .eq("company_id", companyId)
      .eq("status", "potvrzeno"),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .is("paid_date", null)
      .in("status", ["novy", "ke_kontrole", "ceka_na_uhradu", "chybi_doklad"]),
    supabase
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .not("external_source", "is", null),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .not("external_source", "is", null)
      .gte("issue_date", monthFromStr)
      .lte("issue_date", monthToStr),
  ]);

  const matchedTxIds = new Set((confirmedMatches ?? []).map((m) => m.bank_transaction_id));
  const bankTxUnmatchedCount = Math.max((bankTxTotalCount ?? 0) - matchedTxIds.size, 0);
  const nezaplaceneFakturyCount = nezaplaceneCount ?? 0;

  const prijmy = (documents ?? [])
    .filter((d) => d.direction === "vydany")
    .reduce((sum, d) => sum + Number(d.amount_total), 0);

  const vydaje = (documents ?? [])
    .filter((d) => d.direction === "prijaty")
    .reduce((sum, d) => sum + Number(d.amount_total), 0);

  const dphNaVstupu = (documents ?? [])
    .filter((d) => d.direction === "prijaty")
    .reduce((sum, d) => sum + Number(d.vat_amount), 0);

  const dphNaVystupu = (documents ?? [])
    .filter((d) => d.direction === "vydany")
    .reduce((sum, d) => sum + Number(d.vat_amount), 0);

  return (
    <div className="max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Přehled</h1>
          <p className="text-sm text-slate-500 mt-0.5">MKD Enterprise, s.r.o.</p>
        </div>
      </div>

      <MonthSwitcher
        basePath="/prehled"
        monthStr={monthStr}
        prevMonth={shiftMonth(monthStr, -1)}
        nextMonth={shiftMonth(monthStr, 1)}
      />

      <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">
            Automaticky zpracováno bez ručního zásahu
          </div>
          <div className="text-2xl font-semibold text-green-800 mt-1">
            {autoImportedCount ?? 0} dokladů celkem
          </div>
          <div className="text-xs text-green-700 mt-0.5">
            z toho {autoImportedThisMonthCount ?? 0}{" "}
            {isCurrentMonth ? "tento měsíc" : "ve vybraném měsíci"} – import z rezervačního
            systému (Fio, spárováno s rezervací i platby na místě přes QR)
          </div>
        </div>
        <Link
          href="/exporty"
          className="rounded-md bg-green-700 px-4 py-2 text-xs font-medium text-white hover:bg-green-800 shrink-0"
        >
          Zobrazit přehled tržeb
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Příjmy za období" value={formatCurrency(prijmy)} tone="green" />
        <StatCard label="Výdaje za období" value={formatCurrency(vydaje)} tone="orange" />
        <StatCard
          label="Rozdíl"
          value={formatCurrency(prijmy - vydaje)}
          tone={prijmy - vydaje >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Nezaplacené vydané faktury"
          value={String(nezaplaceneFakturyCount)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="DPH na vstupu (orientačně)"
          value={formatCurrency(dphNaVstupu)}
          hint="Pracovní přehled, ne daňové přiznání"
        />
        <StatCard
          label="DPH na výstupu (orientačně)"
          value={formatCurrency(dphNaVystupu)}
          hint="Pracovní přehled, ne daňové přiznání"
        />
        <StatCard
          label="Bankovní platby bez dokladu"
          value={String(bankTxUnmatchedCount)}
        />
        <StatCard
          label="Položky vyžadující kontrolu"
          value={String(docsToCheckCount ?? 0)}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Poslední přidané doklady</h2>
          <Link href="/prijate-doklady" className="text-xs text-[#1e3a5f] hover:underline">
            Zobrazit vše
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-5 py-2 font-medium">Typ</th>
              <th className="px-5 py-2 font-medium">Partner / zákazník</th>
              <th className="px-5 py-2 font-medium">Částka</th>
              <th className="px-5 py-2 font-medium">Stav</th>
              <th className="px-5 py-2 font-medium">Zdroj</th>
              <th className="px-5 py-2 font-medium">Přidáno</th>
            </tr>
          </thead>
          <tbody>
            {(recentDocuments ?? []).map((doc) => (
              <tr key={doc.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-2.5">{directionLabels[doc.direction]}</td>
                <td className="px-5 py-2.5">
                  {(doc as unknown as { business_partners?: { name: string } | null })
                    .business_partners?.name ?? doc.customer_name ?? "—"}
                </td>
                <td className="px-5 py-2.5">{formatCurrency(Number(doc.amount_total))}</td>
                <td className="px-5 py-2.5">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-5 py-2.5">
                  {doc.external_source ? (
                    <span className="inline-flex items-center rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                      Auto import
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Ruční zadání</span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-slate-400">{formatDate(doc.created_at)}</td>
              </tr>
            ))}
            {(!recentDocuments || recentDocuments.length === 0) && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                  Zatím žádné doklady.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
