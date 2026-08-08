import { saveDocument } from "@/app/(app)/prijate-doklady/actions";
import { DeleteDocumentButton } from "@/components/dokumenty/delete-document-button";
import type { Tables, Enums } from "@/lib/types/database.types";
import {
  docTypeLabels,
  vatRateLabels,
  paymentMethodLabels,
  statusLabels,
} from "@/lib/utils/labels";

const docTypes = Object.keys(docTypeLabels) as Enums<"document_type">[];
const vatRates = Object.keys(vatRateLabels) as Enums<"vat_rate">[];
const paymentMethods = Object.keys(paymentMethodLabels) as Enums<"payment_method">[];
const statuses = Object.keys(statusLabels) as Enums<"document_status">[];

function field(label: string, children: React.ReactNode) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]";

export function DocumentForm({
  direction,
  document,
  categories,
  projects,
  partners,
}: {
  direction: Enums<"document_direction">;
  document?: Tables<"documents">;
  categories: Tables<"categories">[];
  projects: Tables<"projects">[];
  partners: Tables<"business_partners">[];
}) {
  return (
    <form action={saveDocument} className="max-w-3xl space-y-6">
      <input type="hidden" name="direction" value={direction} />
      {document ? <input type="hidden" name="id" value={document.id} /> : null}

      <div className="grid grid-cols-2 gap-4">
        {field(
          "Typ dokladu",
          <select name="doc_type" defaultValue={document?.doc_type ?? "faktura"} className={inputClass}>
            {docTypes.map((t) => (
              <option key={t} value={t}>
                {docTypeLabels[t]}
              </option>
            ))}
          </select>
        )}
        {field(
          "Číslo dokladu",
          <input
            id="field-document_number"
            name="document_number"
            defaultValue={document?.document_number ?? ""}
            className={inputClass}
            placeholder="např. 2026-0142"
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {field(
          "Partner (existující)",
          <select name="partner_id" defaultValue={document?.partner_id ?? ""} className={inputClass}>
            <option value="">— nevybráno —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {field(
          "IČO partnera",
          <input
            id="field-partner_ico"
            name="partner_ico"
            defaultValue={document?.partner_ico ?? ""}
            className={inputClass}
          />
        )}
        {field(
          "DIČ partnera",
          <input
            id="field-partner_dic"
            name="partner_dic"
            defaultValue={document?.partner_dic ?? ""}
            className={inputClass}
          />
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {field(
          "Datum vystavení",
          <input
            id="field-issue_date"
            type="date"
            name="issue_date"
            defaultValue={document?.issue_date ?? ""}
            className={inputClass}
          />
        )}
        {field(
          "DUZP",
          <input
            id="field-taxable_supply_date"
            type="date"
            name="taxable_supply_date"
            defaultValue={document?.taxable_supply_date ?? ""}
            className={inputClass}
          />
        )}
        {field(
          "Datum splatnosti",
          <input
            id="field-due_date"
            type="date"
            name="due_date"
            defaultValue={document?.due_date ?? ""}
            className={inputClass}
          />
        )}
        {field(
          "Datum úhrady",
          <input
            type="date"
            name="paid_date"
            defaultValue={document?.paid_date ?? ""}
            className={inputClass}
          />
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {field(
          "Částka bez DPH",
          <input
            id="field-amount_excl_vat"
            type="number"
            step="0.01"
            name="amount_excl_vat"
            defaultValue={document?.amount_excl_vat ?? 0}
            className={inputClass}
          />
        )}
        {field(
          "Sazba DPH",
          <select
            id="field-vat_rate"
            name="vat_rate"
            defaultValue={document?.vat_rate ?? "zakladni"}
            className={inputClass}
          >
            {vatRates.map((r) => (
              <option key={r} value={r}>
                {vatRateLabels[r]}
              </option>
            ))}
          </select>
        )}
        {field(
          "Částka DPH",
          <input
            id="field-vat_amount"
            type="number"
            step="0.01"
            name="vat_amount"
            defaultValue={document?.vat_amount ?? 0}
            className={inputClass}
          />
        )}
        {field(
          "Měna",
          <input
            id="field-currency"
            name="currency"
            defaultValue={document?.currency ?? "CZK"}
            className={inputClass}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {field(
          "Variabilní symbol",
          <input
            id="field-variable_symbol"
            name="variable_symbol"
            defaultValue={document?.variable_symbol ?? ""}
            className={inputClass}
          />
        )}
        {field(
          "Způsob úhrady",
          <select
            name="payment_method"
            defaultValue={document?.payment_method ?? "prevod"}
            className={inputClass}
          >
            {paymentMethods.map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabels[m]}
              </option>
            ))}
          </select>
        )}
        {field(
          "Stav dokladu",
          <select name="status" defaultValue={document?.status ?? "novy"} className={inputClass}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {field(
          "Účetní kategorie",
          <select name="category_id" defaultValue={document?.category_id ?? ""} className={inputClass}>
            <option value="">— nevybráno —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {field(
          "Středisko / projekt",
          <select name="project_id" defaultValue={document?.project_id ?? ""} className={inputClass}>
            <option value="">— nevybráno —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {field(
        "Poznámka",
        <textarea
          name="note"
          defaultValue={document?.note ?? ""}
          rows={3}
          className={inputClass}
        />
      )}

      {!document ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Přílohy (PDF/JPG/PNG) půjde nahrát po uložení dokladu – otevřete ho pak znovu z
          detailu.
        </div>
      ) : null}

      <div className="flex gap-3 items-center">
        <button
          type="submit"
          className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
        >
          Uložit doklad
        </button>
        {document ? (
          <DeleteDocumentButton
            id={document.id}
            direction={direction}
            label={document.document_number ?? "tento doklad"}
            redirectTo={direction === "prijaty" ? "/prijate-doklady" : "/vydane-doklady"}
          />
        ) : null}
      </div>
    </form>
  );
}
