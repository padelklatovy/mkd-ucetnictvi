"use client";

import { useState, useTransition } from "react";
import { duplicateInvoice } from "@/app/(app)/vydane-doklady/invoice-actions";

export function DuplicateInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDuplicate() {
    setError(null);
    startTransition(async () => {
      try {
        await duplicateInvoice(invoiceId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Duplikace se nezdařila.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isPending}
        className="text-sm text-[#1e3a5f] hover:underline disabled:opacity-50"
      >
        {isPending ? "Vytvářím kopii…" : "📋 Duplikovat"}
      </button>
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </>
  );
}
