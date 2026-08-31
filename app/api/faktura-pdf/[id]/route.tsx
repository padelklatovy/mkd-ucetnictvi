import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { generateSpdPayload, type InvoiceLineItem } from "@/lib/utils/invoice";
import { InvoicePdfDocument } from "@/components/dokumenty/invoice-pdf-document";

export const dynamic = "force-dynamic";

const paymentMethodLabels: Record<string, string> = {
  prevod: "Převodem",
  hotovost: "Hotově",
  karta: "Kartou",
  ostatni: "Ostatní",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: document }, { data: lineItems }, { data: company }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase.from("document_line_items").select("*").eq("document_id", id).order("position"),
    supabase.from("companies").select("*").limit(1).maybeSingle(),
  ]);

  if (!document || !company) {
    return NextResponse.json({ error: "Faktura nenalezena." }, { status: 404 });
  }

  const items: InvoiceLineItem[] = (lineItems ?? []).map((it) => ({
    description: it.description,
    quantity: Number(it.quantity),
    unit: it.unit,
    unitPrice: Number(it.unit_price),
    vatRatePercent: Number(it.vat_rate_percent),
  }));

  let qrDataUrl: string | null = null;
  if (document.payment_iban && document.variable_symbol) {
    const spd = generateSpdPayload(
      document.payment_iban,
      Number(document.amount_total),
      document.variable_symbol,
      `Faktura ${document.document_number}`
    );
    try {
      qrDataUrl = await QRCode.toDataURL(spd, { width: 200, margin: 1 });
    } catch {
      qrDataUrl = null;
    }
  }

  const placeOfIssue = company.address
    ? company.address.split(",").pop()?.trim().replace(/^\d{3}\s?\d{2}\s+/, "") ?? null
    : null;
  const paymentMethodLabel = document.payment_method
    ? paymentMethodLabels[document.payment_method] ?? document.payment_method
    : null;

  const buffer = await renderToBuffer(
    <InvoicePdfDocument
      document={document}
      items={items}
      company={company}
      qrDataUrl={qrDataUrl}
      placeOfIssue={placeOfIssue}
      paymentMethodLabel={paymentMethodLabel}
    />
  );

  const fileName = `faktura-${(document.document_number ?? "bez-cisla").replace(/\//g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
