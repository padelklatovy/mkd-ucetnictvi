import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function OdberateleePage() {
  const supabase = await createClient();

  const { data: partners, error } = await supabase
    .from("business_partners")
    .select("*")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .order("name");

  // pocet a soucet fakturovaneho na odberatele, pro rychly prehled
  const { data: invoiceStats } = await supabase
    .from("documents")
    .select("partner_id,amount_total")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .eq("direction", "vydany")
    .eq("doc_type", "faktura")
    .eq("is_archived", false)
    .not("partner_id", "is", null);

  const statsByPartner = new Map<string, { count: number; sum: number }>();
  (invoiceStats ?? []).forEach((row) => {
    if (!row.partner_id) return;
    const current = statsByPartner.get(row.partner_id) ?? { count: 0, sum: 0 };
    current.count += 1;
    current.sum += Number(row.amount_total);
    statsByPartner.set(row.partner_id, current);
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Odběratelé</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Uloží se automaticky při vystavení faktury – vyberte odsud pro rychlé opakované
            fakturování.
          </p>
        </div>
        <Link
          href="/vydane-doklady/nova-faktura"
          className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
        >
          🧾 Nová faktura
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 font-medium">Název</th>
              <th className="px-4 py-2.5 font-medium">IČO</th>
              <th className="px-4 py-2.5 font-medium">Adresa</th>
              <th className="px-4 py-2.5 font-medium text-right">Fakturováno</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(partners ?? []).map((p) => {
              const stats = statsByPartner.get(p.id);
              return (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.ico ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-pre-line max-w-xs truncate">
                    {p.address ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {stats ? `${stats.count}× · ${stats.sum.toLocaleString("cs-CZ")} Kč` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/vydane-doklady/nova-faktura?partner=${p.id}`}
                      className="text-xs text-[#1e3a5f] hover:underline font-medium"
                    >
                      🧾 Nová faktura
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(!partners || partners.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {error
                    ? `Chyba načtení: ${error.message}`
                    : "Zatím žádní odběratelé – objeví se sami po první vystavené faktuře."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
