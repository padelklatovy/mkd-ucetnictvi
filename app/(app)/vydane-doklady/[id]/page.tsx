import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { DocumentForm } from "@/components/dokumenty/document-form";
import { DocumentFilesPanel } from "@/components/dokumenty/document-files-panel";

export const dynamic = "force-dynamic";

export default async function VydanyDokladDetailPage({
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

  // Fakturam s polozkami se resi editace pres samostatny formular (radky, DPH
  // rekapitulace, QR platba) - obecny formular by je mohl rozbit.
  if (document.doc_type === "faktura") {
    return (
      <div className="max-w-3xl space-y-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Faktura {document.document_number ?? "(bez čísla)"}
        </h1>
        <div className="rounded-lg border border-slate-200 bg-white p-6 flex items-center gap-4">
          <Link
            href={`/faktura/${document.id}`}
            target="_blank"
            className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
          >
            Zobrazit / tisk faktury
          </Link>
          <Link
            href={`/vydane-doklady/${document.id}/uprava-faktury`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Upravit fakturu
          </Link>
        </div>
        <DocumentFilesPanel documentId={document.id} direction={document.direction} files={files ?? []} />
      </div>
    );
  }

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
