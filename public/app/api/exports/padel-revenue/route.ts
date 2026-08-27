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
  const lastDay = new Date(year, month, 0).getDate();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return { from: `${year}-${pad2(month)}-01`, to: `${year}-${pad2(month)}-${pad2(lastDay)}` };
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

  const [
    { data: revenueDocs, error: revenueError },
    { data: expenseDocs, error: expenseError },
    { data: csobTx, error: csobError },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("document_number,issue_date,revenue_source,variable_symbol,amount_excl_vat,vat_amount,amount_total,status")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .eq("direction", "vydany")
      .eq("is_archived", false)
      .eq("external_source", "padel-kalendar")
      .gte("issue_date", from)
      .lte("issue_date", to)
      .order("issue_date"),
    supabase
      .from("documents")
      .select("document_number,issue_date,amount_excl_vat,vat_amount,amount_total,status,partner_ico,business_partners(name),categories(name)")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .eq("direction", "prijaty")
      .eq("is_archived", false)
      .gte("issue_date", from)
      .lte("issue_date", to)
      .order("issue_date"),
    supabase
      .from("bank_transactions")
      .select("transaction_date,direction,amount,currency,counterparty_name,variable_symbol,message_for_recipient")
      .eq("company_id", DEFAULT_COMPANY_ID)
      .gte("transaction_date", from)
      .lte("transaction_date", to)
      .order("transaction_date"),
  ]);

  if (revenueError || expenseError || csobError) {
    return NextResponse.json(
      { error: (revenueError ?? expenseError ?? csobError)?.message },
      { status: 500 }
    );
  }

  const header = [
    "Typ",
    "Datum",
    "Doklad",
    "Partner / zdroj platby",
    "Kategorie / VS",
    "Zaklad DPH",
    "DPH",
    "Celkem s DPH",
    "Stav",
  ].join(";");

  const revenueRows = (revenueDocs ?? []).map((d) =>
    [
      "Prijem",
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

  const expenseRows = (expenseDocs ?? []).map((d) => {
    const partnerName =
      (d as unknown as { business_partners?: { name: string } | null }).business_partners?.name ??
      d.partner_ico ??
      "";
    const categoryName =
      (d as unknown as { categories?: { name: string } | null }).categories?.name ?? "";
    return [
      "Vydaj",
      d.issue_date ?? "",
      d.document_number ?? "",
      partnerName,
      categoryName,
      String(d.amount_excl_vat),
      String(d.vat_amount),
      String(d.amount_total),
      d.status,
    ]
      .map((v) => csvEscape(String(v)))
      .join(";");
  });

  const revenueTotalExclVat = (revenueDocs ?? []).reduce((s, d) => s + Number(d.amount_excl_vat), 0);
  const revenueTotalVat = (revenueDocs ?? []).reduce((s, d) => s + Number(d.vat_amount), 0);
  const revenueTotalIncVat = (revenueDocs ?? []).reduce((s, d) => s + Number(d.amount_total), 0);
  const revenueTotalRow = [
    "Prijem", "", "CELKEM PRIJMY", "", "",
    String(revenueTotalExclVat), String(revenueTotalVat), String(revenueTotalIncVat), "",
  ].join(";");

  const expenseTotalExclVat = (expenseDocs ?? []).reduce((s, d) => s + Number(d.amount_excl_vat), 0);
  const expenseTotalVat = (expenseDocs ?? []).reduce((s, d) => s + Number(d.vat_amount), 0);
  const expenseTotalIncVat = (expenseDocs ?? []).reduce((s, d) => s + Number(d.amount_total), 0);
  const expenseTotalRow = [
    "Vydaj", "", "CELKEM VYDAJE", "", "",
    String(expenseTotalExclVat), String(expenseTotalVat), String(expenseTotalIncVat), "",
  ].join(";");

  const csobRows = (csobTx ?? []).map((tx) => {
    const signedAmount = tx.direction === "odchozi" ? -Number(tx.amount) : Number(tx.amount);
    return [
      "CSOB vypis",
      tx.transaction_date ?? "",
      "",
      tx.counterparty_name ?? "",
      tx.variable_symbol ?? "",
      "",
      "",
      String(signedAmount),
      "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(";");
  });

  const csv = [
    header,
    ...revenueRows,
    revenueTotalRow,
    ...expenseRows,
    expenseTotalRow,
    ...csobRows,
  ].join("\n");
  const bom = "\uFEFF"; // aby Excel spravne rozpoznal UTF-8 s ceskymi znaky

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="podklady-ucetni-${monthStr}.csv"`,
    },
  });
}
