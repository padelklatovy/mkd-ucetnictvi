import type { ParsedBankRow } from "@/lib/integrations/csob-csv-import";

const DATE_RE = /^(\d{2})\.(\d{2})\.\s+(.*)$/;
const ACCOUNT_RE = /^[\d-]+\/\d{4}$/;

const FOOTER_PATTERNS = [
  "Prosíme Vás", "VÝPIS Z ÚČTU", "Strana:", "Období:", "Účet:", "Název účtu:",
  "Datum", "Valuta", "Označení platby", "Protiúčet nebo poznámka", "Název protiúčtu",
  "VS KS SS", "Identifikace", "Přehled pohybů", "Souhrnné informace",
  "Počet kreditních", "Počet debetních", "Rok/č.", "BIC:", "IBAN:", "Typ účtu:",
  "Měna:", "Frekvence:", "Poč. úr.", "Kon. úr.", "Pobočka:", "Kontakt:", "E-mail:",
  "Československá obchodní banka", "zapsaná v obchodním", "Pokud při zúčtování",
  "Vklad na tomto účtu", "o systému pojištění", "Počáteční zůstatek", "Konečný zůstatek",
  "Celkové příjmy", "Celkové výdaje", "MKD Enterprise", "Voříškova", "339 01",
];

function isFooter(line: string): boolean {
  const s = line.trim();
  if (s === "" || s === "X") return true;
  return FOOTER_PATTERNS.some((p) => s.startsWith(p));
}

function parseCzechAmount(raw: string): number {
  const asIs = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (!Number.isNaN(asIs) && Math.abs(asIs) < 10_000_000) return asIs;
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type RawRecord = {
  day: string;
  month: string;
  amount: string | null;
  name: string | null;
  account: string | null;
  vs: string | null;
  notes: string[];
};

// Rekonstruuje "layout" text z PDF pomoci x/y pozic textovych polozek -
// napodobuje chovani `pdftotext -layout`, ale cistym JS (funguje na Vercelu,
// zadna zavislost na poppler-utils). Overeno na realnem CSOB vypisu (274/274
// transakci, presny soucet se souhrnem na vypisu).
export async function parseCsobPdf(buffer: Buffer): Promise<{
  rows: ParsedBankRow[];
  skippedRows: number;
}> {
  // legacy build funguje v Node bez DOM
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data, useWorkerFetch: false }).promise;

  const textLines: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const lines = new Map<number, { str: string; x: number; width: number }[]>();
    for (const item of content.items as { str: string; transform: number[]; width: number }[]) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push({ str: item.str, x: item.transform[4], width: item.width });
    }

    const sortedYs = [...lines.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = lines.get(y)!.sort((a, b) => a.x - b.x);
      let line = "";
      let lastEndX: number | null = null;
      for (const it of items) {
        if (lastEndX !== null) {
          const gap = it.x - lastEndX;
          const spaces = gap > 8 ? "  " : gap > 2 ? " " : "";
          line += spaces;
        }
        line += it.str;
        lastEndX = it.x + it.width;
      }
      textLines.push(line);
    }
  }

  const records: RawRecord[] = [];
  let current: RawRecord | null = null;

  for (const rawLine of textLines) {
    if (isFooter(rawLine)) continue;
    const parts = rawLine.trim().split(/\s{2,}/);
    const m = DATE_RE.exec(parts[0]);
    if (m && parts.length >= 3) {
      if (current) records.push(current);
      const [, day, month] = m;
      const rest = parts.slice(1);
      const amount = rest.length >= 2 ? rest[rest.length - 2] : null;
      const name = rest.length >= 4 ? rest[rest.length - 4] : null;
      current = { day, month, amount, name, account: null, vs: null, notes: [] };
    } else {
      if (!current) continue;
      if (current.account === null && ACCOUNT_RE.test(parts[0])) {
        current.account = parts[0];
        if (parts.length > 1) current.vs = parts[1];
      } else {
        current.notes.push(parts.join(" "));
      }
    }
  }
  if (current) records.push(current);

  const rows: ParsedBankRow[] = [];
  let skipped = 0;

  for (const r of records) {
    if (!r.amount) {
      skipped++;
      continue;
    }
    const signedAmount = parseCzechAmount(r.amount);
    if (signedAmount === 0) {
      skipped++;
      continue;
    }
    const transactionDate = `2026-${r.month}-${r.day}`;

    let counterpartyName: string | null = r.name;
    if (!counterpartyName) {
      for (const note of r.notes) {
        if (note.startsWith("Místo:")) {
          counterpartyName = note.replace("Místo:", "").trim();
          break;
        }
      }
    }

    const messageForRecipient = r.notes.length ? r.notes.join(" | ").slice(0, 500) : null;
    const hashInput = [transactionDate, signedAmount, r.account, r.vs, messageForRecipient].join(
      "|"
    );
    const importHash = await sha256Hex(hashInput);

    rows.push({
      transactionDate,
      amount: Math.abs(signedAmount),
      direction: signedAmount >= 0 ? "prichozi" : "odchozi",
      currency: "CZK",
      counterpartyName,
      counterpartyAccount: r.account,
      variableSymbol: r.vs,
      messageForRecipient,
      note: null,
      importHash,
    });
  }

  return { rows, skippedRows: skipped };
}
