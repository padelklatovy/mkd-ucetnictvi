import { createClient } from "@/lib/supabase/server";

type PadelReservationRow = {
  reservation_id: string;
  reservation_date: string;
  start_time: string | null;
  end_time: string | null;
  amount: number;
  variable_symbol: string | null;
  payment_method: string | null;
  customer_name: string | null;
  venue_name: string | null;
  court_name: string | null;
  paid_at: string | null;
};

export type PadelSyncResult = {
  fetched: number;
  imported: number;
  skipped: number;
  errors: { reservationId: string; message: string }[];
};

// Nas vlastni sdileny tajny klic pro RPC import_padel_reservation
// (viz migrace 007_import_padel_reservation_rpc.sql) - musi odpovidat.
const IMPORT_SECRET = process.env.PADEL_IMPORT_SECRET;

async function fetchPadelReservations(
  dateFrom: string,
  dateTo: string
): Promise<PadelReservationRow[]> {
  const url = process.env.PADEL_SUPABASE_URL;
  const anonKey = process.env.PADEL_ANON_KEY;
  const exportSecret = process.env.PADEL_EXPORT_SECRET;

  if (!url || !anonKey || !exportSecret) {
    throw new Error(
      "Chybí PADEL_SUPABASE_URL, PADEL_ANON_KEY nebo PADEL_EXPORT_SECRET v prostředí serveru."
    );
  }

  const res = await fetch(`${url}/rest/v1/rpc/get_accounting_export`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_secret: exportSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rezervační systém odmítl požadavek (${res.status}): ${text.slice(0, 300)}`);
  }

  return res.json();
}

// Stahne zaplacene rezervace za obdobi a ulozi je jako Vydane doklady.
// Idempotentni - opakovane spusteni pro stejne obdobi jen aktualizuje existujici
// zaznamy (podle reservation_id), nic se neduplikuje.
export async function syncPadelReservations(
  dateFrom: string,
  dateTo: string
): Promise<PadelSyncResult> {
  if (!IMPORT_SECRET) {
    throw new Error("Chybí PADEL_IMPORT_SECRET v prostředí serveru.");
  }

  const rows = await fetchPadelReservations(dateFrom, dateTo);
  const supabase = await createClient();

  const result: PadelSyncResult = { fetched: rows.length, imported: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    // castka 0 = typicky rezervace kryta clenstvim/kreditem, kde uz byla trzba
    // zauctovana jinde (napr. pri prodeji clenstvi) - nezaklada se novy doklad
    if (!row.amount || row.amount <= 0) {
      result.skipped += 1;
      continue;
    }

    const { error } = await supabase.rpc("import_padel_reservation", {
      p_reservation_id: row.reservation_id,
      p_reservation_date: row.reservation_date,
      p_start_time: row.start_time,
      p_end_time: row.end_time,
      p_amount: row.amount,
      p_variable_symbol: row.variable_symbol,
      p_payment_method: row.payment_method,
      p_customer_name: row.customer_name,
      p_venue_name: row.venue_name,
      p_court_name: row.court_name,
      p_paid_at: row.paid_at,
      p_secret: IMPORT_SECRET,
    });

    if (error) {
      result.errors.push({ reservationId: row.reservation_id, message: error.message });
    } else {
      result.imported += 1;
    }
  }

  return result;
}
