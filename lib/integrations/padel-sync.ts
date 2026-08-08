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

// Bez vazby na rezervaci - platba pres staly barovy QR kod (VS 406), identita je
// transaction_id. Zdroj: get_onsite_bar_payments_export na strane rezervacniho systemu.
type FioBarPaymentRow = {
  transaction_id: string;
  transaction_date: string;
  amount: number;
  payer_name: string | null;
  payer_account: string | null;
  variable_symbol: string | null;
  message_for_recipient: string | null;
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

async function fetchFioBarPayments(
  dateFrom: string,
  dateTo: string
): Promise<FioBarPaymentRow[]> {
  const url = process.env.PADEL_SUPABASE_URL;
  const anonKey = process.env.PADEL_ANON_KEY;
  const exportSecret = process.env.PADEL_EXPORT_SECRET;

  if (!url || !anonKey || !exportSecret) {
    throw new Error(
      "Chybí PADEL_SUPABASE_URL, PADEL_ANON_KEY nebo PADEL_EXPORT_SECRET v prostředí serveru."
    );
  }

  const res = await fetch(`${url}/rest/v1/rpc/get_onsite_bar_payments_export`, {
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
    throw new Error(
      `Rezervační systém odmítl požadavek na barové platby (${res.status}): ${text.slice(0, 300)}`
    );
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

// Stahne platby pres staly barovy QR kod (VS 406, bez vazby na rezervaci) a
// ulozi je jako Vydane doklady. Stejne idempotentni jako syncPadelReservations.
export async function syncFioBarPayments(
  dateFrom: string,
  dateTo: string
): Promise<PadelSyncResult> {
  if (!IMPORT_SECRET) {
    throw new Error("Chybí PADEL_IMPORT_SECRET v prostředí serveru.");
  }

  const rows = await fetchFioBarPayments(dateFrom, dateTo);
  const supabase = await createClient();

  const result: PadelSyncResult = { fetched: rows.length, imported: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    if (!row.amount || row.amount <= 0) {
      result.skipped += 1;
      continue;
    }

    const { error } = await supabase.rpc("import_fio_bar_payment", {
      p_fio_transaction_id: row.transaction_id,
      p_transaction_date: row.transaction_date,
      p_amount: row.amount,
      p_payer_name: row.payer_name,
      p_payer_account: row.payer_account,
      p_variable_symbol: row.variable_symbol,
      p_message_for_recipient: row.message_for_recipient,
      p_secret: IMPORT_SECRET,
    });

    if (error) {
      result.errors.push({ reservationId: row.transaction_id, message: error.message });
    } else {
      result.imported += 1;
    }
  }

  return result;
}

export type ReviewItem = {
  kind: "nesparovana_platba" | "neplatba_potvrzena";
  identifier: string;
  occurred_on: string;
  amount: number;
  payer_or_customer: string | null;
  variable_symbol: string | null;
  note: string | null;
};

// Cte-only pohled na nesparovane Fio platby a rezervace, kde platba jeste
// neni potvrzena/sparovana. Zadny import/zapis, jen zobrazeni pro appku.
export async function fetchReviewItems(): Promise<ReviewItem[]> {
  const url = process.env.PADEL_SUPABASE_URL;
  const anonKey = process.env.PADEL_ANON_KEY;
  const exportSecret = process.env.PADEL_EXPORT_SECRET;

  if (!url || !anonKey || !exportSecret) {
    throw new Error(
      "Chybí PADEL_SUPABASE_URL, PADEL_ANON_KEY nebo PADEL_EXPORT_SECRET v prostředí serveru."
    );
  }

  const res = await fetch(`${url}/rest/v1/rpc/get_review_items_export`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_secret: exportSecret }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rezervační systém odmítl požadavek (${res.status}): ${text.slice(0, 300)}`);
  }

  return res.json();
}
