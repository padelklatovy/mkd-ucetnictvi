"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

const monthNames = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

function monthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -3; i < 15; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value, label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts.reverse();
}

function labelFor(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  return `${monthNames[month - 1]} ${year}`;
}

export function MonthSwitcher({
  monthStr,
  prevMonth,
  nextMonth,
}: {
  monthStr: string;
  prevMonth: string;
  nextMonth: string;
}) {
  const router = useRouter();

  return (
    <div className="mb-6 flex items-center gap-2">
      <Link
        href={`/exporty?month=${prevMonth}`}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        aria-label="Předchozí měsíc"
      >
        ◀
      </Link>

      <select
        value={monthStr}
        onChange={(e) => router.push(`/exporty?month=${e.target.value}`)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
      >
        {monthOptions().some((o) => o.value === monthStr) ? null : (
          <option value={monthStr}>{labelFor(monthStr)}</option>
        )}
        {monthOptions().map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <Link
        href={`/exporty?month=${nextMonth}`}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        aria-label="Následující měsíc"
      >
        ▶
      </Link>
    </div>
  );
}
