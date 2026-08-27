import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils/format";
import { PadelImportPanel } from "@/components/dokumenty/padel-import-panel";
import { MonthSwitcher } from "@/components/dokumenty/month-switcher";
import { DeleteDocumentButton } from "@/components/dokumenty/delete-document-button";

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

export default async function VydaneDokladyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; type?: string }>;
}) {
  const { month, type } = await searchParams;
  const showAll = month === "all";
  const monthStr = !showAll ? month || currentMonthStr() : "";
  const onlyInvoices = type === "faktura";

  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("id,document_number,partner_ico,customer_name,doc_type,issue_date,amount_total,due_date,paid_date,status,revenue_source,created_at,business_partners(name)")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .eq("direction", "vydany")
    .eq("is_archived", false)
    .order("issue_date", { ascending: false });

  if (!showAll) {
    const { from, to } = monthRange(monthStr);
    query = query.gte("issue_date", from).lte("issue_date", to);
  }

  if (onlyInvoices) {
    query = query.eq("doc_type", "faktura");
  }

  const { data: documents, error } = await query;

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vydané doklady</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Faktury vystavené zákazníkům – vaše <span className="font-medium text-green-600">tržby</span> (peníze jdou dovnitř)
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/vydane-doklady/odberatele"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            👥 Odběratelé
          </Link>
          <Link
            href="/vydane-doklady/nova-faktura"
            className="rounded-md border border-[#1e3a5f] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-slate-50"
          >
            🧾 Nová faktura
          </Link>
          <Link
            href="/vydane-doklady/novy"
            className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
          >
            + Nový doklad
          </Link>
        </div>
      </div>

      <PadelImportPanel />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {!showAll ? (
          <MonthSwitcher
            basePath="/vydane-doklady"
            monthStr={monthStr}
            prevMonth={shiftMonth(monthStr, -1)}
            nextMonth={shiftMonth(monthStr, 1)}
          />
        ) : (
          <div className="text-sm text-slate-600">Zobrazeny všechny doklady</div>
        )}
        <Link
          href={
            showAll
              ? `/vydane-doklady?month=${currentMonthStr()}${onlyInvoices ? "&type=faktura" : ""}`
              : `/vydane-doklady?month=all${onlyInvoices ? "&type=faktura" : ""}`
          }
          className="text-xs text-[#1e3a5f] hover:underline"
        >
          {showAll ? "Zpět na aktuální měsíc" : "Zobrazit vše"}
        </Link>

        <div className="ml-auto inline-flex rounded-md border border-slate-300 bg-white p-0.5">
          <Link
            href={`/vydane-doklady?${new URLSearchParams({ ...(month ? { month } : {}) }).toString()}`}
            className={`rounded px-3 py-1 text-xs font-medium ${
              !onlyInvoices ? "bg-[#1e3a5f] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Vše
          </Link>
          <Link
            href={`/vydane-doklady?${new URLSearchParams({ ...(month ? { month } : {}), type: "faktura" }).toString()}`}
            className={`rounded px-3 py-1 text-xs font-medium ${
              onlyInvoices ? "bg-[#1e3a5f] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            🧾 Jen faktury
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 font-medium">Odběratel</th>
              <th className="px-4 py-2.5 font-medium">Vystaveno</th>
              <th className="px-4 py-2.5 font-medium">Zdroj</th>
              <th className="px-4 py-2.5 font-medium">Splatnost</th>
              <th className="px-4 py-2.5 font-medium text-right">Částka</th>
              <th className="px-4 py-2.5 font-medium">Stav</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(documents ?? []).map((doc) => {
              const overdue = isOverdue(doc.due_date, doc.paid_date);
              return (
                <tr key={doc.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/vydane-doklady/${doc.id}`} className="text-[#1e3a5f] hover:underline font-medium">
                      {(doc as unknown as { business_partners?: { name: string } | null }).business_partners
                        ?.name ??
                        doc.customer_name ??
                        "(bez jména)"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(doc.issue_date)}</td>
                  <td className="px-4 py-2.5">
                    {doc.revenue_source === "fio" ? (
                      <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        Rezervace
                      </span>
                    ) : doc.revenue_source === "fio_vs406" ? (
                      <span className="inline-flex items-center rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                        Na místě (VS 406)
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Ruční</span>
                    )}
                  </td>
                  <td className={`px-4 py-2.5 ${overdue ? "text-red-600 font-medium" : ""}`}>
                    {formatDate(doc.due_date)}
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(Number(doc.amount_total))}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {doc.doc_type === "faktura" ? (
                        <Link
                          href={`/faktura/${doc.id}`}
                          target="_blank"
                          className="text-xs text-[#1e3a5f] hover:underline"
                        >
                          Zobrazit fakturu
                        </Link>
                      ) : null}
                      <DeleteDocumentButton
                        id={doc.id}
                        direction="vydany"
                        label={
                          (doc as unknown as { business_partners?: { name: string } | null })
                            .business_partners?.name ??
                          doc.customer_name ??
                          "doklad bez jména"
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!documents || documents.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {error
                    ? `Chyba načtení: ${error.message}`
                    : onlyInvoices
                      ? "Za zvolené období žádné vystavené faktury."
                      : "Za zvolené období žádné vydané doklady."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
