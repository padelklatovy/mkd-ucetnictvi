import { NextResponse } from "next/server";
import { syncPadelReservations } from "@/lib/integrations/padel-sync";

export const dynamic = "force-dynamic";

// Volitelny denni cron (Vercel Cron) - stahne "vcerejsi" zaplacene rezervace.
// Chraneno CRON_SECRET, ktery Vercel automaticky posila jako
// "Authorization: Bearer <CRON_SECRET>" pri planovanem spusteni.
// Pokud CRON_SECRET neni nastaveny, endpoint odmita vsechny pozadavky
// (bezpecny default - musi se vedome zapnout).
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
    const result = await syncPadelReservations(dateStr, dateStr);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
