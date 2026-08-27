import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { UserAccessPanel, type CompanyUserRow } from "@/components/dokumenty/user-access-panel";

export const dynamic = "force-dynamic";

export default async function NastaveniPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_users")
    .select("id,role,profiles(email,full_name)")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .order("created_at");

  const users: CompanyUserRow[] = (data ?? []).map((row) => {
    const profile = (row as unknown as { profiles?: { email: string | null; full_name: string | null } | null })
      .profiles;
    return {
      id: row.id,
      role: row.role,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? null,
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Nastavení</h1>
      <p className="text-sm text-slate-500 mb-6">
        Kdo má do appky přístup a s jakou rolí – administrátor vidí a upravuje vše, uživatel
        pracuje s doklady, účetní má jen čtení a export.
      </p>
      {error ? (
        <p className="text-sm text-red-600">Chyba načtení: {error.message}</p>
      ) : (
        <UserAccessPanel users={users} />
      )}
    </div>
  );
}
