export default function Placeholder() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-2">Párování</h1>
      <p className="text-sm text-slate-500 mb-6">Návrh spárování dokladů s bankovními transakcemi podle částky, VS a data.</p>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
        Tento modul je naplánován na další etapu vývoje.
      </div>
      <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        Tržby za pronájem kurtu se párují automaticky – viz Vydané doklady a Exporty. Tenhle
        obecný modul je pro budoucí ruční párování jiných bankovních účtů/plateb (např. běžné
        firemní náklady), kde automatický import zatím není.
      </div>
    </div>
  );
}
