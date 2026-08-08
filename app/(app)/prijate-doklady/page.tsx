import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils/format";
import type { Enums } from "@/lib/types/database.types";
import { DeleteDocumentButton } from "@/components/dokumenty/delete-document-button";

export const dynamic = "force-dynamic";

const statusOptions: Enums<"document_status">[] = [
  "novy",
  "ke_kontrole",
  "schvaleny",
  "ceka_na_uhradu",
  "zaplaceny",
  "chybi_doklad",
  "predany_ucetni",
];

export default async function PrijateDokladyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("id,document_number,partner_ico,amount_total,due_date,paid_date,status,created_at,business_partners(name)")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .eq("direction", "prijaty")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status as Enums<"document_status">);
  }
  if (q) {
    query = query.or(`document_number.ilike.%${q}%,partner_ico.ilike.%${q}%`);
  }

  const { data: documents, error } = await query;

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Přijaté doklady</h1>
          <p className="text-sm text-slate-500 mt-0.5">Faktury a doklady od dodavatelů</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/prijate-doklady/hromadne-nahrani"
            className="rounded-md border border-[#1e3a5f] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-slate-50"
          >
            📷 Hromadně nahrát a vytěžit AI
          </Link>
          <Link
            href="/prijate-doklady/novy"
            className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
          >
            + Nový doklad
          </Link>
        </div>
      </div>

      <form className="mb-4 flex gap-3" action="/prijate-doklady">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Hledat podle čísla dokladu nebo IČO..."
          className="w-80 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
        >
          <option value="">Všechny stavy</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Filtrovat
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 font-medium">Č. dokladu</th>
              <th className="px-4 py-2.5 font-medium">Dodavatel</th>
              <th className="px-4 py-2.5 font-medium">IČO</th>
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
                    <Link href={`/prijate-doklady/${doc.id}`} className="text-[#1e3a5f] hover:underline font-medium">
                      {doc.document_number ?? "(bez čísla)"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {(doc as unknown as { business_partners?: { name: string } | null }).business_partners
                      ?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{doc.partner_ico ?? "—"}</td>
                  <td className={`px-4 py-2.5 ${overdue ? "text-red-600 font-medium" : ""}`}>
                    {formatDate(doc.due_date)}
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(Number(doc.amount_total))}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DeleteDocumentButton
                      id={doc.id}
                      direction="prijaty"
                      label={doc.document_number ?? "doklad bez čísla"}
                    />
                  </td>
                </tr>
              );
            })}
            {(!documents || documents.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {error ? `Chyba načtení: ${error.message}` : "Žádné doklady neodpovídají filtru."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
