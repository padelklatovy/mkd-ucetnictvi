import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { DocumentForm } from "@/components/dokumenty/document-form";

export const dynamic = "force-dynamic";

export default async function NovyPrijatyDokladPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: projects }, { data: partners }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .eq("is_active", true)
      .or("direction.eq.prijaty,direction.is.null")
      .order("sort_order"),
    supabase.from("projects").select("*").eq("company_id", DEFAULT_COMPANY_ID).eq("is_active", true),
    supabase.from("business_partners").select("*").eq("company_id", DEFAULT_COMPANY_ID).order("name"),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Nový přijatý doklad</h1>
      <DocumentForm
        direction="prijaty"
        categories={categories ?? []}
        projects={projects ?? []}
        partners={partners ?? []}
      />
    </div>
  );
}
