"use client";

import { useState } from "react";
import Link from "next/link";
import { quickImportDocument, type QuickImportResult } from "@/app/(app)/prijate-doklady/actions";
import type { Enums } from "@/lib/types/database.types";
import { formatCurrency } from "@/lib/utils/format";

type FileStatus = "cekam" | "zpracovavam" | "hotovo" | "chyba";

type QueueItem = {
  file: File;
  status: FileStatus;
  result?: QuickImportResult;
};

export function BulkImportUploader({ direction }: { direction: Enums<"document_direction"> }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  function handleSelectFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const items: QueueItem[] = Array.from(fileList).map((file) => ({ file, status: "cekam" }));
    setQueue(items);
  }

  async function handleStart() {
    setIsRunning(true);
    // zpracovavame postupne, jeden soubor po druhem - setrnejsi k AI API a snazsi sledovani prubehu
    for (let i = 0; i < queue.length; i++) {
      setQueue((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: "zpracovavam" } : item))
      );

      const formData = new FormData();
      formData.append("file", queue[i].file);

      try {
        const result = await quickImportDocument(formData, direction);
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: result.success ? "hotovo" : "chyba", result } : item
          )
        );
      } catch (e) {
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: "chyba",
                  result: {
                    fileName: queue[i].file.name,
                    success: false,
                    needsAttention: true,
                    error: e instanceof Error ? e.message : "Neznámá chyba.",
                  },
                }
              : item
          )
        );
      }
    }
    setIsRunning(false);
  }

  const allDone = queue.length > 0 && queue.every((q) => q.status === "hotovo" || q.status === "chyba");
  const doneCount = queue.filter((q) => q.status === "hotovo" || q.status === "chyba").length;
  const needsAttentionCount = queue.filter((q) => q.result?.needsAttention).length;

  return (
    <div className="max-w-2xl">
      {queue.length === 0 ? (
        <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center cursor-pointer hover:border-[#1e3a5f]">
          <span className="text-sm font-medium text-slate-700">
            Klikněte a vyberte fotky nebo PDF dokladů (můžete vybrat víc najednou)
          </span>
          <span className="text-xs text-slate-400">PDF, JPG, PNG · max. 15 MB na soubor</span>
          <input
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleSelectFiles(e.target.files)}
          />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">
                {queue.length} {queue.length === 1 ? "soubor" : "souborů"} připraveno
              </span>
              {!isRunning && !allDone ? (
                <button
                  type="button"
                  onClick={handleStart}
                  className="rounded-md bg-[#1e3a5f] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#14293f]"
                >
                  Spustit import a vytěžení
                </button>
              ) : null}
              {isRunning ? (
                <span className="text-xs text-slate-400">
                  Zpracovávám {doneCount + 1} z {queue.length}…
                </span>
              ) : null}
            </div>

            <ul className="divide-y divide-slate-100">
              {queue.map((item, idx) => (
                <li key={idx} className="py-2 flex items-center justify-between text-sm gap-3">
                  <span className="truncate max-w-[40%] text-slate-600">{item.file.name}</span>

                  {item.status === "cekam" && <span className="text-xs text-slate-400">Čeká</span>}
                  {item.status === "zpracovavam" && (
                    <span className="text-xs text-orange-600">Nahrávám a vytěžuji…</span>
                  )}
                  {item.status === "hotovo" && item.result ? (
                    <span className="text-xs text-right">
                      <Link
                        href={
                          direction === "prijaty"
                            ? `/prijate-doklady/${item.result.documentId}`
                            : `/vydane-doklady/${item.result.documentId}`
                        }
                        className="text-[#1e3a5f] hover:underline"
                      >
                        {item.result.partnerName ?? item.result.documentNumber ?? "Otevřít doklad"}
                      </Link>{" "}
                      <span className={item.result.needsAttention ? "text-orange-600" : "text-green-600"}>
                        {item.result.amountTotal ? formatCurrency(item.result.amountTotal) : "—"}
                        {item.result.needsAttention ? " · zkontrolovat" : " · OK"}
                      </span>
                    </span>
                  ) : null}
                  {item.status === "chyba" && item.result ? (
                    <span className="text-xs text-red-600 text-right max-w-[55%]">
                      Chyba: {item.result.error}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {allDone ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-slate-700">
                Hotovo. Vytvořeno {doneCount} dokladů
                {needsAttentionCount > 0 ? `, ${needsAttentionCount} z nich chce zkontrolovat` : ""}.
              </p>
              <div className="mt-3 flex gap-3">
                <Link
                  href={direction === "prijaty" ? "/prijate-doklady" : "/vydane-doklady"}
                  className="rounded-md bg-[#1e3a5f] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#14293f]"
                >
                  Zobrazit seznam dokladů
                </Link>
                <button
                  type="button"
                  onClick={() => setQueue([])}
                  className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                >
                  Nahrát další balík
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
