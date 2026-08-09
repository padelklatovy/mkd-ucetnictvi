"use client";

import { useRef, useState, useTransition } from "react";
import {
  addCompanyAccess,
  updateCompanyUserRole,
  removeCompanyAccess,
} from "@/app/(app)/nastaveni/actions";
import type { Enums } from "@/lib/types/database.types";

const roleLabels: Record<Enums<"user_role">, string> = {
  administrator: "Administrátor",
  uzivatel: "Uživatel",
  ucetni: "Účetní (jen čtení a export)",
};

export type CompanyUserRow = {
  id: string;
  role: Enums<"user_role">;
  email: string | null;
  fullName: string | null;
};

export function UserAccessPanel({ users }: { users: CompanyUserRow[] }) {
  const [addError, setAddError] = useState<string | null>(null);
  const [isPendingAdd, startAddTransition] = useTransition();
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [isPendingRow, startRowTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    setAddError(null);
    startAddTransition(async () => {
      const result = await addCompanyAccess(formData);
      if (result.error) {
        setAddError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  function handleRoleChange(id: string, role: Enums<"user_role">) {
    setRowErrors((prev) => ({ ...prev, [id]: "" }));
    startRowTransition(async () => {
      const result = await updateCompanyUserRole(id, role);
      if (result.error) setRowErrors((prev) => ({ ...prev, [id]: result.error! }));
    });
  }

  function handleRemove(id: string) {
    setRowErrors((prev) => ({ ...prev, [id]: "" }));
    startRowTransition(async () => {
      const result = await removeCompanyAccess(id);
      if (result.error) setRowErrors((prev) => ({ ...prev, [id]: result.error! }));
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm mb-6">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Kdo má přístup</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-5 py-2 font-medium">E-mail</th>
              <th className="px-5 py-2 font-medium">Jméno</th>
              <th className="px-5 py-2 font-medium">Role</th>
              <th className="px-5 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-2.5">{u.email ?? "—"}</td>
                <td className="px-5 py-2.5 text-slate-500">{u.fullName ?? "—"}</td>
                <td className="px-5 py-2.5">
                  <select
                    value={u.role}
                    disabled={isPendingRow}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as Enums<"user_role">)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    {(Object.keys(roleLabels) as Enums<"user_role">[]).map((r) => (
                      <option key={r} value={r}>
                        {roleLabels[r]}
                      </option>
                    ))}
                  </select>
                  {rowErrors[u.id] ? (
                    <p className="mt-1 text-[11px] text-red-600">{rowErrors[u.id]}</p>
                  ) : null}
                </td>
                <td className="px-5 py-2.5 text-right">
                  <button
                    type="button"
                    disabled={isPendingRow}
                    onClick={() => handleRemove(u.id)}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Odebrat přístup
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-slate-400">
                  Zatím nikdo nemá přístup.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Přidat přístup</h2>
        <p className="text-xs text-slate-500 mb-3">
          Dotyčný se musí nejdřív sám zaregistrovat na přihlašovací stránce appky (e-mail +
          heslo). Pak ho tady přidáte podle e-mailu a zvolíte roli.
        </p>
        <form ref={formRef} action={handleAdd} className="flex flex-wrap items-end gap-3">
          <label className="text-xs">
            <span className="block text-slate-500 mb-1">E-mail</span>
            <input
              type="email"
              name="email"
              required
              placeholder="ucetni@example.cz"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-64"
            />
          </label>
          <label className="text-xs">
            <span className="block text-slate-500 mb-1">Role</span>
            <select
              name="role"
              defaultValue="ucetni"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              {(Object.keys(roleLabels) as Enums<"user_role">[]).map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={isPendingAdd}
            className="rounded-md bg-[#1e3a5f] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#14293f] disabled:opacity-50"
          >
            {isPendingAdd ? "Přidávám…" : "Přidat"}
          </button>
        </form>
        {addError ? <p className="mt-2 text-xs text-red-600">{addError}</p> : null}
      </div>
    </div>
  );
}
