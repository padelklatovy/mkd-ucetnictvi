import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { DeleteQuoteButton } from "@/components/dokumenty/delete-quote-button";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, { label: string; className: string }> = {
  navrh: { label: "Návrh", className: "bg-slate-100 text-slate-600 border-slate-300" },
  odeslana: { label: "Odeslána", className: "bg-blue-50 text-blue-700 border-blue-300" },
  prijata: { label: "Přijata", className: "bg-green-50 text-green-700 border-green-300" },
  zamitnuta: { label: "Zamítnuta", className: "bg-red-50 text-red-700 border-red-300" },
  prevedena: { label: "Fakturováno", className: "bg-purple-50 text-purple-700 border-purple-300" },
};

export default async function NabidkyPage() {
  const supabase = await createClient();

  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Nabídky</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cenové nabídky zákazníkům – nejsou daňový doklad. Po přijetí jde nabídka jedním
            tlačítkem převést na fakturu.
          </p>
        </div>
        <Link
          href="/nabidky/nova"
          className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
        >
          + Nová nabídka
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 font-medium">Číslo</th>
              <th className="px-4 py-2.5 font-medium">Zákazník</th>
              <th className="px-4 py-2.5 font-medium">Vystaveno</th>
              <th className="px-4 py-2.5 font-medium">Platnost do</th>
              <th className="px-4 py-2.5 font-medium text-right">Částka</th>
              <th className="px-4 py-2.5 font-medium">Stav</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(quotes ?? []).map((q) => {
              const statusInfo = statusLabels[q.status] ?? statusLabels.navrh;
              return (
                <tr key={q.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/nabidka/${q.id}`} target="_blank" className="text-[#1e3a5f] hover:underline font-medium">
                      {q.quote_number ?? "(bez čísla)"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{q.customer_name ?? "(bez jména)"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(q.issue_date)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(q.valid_until)}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(Number(q.amount_total))}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {q.status !== "prevedena" ? (
                        <Link
                          href={`/nabidky/${q.id}/uprava`}
                          className="text-xs text-[#1e3a5f] hover:underline"
                        >
                          Upravit
                        </Link>
                      ) : q.converted_to_document_id ? (
                        <Link
                          href={`/faktura/${q.converted_to_document_id}`}
                          target="_blank"
                          className="text-xs text-purple-700 hover:underline"
                        >
                          Zobrazit fakturu
                        </Link>
                      ) : null}
                      <DeleteQuoteButton id={q.id} label={q.quote_number ?? "nabídka bez čísla"} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!quotes || quotes.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {error ? `Chyba načtení: ${error.message}` : "Zatím žádné nabídky."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
