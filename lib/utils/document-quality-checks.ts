import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/lib/types/database.types";

// Tolerance na zaokrouhlovaci rozdily (haléře, chyby OCR o pár korun)
const AMOUNT_TOLERANCE_CZK = 2;

export function checkAmountConsistency(
  amountExclVat: number,
  vatAmount: number,
  amountTotal: number
): { ok: boolean; note: string | null } {
  const expectedTotal = amountExclVat + vatAmount;
  const diff = Math.abs(expectedTotal - amountTotal);
  if (diff > AMOUNT_TOLERANCE_CZK) {
    return {
      ok: false,
      note: `Kontrola součtu nesedí: základ (${amountExclVat}) + DPH (${vatAmount}) = ${expectedTotal.toFixed(
        2
      )}, ale celkem je uvedeno ${amountTotal.toFixed(2)} (rozdíl ${diff.toFixed(2)} Kč). Zkontrolujte prosím ručně.`,
    };
  }
  return { ok: true, note: null };
}

export async function findPossibleDuplicate(
  supabase: SupabaseClient<Database>,
  companyId: string,
  direction: Enums<"document_direction">,
  documentNumber: string | null,
  partnerIco: string | null,
  excludeId?: string
): Promise<{ id: string; amount_total: number; status: Enums<"document_status"> } | null> {
  if (!documentNumber || !partnerIco) return null;

  let query = supabase
    .from("documents")
    .select("id,amount_total,status")
    .eq("company_id", companyId)
    .eq("direction", direction)
    .eq("is_archived", false)
    .eq("document_number", documentNumber)
    .eq("partner_ico", partnerIco)
    .limit(1);

  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.maybeSingle();
  return data ?? null;
}
