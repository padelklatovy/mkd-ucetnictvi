"use client";

import { useState, useTransition } from "react";
import { extractDocumentFields } from "@/app/(app)/prijate-doklady/actions";
import type { ExtractedDocumentData } from "@/lib/ai/extract-document";

const FIELD_LABELS: Record<string, string> = {
  partner_name: "Dodavatel",
  partner_ico: "IČO",
  partner_dic: "DIČ",
  document_number: "Číslo dokladu",
  issue_date: "Datum vystavení",
  taxable_supply_date: "DUZP",
  due_date: "Datum splatnosti",
  variable_symbol: "Variabilní symbol",
  currency: "Měna",
  amount_excl_vat: "Částka bez DPH",
  vat_amount: "Částka DPH",
  amount_total: "Částka celkem",
  vat_rate_percent: "Sazba DPH (%)",
};

// mapovani klice z AI odpovedi na id inputu ve formulari (viz document-form.tsx)
// partner_name a amount_total zamerne chybi - partner_name nema primy input
// (jen partner_ico/partner_dic), amount_total se dopocitava automaticky
const FORM_FIELD_MAP: Record<string, string> = {
  partner_ico: "field-partner_ico",
  partner_dic: "field-partner_dic",
  document_number: "field-document_number",
  issue_date: "field-issue_date",
  taxable_supply_date: "field-taxable_supply_date",
  due_date: "field-due_date",
  variable_symbol: "field-variable_symbol",
  currency: "field-currency",
  amount_excl_vat: "field-amount_excl_vat",
  vat_amount: "field-vat_amount",
};

function applyToForm(key: string, value: string) {
  const elId = FORM_FIELD_MAP[key];
  if (!elId) return;
  const el = document.getElementById(elId) as HTMLInputElement | HTMLSelectElement | null;
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function AiExtractionPanel({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ExtractedDocumentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleExtract() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const data = await extractDocumentFields(fileId);
        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Vytěžení se nezdařilo.");
      }
    });
  }

  function applyAll() {
    if (!result) return;
    Object.entries(FORM_FIELD_MAP).forEach(([key]) => {
      const value = (result as unknown as Record<string, unknown>)[key];
      if (value !== null && value !== undefined) applyToForm(key, String(value));
    });
    if (result.vat_rate_suggested) {
      const vatSelect = document.getElementById("field-vat_rate") as HTMLSelectElement | null;
      if (vatSelect) {
        vatSelect.value = result.vat_rate_suggested;
        vatSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  const displayRows = result
    ? (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[])
        .map((key) => ({
          key,
          label: FIELD_LABELS[key],
          value: (result as unknown as Record<string, unknown>)[key],
        }))
        .filter((r) => r.value !== null && r.value !== undefined && r.value !== "")
    : [];

  return (
    <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 truncate">
          AI vytěžení dat z „{fileName}“ (beta)
        </span>
        <button
          type="button"
          onClick={handleExtract}
          disabled={isPending}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 shrink-0"
        >
          {isPending ? "Vytěžuji…" : "Vytěžit AI"}
        </button>
      </div>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {result ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Návrh z AI – zkontrolujte před uložením
            </span>
            <button
              type="button"
              onClick={applyAll}
              className="rounded-md bg-[#1e3a5f] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#14293f]"
            >
              Přenést vše do formuláře
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {displayRows.map((row) => (
              <div key={row.key} className="contents">
                <dt className="text-slate-400">{row.label}</dt>
                <dd className="text-slate-700">{String(row.value)}</dd>
              </div>
            ))}
          </dl>
          {result.note ? (
            <p className="mt-2 text-[11px] text-orange-600">Poznámka AI: {result.note}</p>
          ) : null}
          <p className="mt-2 text-[11px] text-slate-400">
            Vždy zkontrolujte přenesené hodnoty ručně – AI se může zmýlit, hlavně u částek a
            sazby DPH.
          </p>
        </div>
      ) : null}
    </div>
  );
}
