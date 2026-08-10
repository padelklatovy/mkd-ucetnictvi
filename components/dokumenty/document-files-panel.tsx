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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const browseInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(file: File) {
    setError(null);
    const formData = new FormData();
    formData.append("document_id", documentId);
    formData.append("direction", direction);
    formData.append("file", file);

    startTransition(async () => {
      try {
        await uploadDocumentFile(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nahrání se nezdařilo.");
      } finally {
        if (cameraInputRef.current) cameraInputRef.current.value = "";
        if (browseInputRef.current) browseInputRef.current.value = "";
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

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <input
          ref={browseInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-md bg-[#1e3a5f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#14293f] disabled:opacity-50 shrink-0"
        >
          {isPending ? "Nahrávám…" : "📷 Vyfotit"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => browseInputRef.current?.click()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 shrink-0"
        >
          {isPending ? "Nahrávám…" : "Vybrat soubor (PDF/foto)"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        &bdquo;Vybrat soubor&ldquo; jde použít i na naskenované PDF z appky Poznámky (Sdílet →
        Uložit do Souborů). PDF, JPG nebo PNG, max. 15 MB.
      </p>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
