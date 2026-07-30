import { signIn, signUp } from "@/app/auth/actions";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1e3a5f] px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-lg font-semibold text-slate-900">MKD Účetnictví</h1>
        <p className="text-xs text-slate-500 mt-1 mb-6">MKD Enterprise, s.r.o.</p>

        {error ? (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-4 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {message}
          </div>
        ) : null}

        <form action={signIn} className="space-y-3">
          <input type="email" name="email" placeholder="E-mail" required className={inputClass} />
          <input
            type="password"
            name="password"
            placeholder="Heslo"
            required
            className={inputClass}
          />
          <button
            type="submit"
            className="w-full rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#14293f]"
          >
            Přihlásit se
          </button>
        </form>

        <details className="mt-6">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
            Ještě nemáte účet? Zaregistrovat se
          </summary>
          <form action={signUp} className="space-y-3 mt-3">
            <input type="text" name="full_name" placeholder="Celé jméno" className={inputClass} />
            <input type="email" name="email" placeholder="E-mail" required className={inputClass} />
            <input
              type="password"
              name="password"
              placeholder="Heslo (min. 6 znaků)"
              required
              minLength={6}
              className={inputClass}
            />
            <button
              type="submit"
              className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Vytvořit účet
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
