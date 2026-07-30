"use client";

import { useRef, useState, useTransition } from "react";
import {
  uploadDocumentFile,
  deleteDocumentFile,
  getSignedFileUrl,
} from "@/app/(app)/prijate-doklady/actions";
import type { Tables, Enums } from "@/lib/types/database.types";
import { AiExtractionPanel } from "@/components/dokumenty/ai-extraction-panel";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} kB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function DocumentFilesPanel({
  documentId,
  direction,
  files,
}: {
  documentId: string;
  direction: Enums<"document_direction">;
  files: Tables<"document_files">[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadDocumentFile(formData);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nahrání se nezdařilo.");
      }
    });
  }

  function handleDelete(fileId: string, storagePath: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteDocumentFile(fileId, storagePath, documentId, direction);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Smazání se nezdařilo.");
      }
    });
  }

  async function handleView(storagePath: string) {
    try {
      const url = await getSignedFileUrl(storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Náhled se nezdařil.");
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Přílohy dokladu
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-slate-400 mb-3">Zatím žádné přílohy.</p>
      ) : (
        <ul className="mb-3 divide-y divide-slate-100">
          {files.map((f) => (
            <li key={f.id} className="py-2">
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => handleView(f.storage_path)}
                  className="text-[#1e3a5f] hover:underline text-left truncate max-w-xs"
                >
                  {f.file_name}
                </button>
                <span className="text-xs text-slate-400 mx-3 shrink-0">
                  {formatSize(f.size_bytes)}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(f.id, f.storage_path)}
                  className="text-xs text-red-600 hover:underline shrink-0 disabled:opacity-50"
                >
                  Smazat
                </button>
              </div>
              <AiExtractionPanel fileId={f.id} fileName={f.file_name} />
            </li>
          ))}
        </ul>
      )}

      <form action={handleUpload} className="flex items-center gap-2">
        <input type="hidden" name="document_id" value={documentId} />
        <input type="hidden" name="direction" value={direction} />
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept="application/pdf,image/jpeg,image/png"
          required
          className="text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#1e3a5f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#14293f] disabled:opacity-50 shrink-0"
        >
          {isPending ? "Nahrávám…" : "Nahrát"}
        </button>
      </form>
      <p className="mt-2 text-[11px] text-slate-400">PDF, JPG nebo PNG, max. 15 MB.</p>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
