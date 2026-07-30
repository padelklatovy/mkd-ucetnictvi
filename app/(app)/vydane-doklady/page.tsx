import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function VydaneDokladyPage() {
  const supabase = await createClient();

  const { data: documents, error } = await supabase
    .from("documents")
    .select("id,document_number,partner_ico,amount_total,due_date,paid_date,status,created_at,business_partners(name)")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .eq("direction", "vydany")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vydané doklady</h1>
          <p className="text-sm text-slate-500 mt-0.5">Evidence a sledování úhrady vydaných faktur</p>
        </div>
        <Link
          href="/vydane-doklady/novy"
          className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
        >
          + Nový doklad
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 font-medium">Č. dokladu</th>
              <th className="px-4 py-2.5 font-medium">Odběratel</th>
              <th className="px-4 py-2.5 font-medium">Splatnost</th>
              <th className="px-4 py-2.5 font-medium text-right">Částka</th>
              <th className="px-4 py-2.5 font-medium">Stav</th>
            </tr>
          </thead>
          <tbody>
            {(documents ?? []).map((doc) => {
              const overdue = isOverdue(doc.due_date, doc.paid_date);
              return (
                <tr key={doc.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/vydane-doklady/${doc.id}`} className="text-[#1e3a5f] hover:underline font-medium">
                      {doc.document_number ?? "(bez čísla)"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {(doc as unknown as { business_partners?: { name: string } | null }).business_partners
                      ?.name ?? "—"}
                  </td>
                  <td className={`px-4 py-2.5 ${overdue ? "text-red-600 font-medium" : ""}`}>
                    {formatDate(doc.due_date)}
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(Number(doc.amount_total))}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={doc.status} />
                  </td>
                </tr>
              );
            })}
            {(!documents || documents.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {error ? `Chyba načtení: ${error.message}` : "Zatím žádné vydané doklady."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
