"use client";

import { useState, useTransition } from "react";
import { importPadelReservations } from "@/app/(app)/prijate-doklady/actions";
import type { PadelSyncResult } from "@/lib/integrations/padel-sync";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function PadelImportPanel() {
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(7));
  const [dateTo, setDateTo] = useState(isoDaysAgo(0));
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PadelSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleImport() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const r = await importPadelReservations(dateFrom, dateTo);
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import selhal.");
      }
    });
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Import zaplacených rezervací z rezervačního systému
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Od</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Do</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={handleImport}
          disabled={isPending}
          className="rounded-md bg-[#1e3a5f] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#14293f] disabled:opacity-50"
        >
          {isPending ? "Importuji…" : "Importovat rezervace"}
        </button>
        <span className="text-[11px] text-slate-400">
          Opakované spuštění pro stejné období nic neduplikuje.
        </span>
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      {result ? (
        <p className="mt-3 text-xs text-slate-600">
          Staženo {result.fetched} rezervací, uloženo/aktualizováno {result.imported}
          {result.skipped > 0 ? `, přeskočeno ${result.skipped} (nulová částka)` : ""}.
          {result.errors.length > 0 ? (
            <span className="text-red-600"> Chyby: {result.errors.length} (viz konzole).</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
