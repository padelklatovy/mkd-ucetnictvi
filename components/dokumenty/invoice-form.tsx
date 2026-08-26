"use client";

import { useState, useTransition } from "react";
import { lookupAres, saveInvoice } from "@/app/(app)/vydane-doklady/invoice-actions";
import { calcInvoiceTotals, calcLineTotal, type InvoiceLineItem } from "@/lib/utils/invoice";
import { formatCurrency } from "@/lib/utils/format";
import type { Tables } from "@/lib/types/database.types";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]";

function field(label: string, children: React.ReactNode) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function InvoiceForm({
  document,
  existingItems,
  bankAccounts,
  suggestedNumber,
  existingPartners = [],
  descriptionSuggestions = [],
  preselectedPartnerId,
}: {
  document?: Tables<"documents">;
  existingItems?: Tables<"document_line_items">[];
  bankAccounts: Tables<"bank_accounts">[];
  suggestedNumber: string;
  existingPartners?: Tables<"business_partners">[];
  descriptionSuggestions?: string[];
  preselectedPartnerId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [aresStatus, setAresStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const preselected = preselectedPartnerId
    ? existingPartners.find((p) => p.id === preselectedPartnerId)
    : undefined;

  const [icoInput, setIcoInput] = useState(document?.partner_ico ?? preselected?.ico ?? "");
  const [customerName, setCustomerName] = useState(document?.customer_name ?? preselected?.name ?? "");
  const [customerAddress, setCustomerAddress] = useState(
    document?.customer_address ?? preselected?.address ?? ""
  );
  const [customerDic, setCustomerDic] = useState(document?.partner_dic ?? preselected?.dic ?? "");
  const [selectedPartnerId, setSelectedPartnerId] = useState(preselected?.id ?? "");

  const [items, setItems] = useState<InvoiceLineItem[]>(
    existingItems && existingItems.length > 0
      ? existingItems.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit,
          unitPrice: Number(it.unit_price),
          vatRatePercent: Number(it.vat_rate_percent),
        }))
      : [{ description: "", quantity: 1, unit: "ks", unitPrice: 0, vatRatePercent: 21 }]
  );

  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? "");
  const [paid, setPaid] = useState(document?.status === "zaplaceny");

  // Ktere pole (Cena/j. nebo Celkem) u ktere radky se prave edituje - dokud se
  // pole edituje, zobrazuje presne to, co uzivatel napsal (zadny prepocet mu to
  // "nesebere" pod rukama). Prepocita se vzdy jen to DRUHE, needitovane pole.
  const [editing, setEditing] = useState<{ idx: number; field: "unitPrice" | "total"; raw: string } | null>(
    null
  );

  const totals = calcInvoiceTotals(items);
  const selectedAccount = bankAccounts.find((a) => a.id === bankAccountId) ?? bankAccounts[0];

  function updateItem(index: number, patch: Partial<InvoiceLineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit: "ks", unitPrice: 0, vatRatePercent: 21 }]);
  }
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }
  // Zpetny dopocet: zada se konecna cena s DPH za celou radku, appka z ni
  // dopocita cenu za jednotku bez DPH (co je pole, ktere se skutecne uklada).
  // Behem psani se NEZAOKROUHLUJE (aby cislo neposkakovalo pod rukama) -
  // zaokrouhleni na haleře resi az onBlur primo u pole.
  function setTotalInclVat(index: number, totalInclVat: number) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const baseTotal = totalInclVat / (1 + it.vatRatePercent / 100);
        const qty = it.quantity || 1;
        return { ...it, unitPrice: baseTotal / qty };
      })
    );
  }

  function handlePartnerSelect(partnerId: string) {
    setSelectedPartnerId(partnerId);
    if (!partnerId) return;
    const partner = existingPartners.find((p) => p.id === partnerId);
    if (!partner) return;
    setIcoInput(partner.ico ?? "");
    setCustomerName(partner.name);
    setCustomerAddress(partner.address ?? "");
    setCustomerDic(partner.dic ?? "");
    setAresStatus(null);
  }

  function handleAresLookup() {
    setAresStatus({ text: "Načítám z ARES…", ok: true });
    startTransition(async () => {
      const result = await lookupAres(icoInput);
      if (result.error) {
        setAresStatus({ text: result.error, ok: false });
        return;
      }
      setCustomerName(result.name ?? "");
      setCustomerAddress(result.address ?? "");
      setCustomerDic(result.dic ?? "");
      setAresStatus({ text: "Načteno z ARES ✓", ok: true });
    });
  }

  const documentNumber = document?.document_number ?? suggestedNumber;
  const suggestedVs = documentNumber.replace(/\D/g, "");

  return (
    <form action={saveInvoice} className="max-w-4xl space-y-6">
      {document ? <input type="hidden" name="id" value={document.id} /> : null}
      <input type="hidden" name="document_number" value={documentNumber} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="paid" value={paid ? "true" : "false"} />
      <input
        type="hidden"
        name="bank_account_label"
        value={selectedAccount ? `${selectedAccount.name} ${selectedAccount.account_number}` : ""}
      />
      <input type="hidden" name="bank_iban" value={selectedAccount?.iban ?? ""} />

      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
        Číslo faktury: <span className="font-semibold text-[#1e3a5f]">{documentNumber}</span>
      </div>

      {/* ODBĚRATEL */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Odběratel</h2>

        {existingPartners.length > 0 ? (
          <label className="block mb-3 max-w-sm">
            <span className="block text-xs font-medium text-slate-500 mb-1">
              Už jste fakturovali – vybrat uloženého odběratele
            </span>
            <select
              value={selectedPartnerId}
              onChange={(e) => handlePartnerSelect(e.target.value)}
              className={inputClass}
            >
              <option value="">— nový odběratel —</option>
              {existingPartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.ico ? `(IČO ${p.ico})` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-end gap-2 mb-3">
          <label className="text-xs flex-1 max-w-xs">
            <span className="block text-slate-500 mb-1">IČO</span>
            <input
              value={icoInput}
              onChange={(e) => setIcoInput(e.target.value)}
              placeholder="12345678"
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={handleAresLookup}
            disabled={isPending}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Načíst z ARES
          </button>
          {aresStatus ? (
            <span className={`text-xs ${aresStatus.ok ? "text-green-600" : "text-red-600"}`}>
              {aresStatus.text}
            </span>
          ) : null}
        </div>
        <input type="hidden" name="customer_ico" value={icoInput} />

        <div className="grid grid-cols-2 gap-4">
          {field(
            "Název / jméno",
            <input
              name="customer_name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={inputClass}
            />
          )}
          {field(
            "DIČ",
            <input
              name="customer_dic"
              value={customerDic}
              onChange={(e) => setCustomerDic(e.target.value)}
              className={inputClass}
            />
          )}
        </div>
        <div className="mt-4">
          {field(
            "Adresa",
            <textarea
              name="customer_address"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              rows={2}
              className={inputClass}
            />
          )}
        </div>
      </div>

      {/* DATUMY A PLATBA */}
      <div className="grid grid-cols-4 gap-4">
        {field(
          "Datum vystavení",
          <input
            type="date"
            name="issue_date"
            defaultValue={document?.issue_date ?? todayISO()}
            className={inputClass}
          />
        )}
        {field(
          "DUZP",
          <input
            type="date"
            name="taxable_supply_date"
            defaultValue={document?.taxable_supply_date ?? todayISO()}
            className={inputClass}
          />
        )}
        {field(
          "Datum splatnosti",
          <input
            type="date"
            name="due_date"
            defaultValue={document?.due_date ?? addDaysISO(todayISO(), 7)}
            className={inputClass}
          />
        )}
        {field(
          "Variabilní symbol",
          <input
            name="variable_symbol"
            defaultValue={document?.variable_symbol ?? suggestedVs}
            className={inputClass}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 items-end">
        {field(
          "Způsob úhrady",
          <select name="payment_method" defaultValue={document?.payment_method ?? "prevod"} className={inputClass}>
            <option value="prevod">Převod</option>
            <option value="hotovost">Hotovost</option>
            <option value="karta">Karta</option>
            <option value="ostatni">Ostatní</option>
          </select>
        )}
        {field(
          "Bankovní účet (pro QR platbu)",
          <select
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            className={inputClass}
          >
            {bankAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} – {acc.account_number}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700 pb-1.5">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Uhrazeno
        </label>
      </div>

      {/* POLOŽKY */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Položky</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-3 py-2 font-medium">Popis</th>
                <th className="px-3 py-2 font-medium w-20">Množ.</th>
                <th className="px-3 py-2 font-medium w-20">MJ</th>
                <th className="px-3 py-2 font-medium w-40">Cena/j.</th>
                <th className="px-3 py-2 font-medium w-24">DPH %</th>
                <th className="px-3 py-2 font-medium w-28 text-right">Celkem</th>
                <th className="px-3 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const lineTotal = calcLineTotal(it);
                return (
                  <tr key={idx} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-1.5">
                      <input
                        value={it.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        className={inputClass}
                        placeholder="Popis položky"
                        list="popis-napoveda"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={it.quantity === 0 ? "" : it.quantity}
                        onChange={(e) =>
                          updateItem(idx, {
                            quantity: e.target.value === "" ? 0 : Number(e.target.value),
                          })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={it.unit}
                        onChange={(e) => updateItem(idx, { unit: e.target.value })}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={
                          editing?.idx === idx && editing.field === "unitPrice"
                            ? editing.raw
                            : it.unitPrice === 0
                              ? ""
                              : Math.round(it.unitPrice * 100) / 100
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          setEditing({ idx, field: "unitPrice", raw });
                          const num = raw === "" ? 0 : Number(raw);
                          if (!Number.isNaN(num)) updateItem(idx, { unitPrice: num });
                        }}
                        onBlur={() => setEditing(null)}
                        placeholder="0"
                        className={inputClass}
                      />
                      <div className="text-[10px] text-slate-400 mt-0.5">cena bez DPH</div>
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={it.vatRatePercent}
                        onChange={(e) => updateItem(idx, { vatRatePercent: Number(e.target.value) })}
                        className={inputClass}
                      >
                        <option value={21}>21</option>
                        <option value={12}>12</option>
                        <option value={0}>0</option>
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={
                          editing?.idx === idx && editing.field === "total"
                            ? editing.raw
                            : lineTotal.total === 0
                              ? ""
                              : Math.round(lineTotal.total * 100) / 100
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          setEditing({ idx, field: "total", raw });
                          const num = raw === "" ? 0 : Number(raw);
                          if (!Number.isNaN(num)) setTotalInclVat(idx, num);
                        }}
                        onBlur={() => setEditing(null)}
                        placeholder="0"
                        className={`${inputClass} text-right font-medium`}
                      />
                      <div className="text-[10px] text-slate-400 mt-0.5 text-right">celkem s DPH</div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 text-xs text-[#1e3a5f] hover:underline"
        >
          + Přidat položku
        </button>
      </div>

      {/* REKAPITULACE */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 max-w-sm ml-auto text-sm">
        {Object.entries(totals.byRate).map(([rate, v]) => (
          <div key={rate} className="flex justify-between text-slate-600">
            <span>DPH {rate} %</span>
            <span>
              Zákl. {formatCurrency(v.base)} · DPH {formatCurrency(v.vat)}
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t border-slate-200 mt-2 pt-2">
          <span>Celkem bez DPH</span>
          <span>{formatCurrency(totals.base)}</span>
        </div>
        <div className="flex justify-between">
          <span>DPH</span>
          <span>{formatCurrency(totals.vat)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-[#1e3a5f] mt-1">
          <span>Celkem s DPH</span>
          <span>{formatCurrency(totals.total)}</span>
        </div>
      </div>

      {field(
        "Poznámka",
        <textarea name="note" defaultValue={document?.note ?? ""} rows={2} className={inputClass} />
      )}

      <datalist id="popis-napoveda">
        {descriptionSuggestions.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      <button
        type="submit"
        className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
      >
        Uložit a zobrazit fakturu
      </button>
    </form>
  );
}
