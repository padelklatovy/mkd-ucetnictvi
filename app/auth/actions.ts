"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/prehled");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "Účet vytvořen. Zkontrolujte e-mail pro potvrzení, pak se přihlaste. Přístup do MKD Enterprise vám ještě musí přidělit administrátor."
    )}`
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://mkd-ucetnictvi.vercel.app";
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/auth/nove-heslo`,
  });

  // Zamerne nehlasime, jestli e-mail v systemu existuje (bezpecnost) - vzdy
  // stejna zprava, at nejde zjistit, kdo ma/nema ucet.
  if (error) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Pokud e-mail existuje v appce, poslali jsme na něj odkaz na obnovu hesla."
      )}`
    );
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "Pokud e-mail existuje v appce, poslali jsme na něj odkaz na obnovu hesla. Zkontrolujte i složku Spam."
    )}`
  );
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/nove-heslo?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/login?message=${encodeURIComponent("Heslo bylo změněno. Přihlaste se novým heslem.")}`
  );
}
