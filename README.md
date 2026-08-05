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

## AI vytěžování dokladů (beta)

U každé nahrané přílohy (PDF/JPG/PNG) je tlačítko **Vytěžit AI**, které pošle soubor na
Anthropic API (Claude) a vrátí návrh vyplnění polí (dodavatel, IČO, DIČ, číslo dokladu, data,
částky, sazba DPH). Nic se nikam neuklada bez potvrzeni - tlacitko "Prenest vse do formulare" jen predvyplni pole, uzivatel pred ulozenim vsechno vidi a muze opravit. Zadny doklad se automaticky neschvaluje ani neuklada jen na zaklade odpovedi AI.

Vyžaduje vlastní Anthropic API klíč v proměnné `ANTHROPIC_API_KEY` (server-only, nikdy s
prefixem `NEXT_PUBLIC_`) - viz `.env.local.example`. Bez klíče appka funguje dál normálně,
jen tlačítko Vytěžit AI vrátí chybovou hlášku. Každé volání stojí reálné peníze na Anthropic
účtu (cena za obrázek/PDF + pár desítek tokenů odpovědi), proto se to spouští jen ručně na
vyžádání, ne automaticky při nahrání souboru.

- [x] Etapa 1 – scaffold, DB schéma, RLS, role, audit log, demo data (MKD Enterprise)
- [x] Etapa 2 – Přijaté doklady (CRUD), Přehled (dashboard s reálnými daty)
- [x] Vydané doklady – základní evidence a sledování úhrady
- [x] Autentizace (Supabase Auth, přihlášení/registrace/odhlášení, ochrana rout přes `proxy.ts`)
- [x] Nahrávání příloh do Supabase Storage (neveřejný bucket `doklady`)
- [x] AI vytěžování dat z přílohy (beta, vyžaduje `ANTHROPIC_API_KEY`)
- [ ] Etapa 3 – Banka: ruční zadání transakcí, CSV import, detekce duplicit
- [ ] Etapa 4 – Párování dokladů s platbami (bodové skóre, potvrzení uživatelem)
- [ ] Etapa 5 – Ke kontrole (přehled nesrovnalostí)
- [ ] Etapa 7 – Exporty CSV/XLSX pro účetní firmu
- [ ] Etapa 7 – Exporty CSV/XLSX pro účetní firmu
- [ ] Etapa 8 – Napojení na Fio API (datový model už je připraven – `bank_accounts.fio_token_ref`,
      `bank_transactions.source`)

## Import rezervací z rezervačního systému (Padel Klatovy)

Zaplacené rezervace (`paid_confirmed`) z appky `padel-klatovy-core` se dají naimportovat jako
Vydané doklady, ať je má účetní hotové bez ručního přepisování.

**Jak to funguje:** appka `ucetnictvi` se serverově dotáže RPC funkce `get_accounting_export`
v Supabase projektu rezervačního systému (`padel-kalendar`), chráněné vlastním tajným klíčem.
Výsledek se uloží přes vlastní RPC funkci `import_padel_reservation` (Supabase projekt
`ucetnictvi`), která je taky chráněná tajným klíčem a řeší deduplikaci podle `reservation_id`
(sloupce `external_source` + `external_id` na `documents`) - opakovaný běh nic neduplikuje, jen
aktualizuje.

Sazba DPH je pevně nastavená na **12 % (snížená)** pro tržby za pronájem kurtu/vstup na
sportoviště - potvrzeno uživatelem. Pokud se sazba v budoucnu změní, upravte konstantu přímo ve
funkci `import_padel_reservation` v Supabase (SQL editor nebo nová migrace).

**Ruční spuštění:** na stránce Vydané doklady je panel "Import zaplacených rezervací" - zvolíte
období a kliknete Importovat.

**Automatický denní běh (volitelné):** endpoint `app/api/cron/sync-padel/route.ts` stáhne
"včerejší" rezervace. Ve výchozím stavu je vypnutý (bez `CRON_SECRET` vrací 401). Pro zapnutí:
1. Nastavte `CRON_SECRET` na náhodný řetězec (v `.env.local` i ve Vercel Environment Variables).
2. Do `vercel.json` v rootu projektu přidejte:
   ```json
   { "crons": [{ "path": "/api/cron/sync-padel", "schedule": "0 3 * * *" }] }
   ```
   Vercel pak sám posílá `Authorization: Bearer <CRON_SECRET>` podle dokumentace Vercel Cron Jobs.

**Rozlišení zdroje platby (jen Fio, dva toky):** sloupec `documents.revenue_source`:
- `'fio'` – platba spárovaná s konkrétní rezervací (přes `import_padel_reservation` /
  `get_accounting_export`),
- `'fio_vs406'` – platba na místě přes stálý barový QR kód (VS 406), **bez vazby na rezervaci**
  (přes `import_fio_bar_payment` / navrhovanou `get_bar_payments_export` na straně rezervačního
  systému - kontrakt zatím čeká na implementaci tam, funkce v naší appce je připravená).

Žádná ČSOB - obě cesty jdou přes stejný Fio účet.

**Měsíční export (`/exporty`):** přehled tržeb za pronájem kurtu za zvolený měsíc, rozdělený na
"Fio - spárováno s rezervací" / "Fio VS 406 - na místě", se základem DPH, DPH 12 % a celkovou
částkou. Lze stáhnout jako CSV (`/api/exports/padel-revenue?month=YYYY-MM`). Nespárované
bankovní platby, uhrazené rezervace bez transakce a nejednoznačné případy k ruční kontrole
**v tomto exportu zatím nejsou** - ta data žijí v rezervačním systému.

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
