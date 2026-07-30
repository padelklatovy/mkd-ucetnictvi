import type { Enums } from "@/lib/types/database.types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Model lze zmenit pres env promennou, kdyby se v budoucnu zmenilo doporuceni
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export type ExtractedDocumentData = {
  partner_name: string | null;
  partner_ico: string | null;
  partner_dic: string | null;
  document_number: string | null;
  issue_date: string | null;
  taxable_supply_date: string | null;
  due_date: string | null;
  variable_symbol: string | null;
  currency: string | null;
  amount_excl_vat: number | null;
  vat_amount: number | null;
  amount_total: number | null;
  vat_rate_percent: number | null;
  vat_rate_suggested: Enums<"vat_rate"> | null;
  note: string | null;
};

const EXTRACTION_SYSTEM_PROMPT = `Jsi asistent pro vytezovani udaju z ceskych ucetnich dokladu (faktury, ucty, doklady).
Z prilozeneho obrazku/PDF dokladu vytahni nasledujici udaje a odpovez VYHRADNE JSON objektem,
bez jakehokoli uvodniho textu, komentare nebo markdown bloku. Pokud si nejsi jisty nebo udaj
na dokladu neni, pouzij null - nikdy si nic nevymyslej.

Format odpovedi (presne tyto klice):
{
  "partner_name": string|null,        // nazev dodavatele/prodejce
  "partner_ico": string|null,         // ICO (jen cislice)
  "partner_dic": string|null,         // DIC (napr. CZ12345678)
  "document_number": string|null,     // cislo dokladu/faktury
  "issue_date": string|null,          // datum vystaveni ve formatu YYYY-MM-DD
  "taxable_supply_date": string|null, // DUZP ve formatu YYYY-MM-DD, pokud je uvedeno
  "due_date": string|null,            // datum splatnosti YYYY-MM-DD
  "variable_symbol": string|null,     // variabilni symbol
  "currency": string|null,            // ISO kod meny, napr. CZK, EUR
  "amount_excl_vat": number|null,     // castka bez DPH (desetinne cislo, tecka jako oddelovac)
  "vat_amount": number|null,          // castka DPH
  "amount_total": number|null,        // castka celkem s DPH
  "vat_rate_percent": number|null,    // hlavni sazba DPH v procentech, napr. 21
  "note": string|null                 // strucna poznamka, pokud je neco nejasne nebo doklad obsahuje vice sazeb DPH
}`;

function mapVatRate(percent: number | null): Enums<"vat_rate"> | null {
  if (percent === null) return null;
  if (percent === 0) return "osvobozeno";
  if (percent >= 20) return "zakladni";
  if (percent >= 13) return "snizena";
  if (percent > 0) return "druha_snizena";
  return "mimo_dph";
}

export async function extractDocumentDataFromFile(
  base64Data: string,
  mimeType: string
): Promise<ExtractedDocumentData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chybí ANTHROPIC_API_KEY v prostředí serveru. Přidejte klíč do .env.local (viz README)."
    );
  }

  const isPdf = mimeType === "application/pdf";
  const contentBlock = isPdf
    ? {
        type: "document" as const,
        source: { type: "base64" as const, media_type: "application/pdf", data: base64Data },
      }
    : {
        type: "image" as const,
        source: { type: "base64" as const, media_type: mimeType, data: base64Data },
      };

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: "Vytáhni údaje z tohoto dokladu podle instrukcí v system promptu." },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API chyba (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
  const rawText: string = textBlock?.text ?? "{}";

  // Model muze i pri instrukci obcas obalit odpoved do ```json bloku - osetrime to
  const cleaned = rawText.replace(/```json\s*|```/g, "").trim();

  let parsed: Partial<ExtractedDocumentData>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Nepodařilo se rozparsovat odpověď AI. Zkuste to prosím znovu.");
  }

  const vatPercent =
    typeof parsed.vat_rate_percent === "number" ? parsed.vat_rate_percent : null;

  return {
    partner_name: parsed.partner_name ?? null,
    partner_ico: parsed.partner_ico ?? null,
    partner_dic: parsed.partner_dic ?? null,
    document_number: parsed.document_number ?? null,
    issue_date: parsed.issue_date ?? null,
    taxable_supply_date: parsed.taxable_supply_date ?? null,
    due_date: parsed.due_date ?? null,
    variable_symbol: parsed.variable_symbol ?? null,
    currency: parsed.currency ?? null,
    amount_excl_vat: typeof parsed.amount_excl_vat === "number" ? parsed.amount_excl_vat : null,
    vat_amount: typeof parsed.vat_amount === "number" ? parsed.vat_amount : null,
    amount_total: typeof parsed.amount_total === "number" ? parsed.amount_total : null,
    vat_rate_percent: vatPercent,
    vat_rate_suggested: mapVatRate(vatPercent),
    note: parsed.note ?? null,
  };
}
