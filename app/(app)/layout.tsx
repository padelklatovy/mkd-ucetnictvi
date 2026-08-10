import { Sidebar } from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: companyAccessCount } = await supabase
    .from("company_users")
    .select("id", { count: "exact", head: true });

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full">
      <Sidebar userEmail={user?.email} />
      <main className="flex-1 min-w-0 p-4 md:p-8">
        {companyAccessCount === 0 ? (
          <div className="max-w-lg rounded-lg border border-orange-200 bg-orange-50 p-6 text-sm text-orange-800">
            Váš účet ({user?.email}) zatím nemá přiřazený přístup k žádné firmě. Požádejte
            administrátora, ať vás přidá do tabulky <code>company_users</code> pro MKD
            Enterprise, s.r.o.
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
