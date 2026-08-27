"use client";

import { useState, useTransition } from "react";
import { convertQuoteToInvoice } from "@/app/(app)/nabidky/actions";

export function ConvertToInvoiceButton({ quoteId }: { quoteId: string }) {
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
      <span className="inline-flex items-center gap-2">
        <span className="text-sm text-slate-600">Vytvořit fakturu z téhle nabídky?</span>
        <button
          type="button"
          onClick={handleConvert}
          disabled={isPending}
          className="rounded-md bg-purple-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
        >
          {isPending ? "Vytvářím…" : "Ano, vytvořit"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-sm text-slate-400 hover:underline"
        >
          Zrušit
        </button>
      </span>
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
