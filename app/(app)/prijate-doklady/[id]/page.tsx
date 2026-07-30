import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { DocumentForm } from "@/components/dokumenty/document-form";
import { DocumentFilesPanel } from "@/components/dokumenty/document-files-panel";

export const dynamic = "force-dynamic";

export default async function DokladDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: document }, { data: categories }, { data: projects }, { data: partners }, { data: files }] =
    await Promise.all([
      supabase.from("documents").select("*").eq("id", id).single(),
      supabase
        .from("categories")
        .select("*")
        .eq("company_id", DEFAULT_COMPANY_ID)
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("projects").select("*").eq("company_id", DEFAULT_COMPANY_ID).eq("is_active", true),
      supabase.from("business_partners").select("*").eq("company_id", DEFAULT_COMPANY_ID).order("name"),
      supabase
        .from("document_files")
        .select("*")
        .eq("document_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!document) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">
        Doklad {document.document_number ?? "(bez čísla)"}
      </h1>
      <DocumentFilesPanel documentId={document.id} direction={document.direction} files={files ?? []} />
      <DocumentForm
        direction={document.direction}
        document={document}
        categories={categories ?? []}
        projects={projects ?? []}
        partners={partners ?? []}
      />
    </div>
  );
}
