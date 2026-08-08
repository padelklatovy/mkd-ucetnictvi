import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils/format";
import { directionLabels } from "@/lib/utils/labels";
import { fetchReviewItems } from "@/lib/integrations/padel-sync";

export const dynamic = "force-dynamic";

const kindLabels: Record<string, string> = {
  nesparovana_platba: "Nespárovaná Fio platba",
  neplatba_potvrzena: "Rezervace čeká na potvrzení platby",
};

export default async function KeKontrolePage() {
  const supabase = await createClient();

  const [{ data: toReview }, { data: allUnpaid }, reviewItemsResult] = await Promise.all([
    supabase
      .from("documents")
      .select("id,direction,document_number,customer_name,amount_total,status,note,due_date,business_partners(name)")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .eq("is_archived", false)
      .in("status", ["ke_kontrole", "chybi_doklad"])
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id,direction,document_number,customer_name,amount_total,due_date,status,business_partners(name)")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .eq("is_archived", false)
      .is("paid_date", null)
      .not("due_date", "is", null),
    fetchReviewItems().catch((e) => ({ error: e instanceof Error ? e.message : "Chyba" })),
  ]);

  const overdue = (allUnpaid ?? []).filter((d) => isOverdue(d.due_date, null));
  const reviewItems = Array.isArray(reviewItemsResult) ? reviewItemsResult : [];
  const reviewItemsError = Array.isArray(reviewItemsResult) ? null : reviewItemsResult.error;

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Ke kontrole</h1>
      <p className="text-sm text-slate-500 mb-6">
        Doklady, které appka sama vyhodnotila jako nejisté nebo neúplné, a doklady po splatnosti.
        Nic se sem nedostane bez důvodu – buď se AI vytěžení nepovedlo spolehlivě, nebo doklad
        čeká na ruční potvrzení.
      </p>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Vyžadují kontrolu ({(toReview ?? []).length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-5 py-2 font-medium">Typ</th>
              <th className="px-5 py-2 font-medium">Partner / zákazník</th>
              <th className="px-5 py-2 font-medium">Částka</th>
              <th className="px-5 py-2 font-medium">Stav</th>
              <th className="px-5 py-2 font-medium">Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {(toReview ?? []).map((doc) => (
              <tr key={doc.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-5 py-2.5">{directionLabels[doc.direction]}</td>
                <td className="px-5 py-2.5">
                  <Link
                    href={
                      doc.direction === "prijaty"
                        ? `/prijate-doklady/${doc.id}`
                        : `/vydane-doklady/${doc.id}`
                    }
                    className="text-[#1e3a5f] hover:underline"
                  >
                    {(doc as unknown as { business_partners?: { name: string } | null })
                      .business_partners?.name ??
                      doc.customer_name ??
                      "(bez jména)"}
                  </Link>
                </td>
                <td className="px-5 py-2.5">{formatCurrency(Number(doc.amount_total))}</td>
                <td className="px-5 py-2.5">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-5 py-2.5 text-xs text-slate-400 max-w-sm truncate">
                  {doc.note ?? "—"}
                </td>
              </tr>
            ))}
            {(!toReview || toReview.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                  Nic ke kontrole – všechny doklady jsou v pořádku.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Po splatnosti ({overdue.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-5 py-2 font-medium">Typ</th>
              <th className="px-5 py-2 font-medium">Partner / zákazník</th>
              <th className="px-5 py-2 font-medium">Splatnost</th>
              <th className="px-5 py-2 font-medium">Částka</th>
            </tr>
          </thead>
          <tbody>
            {overdue.map((doc) => (
              <tr key={doc.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-5 py-2.5">{directionLabels[doc.direction]}</td>
                <td className="px-5 py-2.5">
                  <Link
                    href={
                      doc.direction === "prijaty"
                        ? `/prijate-doklady/${doc.id}`
                        : `/vydane-doklady/${doc.id}`
                    }
                    className="text-[#1e3a5f] hover:underline"
                  >
                    {(doc as unknown as { business_partners?: { name: string } | null })
                      .business_partners?.name ??
                      doc.customer_name ??
                      "(bez jména)"}
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-red-600 font-medium">{formatDate(doc.due_date)}</td>
                <td className="px-5 py-2.5">{formatCurrency(Number(doc.amount_total))}</td>
              </tr>
            ))}
            {overdue.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-slate-400">
                  Žádné doklady po splatnosti.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Z rezervačního systému ({reviewItems.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-5 py-2 font-medium">Typ</th>
              <th className="px-5 py-2 font-medium">Datum</th>
              <th className="px-5 py-2 font-medium">Plátce / zákazník</th>
              <th className="px-5 py-2 font-medium">VS</th>
              <th className="px-5 py-2 font-medium text-right">Částka</th>
              <th className="px-5 py-2 font-medium">Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {reviewItems.map((item) => (
              <tr key={item.identifier} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-2.5">
                  <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                    {kindLabels[item.kind] ?? item.kind}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-slate-500">{formatDate(item.occurred_on)}</td>
                <td className="px-5 py-2.5">{item.payer_or_customer ?? "—"}</td>
                <td className="px-5 py-2.5 text-slate-500">{item.variable_symbol ?? "—"}</td>
                <td className="px-5 py-2.5 text-right">{formatCurrency(Number(item.amount))}</td>
                <td className="px-5 py-2.5 text-xs text-slate-400 max-w-xs truncate">
                  {item.note ?? "—"}
                </td>
              </tr>
            ))}
            {reviewItems.length === 0 && !reviewItemsError && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                  Nic ke kontrole – vše z rezervačního systému je v pořádku.
                </td>
              </tr>
            )}
            {reviewItemsError && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-red-500">
                  Chyba načtení z rezervačního systému: {reviewItemsError}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
