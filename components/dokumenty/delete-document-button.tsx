"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveDocument } from "@/app/(app)/prijate-doklady/actions";
import type { Enums } from "@/lib/types/database.types";

export function DeleteDocumentButton({
  id,
  direction,
  label,
  redirectTo,
}: {
  id: string;
  direction: Enums<"document_direction">;
  label: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await archiveDocument(id, direction);
        if (redirectTo) router.push(redirectTo);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Smazání se nezdařilo.");
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="text-slate-500">Smazat &bdquo;{label}&ldquo;?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-red-600 font-medium hover:underline disabled:opacity-50"
        >
          {isPending ? "Mažu…" : "Ano, smazat"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-slate-400 hover:underline"
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
        className="text-xs text-red-600 hover:underline"
      >
        Smazat
      </button>
      {error ? <div className="text-xs text-red-600 mt-1">{error}</div> : null}
    </>
  );
}
