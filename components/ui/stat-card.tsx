export function StatCard({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "orange" | "red";
  hint?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "text-[#1e3a5f]",
    green: "text-green-600",
    orange: "text-orange-600",
    red: "text-red-600",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}
