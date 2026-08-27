"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";
import { parseCsobCsv } from "@/lib/integrations/csob-csv-import";
import { parseCsobPdf } from "@/lib/integrations/csob-pdf-import";

export type CsvImportResult = {
  totalRows: number;
  imported: number;
  duplicates: number;
  skippedRows: number;
  errors: string[];
};

export async function importCsobStatement(formData: FormData): Promise<CsvImportResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    throw new Error("Nebyl vybrán žádný soubor.");
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  let rows;
  let skippedRows;
  if (isPdf) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseCsobPdf(buffer);
    rows = result.rows;
    skippedRows = result.skippedRows;
  } else {
    const text = await file.text();
    const result = await parseCsobCsv(text);
    rows = result.rows;
    skippedRows = result.skippedRows;
  }

  if (rows.length === 0) {
    throw new Error(
      isPdf
        ? "Ze souboru se nepodařilo rozpoznat žádné transakce. Podporovaný formát je PDF výpis z ČSOB internetbankingu (Přehled pohybů na účtu)."
        : "Ze souboru se nepodařilo rozpoznat žádné transakce. Zkontrolujte, že jde o CSV export z ČSOB internetbankingu se sloupci Datum a Objem/Částka."
    );
  }

  const supabase = await createClient();

  // najdeme/vytvorime bankovni ucet pro CSOB
  let { data: account } = await supabase
    .from("bank_accounts")
    .select("id")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .eq("name", "ČSOB")
    .maybeSingle();

  if (!account) {
    const { data: newAccount, error: accountError } = await supabase
      .from("bank_accounts")
      .insert({
        company_id: DEFAULT_COMPANY_ID,
        name: "ČSOB",
        account_number: "250226176/0300",
        currency: "CZK",
      })
      .select("id")
      .single();
    if (accountError) throw new Error(accountError.message);
    account = newAccount;
  }

  const result: CsvImportResult = {
    totalRows: rows.length,
    imported: 0,
    duplicates: 0,
    skippedRows,
    errors: [],
  };

  for (const row of rows) {
    const { error } = await supabase.from("bank_transactions").insert({
      company_id: DEFAULT_COMPANY_ID,
      bank_account_id: account.id,
      transaction_date: row.transactionDate,
      direction: row.direction,
      amount: row.amount,
      currency: row.currency,
      counterparty_name: row.counterpartyName,
      counterparty_account: row.counterpartyAccount,
      variable_symbol: row.variableSymbol,
      message_for_recipient: row.messageForRecipient,
      note: row.note,
      source: "csv",
      import_hash: row.importHash,
    });

    if (error) {
      // duplicitni import_hash = uz naimportovano, nepovazujeme za chybu
      if (error.code === "23505") {
        result.duplicates += 1;
      } else {
        result.errors.push(error.message);
      }
    } else {
      result.imported += 1;
    }
  }

  revalidatePath("/banka");
  revalidatePath("/exporty");
  return result;
}
