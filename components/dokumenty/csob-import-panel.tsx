"use client";

import { useRef, useState, useTransition } from "react";
import { importCsobStatement, type CsvImportResult } from "@/app/(app)/banka/actions";

export function CsobImportPanel() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(formData: FormData) {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const r = await importCsobStatement(formData);
        setResult(r);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import se nezdařil.");
      }
    });
  }

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Import výpisu ČSOB (PDF nebo CSV)
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Nahrajte měsíční výpis přímo jako PDF (tak, jak ho ČSOB posílá) nebo jako CSV export
        z internetbankingu. Appka sama rozpozná formát i sloupce. Opakovaný import stejného
        výpisu nic neduplikuje.
      </p>
      <form action={handleUpload} className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept=".pdf,.csv,application/pdf,text/csv"
          required
          className="text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#1e3a5f] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#14293f] disabled:opacity-50 shrink-0"
        >
          {isPending ? "Nahrávám…" : "Importovat výpis"}
        </button>
      </form>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      {result ? (
        <p className="mt-3 text-xs text-slate-600">
          Nalezeno {result.totalRows} transakcí, uloženo {result.imported}
          {result.duplicates > 0 ? `, přeskočeno ${result.duplicates} (už dřív naimportováno)` : ""}
          {result.skippedRows > 0 ? `, ${result.skippedRows} řádků se nepodařilo rozpoznat` : ""}.
          {result.errors.length > 0 ? (
            <span className="text-red-600"> Chyby: {result.errors.length}.</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
