import Papa from "papaparse";

export type ParsedBankRow = {
  transactionDate: string; // YYYY-MM-DD
  amount: number; // vzdy kladne, smer viz direction
  direction: "prichozi" | "odchozi";
  currency: string;
  counterpartyName: string | null;
  counterpartyAccount: string | null;
  variableSymbol: string | null;
  messageForRecipient: string | null;
  note: string | null;
  importHash: string;
};

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeader(h: string) {
  return stripDiacritics(h.toLowerCase().trim()).replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["datumzauctovani", "datumprovedeni", "datum", "datumtransakce"],
  amount: ["objem", "castka", "amount", "objemvmene", "castkatransakce"],
  currency: ["menaobjemu", "mena", "currency", "menaúctu"],
  counterpartyAccount: ["protiucet", "cislouctu", "ucetprotistrany"],
  counterpartyName: ["nazevprotiuctu", "nazevprotistrany", "obchodnimisto", "nazevpartnera"],
  variableSymbol: ["variabilnisymbol", "vs"],
  message: ["zpravaproprijemce", "zprava", "avpole1", "oznaceni"],
  note: ["poznamka", "typtransakce", "popis"],
};

function findColumn(headers: string[], normalizedHeaders: string[], key: string): string | null {
  const aliases = HEADER_ALIASES[key];
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (aliases.includes(normalizedHeaders[i])) return headers[i];
  }
  return null;
}

function parseCzechAmount(raw: string): number {
  // "1 234,56" nebo "1234.56" nebo "-500,00"
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  // pokud puvodni retezec pouzival tecku jako des. oddelovac (ne tisice), zkusime i tuto varianty
  const asIs = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (!Number.isNaN(asIs) && Math.abs(asIs) < 10_000_000) return asIs;
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

function parseCzechDate(raw: string): string | null {
  const trimmed = raw.trim();
  // DD.MM.YYYY
  const czMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (czMatch) {
    const [, d, m, y] = czMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD uz spravne
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type ParseResult = {
  rows: ParsedBankRow[];
  skippedRows: number;
  detectedColumns: Record<string, string | null>;
};

export async function parseCsobCsv(fileText: string): Promise<ParseResult> {
  const parsed = Papa.parse<Record<string, string>>(fileText, {
    header: true,
    skipEmptyLines: true,
    delimiter: "", // auto-detekce ; nebo ,
  });

  const headers = parsed.meta.fields ?? [];
  const normalizedHeaders = headers.map(normalizeHeader);

  const dateCol = findColumn(headers, normalizedHeaders, "date");
  const amountCol = findColumn(headers, normalizedHeaders, "amount");
  const currencyCol = findColumn(headers, normalizedHeaders, "currency");
  const counterpartyAccountCol = findColumn(headers, normalizedHeaders, "counterpartyAccount");
  const counterpartyNameCol = findColumn(headers, normalizedHeaders, "counterpartyName");
  const vsCol = findColumn(headers, normalizedHeaders, "variableSymbol");
  const messageCol = findColumn(headers, normalizedHeaders, "message");
  const noteCol = findColumn(headers, normalizedHeaders, "note");

  const rows: ParsedBankRow[] = [];
  let skipped = 0;

  for (const record of parsed.data) {
    if (!dateCol || !amountCol) {
      skipped++;
      continue;
    }
    const dateRaw = record[dateCol];
    const amountRaw = record[amountCol];
    if (!dateRaw || !amountRaw) {
      skipped++;
      continue;
    }
    const transactionDate = parseCzechDate(dateRaw);
    if (!transactionDate) {
      skipped++;
      continue;
    }
    const signedAmount = parseCzechAmount(amountRaw);
    if (signedAmount === 0) {
      skipped++;
      continue;
    }

    const counterpartyAccount = counterpartyAccountCol ? record[counterpartyAccountCol] || null : null;
    const counterpartyName = counterpartyNameCol ? record[counterpartyNameCol] || null : null;
    const variableSymbol = vsCol ? record[vsCol] || null : null;
    const messageForRecipient = messageCol ? record[messageCol] || null : null;
    const note = noteCol ? record[noteCol] || null : null;
    const currency = currencyCol ? record[currencyCol] || "CZK" : "CZK";

    const hashInput = [transactionDate, signedAmount, counterpartyAccount, variableSymbol, messageForRecipient]
      .join("|");
    const importHash = await sha256Hex(hashInput);

    rows.push({
      transactionDate,
      amount: Math.abs(signedAmount),
      direction: signedAmount >= 0 ? "prichozi" : "odchozi",
      currency,
      counterpartyName,
      counterpartyAccount,
      variableSymbol,
      messageForRecipient,
      note,
      importHash,
    });
  }

  return {
    rows,
    skippedRows: skipped,
    detectedColumns: {
      date: dateCol,
      amount: amountCol,
      currency: currencyCol,
      counterpartyAccount: counterpartyAccountCol,
      counterpartyName: counterpartyNameCol,
      variableSymbol: vsCol,
      message: messageCol,
      note: noteCol,
    },
  };
}
