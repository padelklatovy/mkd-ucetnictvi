# MKD Účetnictví

Interní nástroj pro **přípravu podkladů pro účetnictví** společnosti MKD Enterprise, s.r.o.
Nenahrazuje účetní firmu ani daňové poradenství — eviduje doklady, bankovní transakce,
navrhuje jejich spárování a připravuje exporty.

## Technologie

- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS 4
- Supabase (Postgres, Auth, Storage) přes `@supabase/ssr`

## Supabase projekt

- Organizace: **MKD Enterprise** (`mwanbziqfrcpnmxdkxku`)
- Projekt: **ucetnictvi** (`qitlhbajazkiixlqujwx`), region `eu-central-1`
- URL: `https://qitlhbajazkiixlqujwx.supabase.co`

## Lokální spuštění

1. Nainstalujte závislosti:
   ```bash
   npm install
   ```
2. Zkopírujte `.env.local.example` na `.env.local` a doplňte:
   - `NEXT_PUBLIC_SUPABASE_URL` – URL Supabase projektu
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – anon/publishable klíč (Supabase dashboard → Project
     Settings → API)
   - `NEXT_PUBLIC_DEFAULT_COMPANY_ID` – v MVP fázi `11111111-1111-1111-1111-111111111111`
     (demo firma MKD Enterprise, s.r.o.)
3. Spusťte dev server:
   ```bash
   npm run dev
   ```
4. Otevřete `http://localhost:3000` – přesměruje na `/login`.

## Přihlášení a přístup k firmě

Aplikace vyžaduje přihlášení (Supabase Auth, e-mail + heslo). Po registraci se automaticky
vytvoří záznam v tabulce `profiles`, ale **přístup k firmě MKD Enterprise musí přidělit
administrátor ručně** vložením řádku do `company_users`:

```sql
insert into company_users (company_id, user_id, role)
values (
  '11111111-1111-1111-1111-111111111111', -- MKD Enterprise, s.r.o.
  '<uuid uzivatele z auth.users>',
  'administrator' -- nebo 'uzivatel' / 'ucetni'
);
```

UUID uživatele najdete v Supabase dashboardu → Authentication → Users, nebo dotazem:

```sql
select id, email from auth.users where email = 'jmeno@example.com';
```

Bez záznamu v `company_users` uživatel po přihlášení uvidí jen informační hlášku – RLS
politiky mu (správně) nedovolí vidět žádná data.

## Stav vývoje (etapy)

- [x] Etapa 1 – scaffold, DB schéma, RLS, role, audit log, demo data (MKD Enterprise)
- [x] Etapa 2 – Přijaté doklady (CRUD), Přehled (dashboard s reálnými daty)
- [x] Vydané doklady – základní evidence a sledování úhrady
- [x] Autentizace (Supabase Auth, přihlášení/registrace/odhlášení, ochrana rout přes `proxy.ts`)
- [ ] Etapa 3 – Banka: ruční zadání transakcí, CSV import, detekce duplicit
- [ ] Etapa 4 – Párování dokladů s platbami (bodové skóre, potvrzení uživatelem)
- [ ] Etapa 5 – Ke kontrole (přehled nesrovnalostí)
- [ ] Etapa 6 – Nahrávání příloh do Supabase Storage (neveřejný bucket)
- [ ] Etapa 7 – Exporty CSV/XLSX pro účetní firmu
- [ ] Etapa 8 – Napojení na Fio API (datový model už je připraven – `bank_accounts.fio_token_ref`,
      `bank_transactions.source`)

## Databázové tabulky

`companies`, `profiles`, `company_users`, `categories`, `projects`, `business_partners`,
`bank_accounts`, `documents`, `document_files`, `bank_transactions`, `payment_matches`,
`audit_log`. Všechny firemní tabulky mají `company_id` a RLS politiky podle členství
v `company_users` (funkce `user_has_company_access`, `user_company_role`).

## Bezpečnostní poznámky

- Service role klíč Supabase se nikde v kódu frontend/backend nepoužívá – jen anon/publishable
  klíč s RLS.
- Peněžní částky jsou v DB `numeric(14,2)`, ne floating point.
- Mazání dokladů je řešeno přes `is_archived` (soft delete), ne přes fyzické DELETE.
- Import bankovních transakcí má sloupec `import_hash` s `unique` constraintem pro
  detekci duplicit při opakovaném importu (využije se v Etapě 3).
