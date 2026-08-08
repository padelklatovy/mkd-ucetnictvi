"use client";

import { useState, useTransition } from "react";
import { importPadelReservations, importFioBarPayments } from "@/app/(app)/prijate-doklady/actions";
import type { PadelSyncResult } from "@/lib/integrations/padel-sync";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function monthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  const monthNames = [
    "leden", "únor", "březen", "duben", "květen", "červen",
    "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
  ];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value, label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

function monthBounds(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate(); // pocet dni v mesici, bez casoveho posunu
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

export function PadelImportPanel() {
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(7));
  const [dateTo, setDateTo] = useState(isoDaysAgo(0));
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isPendingReservations, startReservations] = useTransition();
  const [isPendingBar, startBar] = useTransition();
  const [resultReservations, setResultReservations] = useState<PadelSyncResult | null>(null);
  const [resultBar, setResultBar] = useState<PadelSyncResult | null>(null);
  const [errorReservations, setErrorReservations] = useState<string | null>(null);
  const [errorBar, setErrorBar] = useState<string | null>(null);

  function handleImportReservations() {
    setErrorReservations(null);
    setResultReservations(null);
    startReservations(async () => {
      try {
        const r = await importPadelReservations(dateFrom, dateTo);
        setResultReservations(r);
      } catch (e) {
        setErrorReservations(e instanceof Error ? e.message : "Import selhal.");
      }
    });
  }

  function handleImportBar() {
    setErrorBar(null);
    setResultBar(null);
    startBar(async () => {
      try {
        const r = await importFioBarPayments(dateFrom, dateTo);
        setResultBar(r);
      } catch (e) {
        setErrorBar(e instanceof Error ? e.message : "Import selhal.");
      }
    });
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Import tržeb za kurty (Fio)
      </div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Kalendářní měsíc</span>
          <select
            value={selectedMonth}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedMonth(value);
              if (value) {
                const { from, to } = monthBounds(value);
                setDateFrom(from);
                setDateTo(to);
              }
            }}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm bg-white"
          >
            <option value="">— vlastní rozsah —</option>
            {monthOptions().map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Od</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setSelectedMonth("");
            }}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Do</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setSelectedMonth("");
            }}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <span className="text-[11px] text-slate-400">
          Opakované spuštění pro stejné období nic neduplikuje. Výběr měsíce jen nastaví
          rozsah Od–Do, samotný import spustí až tlačítko níže.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-600 mb-2">
            Fio – platby spárované s rezervací
          </div>
          <button
            type="button"
            onClick={handleImportReservations}
            disabled={isPendingReservations}
            className="rounded-md bg-[#1e3a5f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#14293f] disabled:opacity-50"
          >
            {isPendingReservations ? "Importuji…" : "Importovat rezervace"}
          </button>
          {errorReservations ? <p className="mt-2 text-xs text-red-600">{errorReservations}</p> : null}
          {resultReservations ? (
            <p className="mt-2 text-xs text-slate-600">
              Staženo {resultReservations.fetched}, uloženo {resultReservations.imported}
              {resultReservations.skipped > 0 ? `, přeskočeno ${resultReservations.skipped}` : ""}.
              {resultReservations.errors.length > 0 ? (
                <span className="text-red-600"> Chyby: {resultReservations.errors.length}.</span>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-600 mb-2">
            Fio – platby na místě (barový QR, VS 406)
          </div>
          <button
            type="button"
            onClick={handleImportBar}
            disabled={isPendingBar}
            className="rounded-md bg-[#1e3a5f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#14293f] disabled:opacity-50"
          >
            {isPendingBar ? "Importuji…" : "Importovat platby na místě"}
          </button>
          {errorBar ? <p className="mt-2 text-xs text-red-600">{errorBar}</p> : null}
          {resultBar ? (
            <p className="mt-2 text-xs text-slate-600">
              Staženo {resultBar.fetched}, uloženo {resultBar.imported}
              {resultBar.skipped > 0 ? `, přeskočeno ${resultBar.skipped}` : ""}.
              {resultBar.errors.length > 0 ? (
                <span className="text-red-600"> Chyby: {resultBar.errors.length}.</span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
