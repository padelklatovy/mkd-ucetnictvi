import { updatePassword } from "@/app/auth/actions";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]";

export default async function NoveHesloPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1e3a5f] px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-lg font-semibold text-slate-900">Nové heslo</h1>
        <p className="text-xs text-slate-500 mt-1 mb-6">MKD Účetnictví</p>

        {error ? (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <form action={updatePassword} className="space-y-3">
          <input
            type="password"
            name="password"
            placeholder="Nové heslo (min. 6 znaků)"
            required
            minLength={6}
            className={inputClass}
          />
          <button
            type="submit"
            className="w-full rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
          >
            Nastavit nové heslo
          </button>
        </form>
      </div>
    </div>
  );
}
