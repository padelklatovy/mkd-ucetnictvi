import { NextResponse } from "next/server";
import { syncPadelReservations, syncFioBarPayments } from "@/lib/integrations/padel-sync";

export const dynamic = "force-dynamic";

// Denni cron (Vercel Cron) - stahne "vcerejsi" zaplacene rezervace i platby
// na miste (barovy QR, VS 406). Chraneno CRON_SECRET, ktery Vercel od ledna
// 2026 sam automaticky vytvari a posila jako "Authorization: Bearer <CRON_SECRET>"
// - neni potreba ho rucne nastavovat v Environment Variables.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10);

  try {
    const [reservations, barPayments] = await Promise.all([
      syncPadelReservations(dateStr, dateStr),
      syncFioBarPayments(dateStr, dateStr),
    ]);
    return NextResponse.json({ ok: true, reservations, barPayments });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
