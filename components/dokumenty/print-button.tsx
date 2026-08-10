"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f] print:hidden"
    >
      🖨️ Tisk / uložit jako PDF
    </button>
  );
}
