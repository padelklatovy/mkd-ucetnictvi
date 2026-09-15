"use client";

import { useState, useTransition } from "react";
import { convertQuoteToInvoice } from "@/app/(app)/nabidky/actions";

export function ConvertToInvoiceButton({
  quoteId,
  compact = false,
}: {
  quoteId: string;
  compact?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConvert() {
    setError(null);
    startTransition(async () => {
      try {
        await convertQuoteToInvoice(quoteId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Převod se nezdařil.");
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <span className={`inline-flex items-center gap-2 ${compact ? "text-xs" : ""}`}>
        <span className={compact ? "text-slate-500" : "text-sm text-slate-600"}>
          Vytvořit fakturu?
        </span>
        <button
          type="button"
          onClick={handleConvert}
          disabled={isPending}
          className={
            compact
              ? "rounded bg-purple-700 px-2 py-0.5 text-xs font-medium text-white hover:bg-purple-800 disabled:opacity-50"
              : "rounded-md bg-purple-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
          }
        >
          {isPending ? "…" : "Ano"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className={compact ? "text-xs text-slate-400 hover:underline" : "text-sm text-slate-400 hover:underline"}
        >
          Zrušit
        </button>
      </span>
    );
  }

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs text-purple-700 hover:underline font-medium"
        >
          🧾 Vytvořit fakturu
        </button>
        {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 print:hidden"
      >
        🧾 Převést na fakturu
      </button>
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </>
  );
}
