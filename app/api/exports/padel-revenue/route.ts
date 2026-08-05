import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COMPANY_ID } from "@/lib/config";

export const dynamic = "force-dynamic";

const sourceLabels: Record<string, string> = {
  fio: "Fio - sparovano s rezervaci",
  fio_vs406: "Fio - platba na miste (barovy QR, VS 406)",
};

function monthRange(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function csvEscape(value: string) {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthStr = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const { from, to } = monthRange(monthStr);

  const supabase = await createClient();
  const { data: docs, error } = await supabase
    .from("documents")
    .select("document_number,issue_date,revenue_source,variable_symbol,amount_excl_vat,vat_amount,amount_total,status")
    .eq("company_id", DEFAULT_COMPANY_ID)
    .eq("direction", "vydany")
    .eq("external_source", "padel-kalendar")
    .gte("issue_date", from)
    .lte("issue_date", to)
    .order("issue_date");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "Datum",
    "Doklad",
    "Zdroj platby",
    "Variabilni symbol",
    "Zaklad DPH",
    "DPH 12 procent",
    "Celkem s DPH",
    "Stav",
  ].join(";");

  const rows = (docs ?? []).map((d) =>
    [
      d.issue_date ?? "",
      d.document_number ?? "",
      d.revenue_source ? sourceLabels[d.revenue_source] ?? d.revenue_source : "",
      d.variable_symbol ?? "",
      String(d.amount_excl_vat),
      String(d.vat_amount),
      String(d.amount_total),
      d.status,
    ]
      .map((v) => csvEscape(String(v)))
      .join(";")
  );

  const totalExclVat = (docs ?? []).reduce((s, d) => s + Number(d.amount_excl_vat), 0);
  const totalVat = (docs ?? []).reduce((s, d) => s + Number(d.vat_amount), 0);
  const totalIncVat = (docs ?? []).reduce((s, d) => s + Number(d.amount_total), 0);
  const totalRow = ["", "CELKEM", "", "", String(totalExclVat), String(totalVat), String(totalIncVat), ""].join(
    ";"
  );

  const csv = [header, ...rows, totalRow].join("\n");
  const bom = "\uFEFF"; // aby Excel spravne rozpoznal UTF-8 s ceskymi znaky

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trzby-kurty-${monthStr}.csv"`,
    },
  });
}
