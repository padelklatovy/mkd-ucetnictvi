"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import type { Enums } from "@/lib/types/database.types";

export async function addCompanyAccess(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "uzivatel") as Enums<"user_role">;

  if (!email) return { error: "Zadejte e-mail." };

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .ilike("email", email)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile) {
    return {
      error:
        "Tenhle e-mail zatím není v appce zaregistrovaný. Ať se dotyčný nejdřív zaregistruje na přihlašovací stránce, pak ho sem můžete přidat.",
    };
  }

  const { error } = await supabase
    .from("company_users")
    .upsert(
      { company_id: DEFAULT_COMPANY_ID, user_id: profile.id, role },
      { onConflict: "company_id,user_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/nastaveni");
  return {};
}

export async function updateCompanyUserRole(
  companyUserId: string,
  role: Enums<"user_role">
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_users")
    .update({ role })
    .eq("id", companyUserId);

  if (error) return { error: error.message };
  revalidatePath("/nastaveni");
  return {};
}

export async function removeCompanyAccess(companyUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // ochrana proti odebrani posledniho administratora
  const { count: adminCount } = await supabase
    .from("company_users")
    .select("id", { count: "exact", head: true })
    .eq("company_id", DEFAULT_COMPANY_ID)
    .eq("role", "administrator");

  const { data: target } = await supabase
    .from("company_users")
    .select("role")
    .eq("id", companyUserId)
    .single();

  if (target?.role === "administrator" && (adminCount ?? 0) <= 1) {
    return { error: "Nelze odebrat posledního administrátora firmy." };
  }

  const { error } = await supabase.from("company_users").delete().eq("id", companyUserId);
  if (error) return { error: error.message };

  revalidatePath("/nastaveni");
  return {};
}
