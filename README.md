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

## Kontrola kvality přijatých dokladů

Při hromadném importu (a při ručním uložení nového dokladu) appka automaticky kontroluje:
- **Součet** - jestli základ DPH + DPH odpovídá celkové částce (tolerance 2 Kč na zaokrouhlení).
  Nesedí-li to, doklad zůstává ve stavu "Ke kontrole"/"Chybí doklad" s vysvětlením v poznámce.
- **Možná duplicita** - jestli už neexistuje doklad se stejným číslem dokladu a IČO dodavatele.
  Appka duplicitu needuplikuje potichu, ale ani ji sama nezamítne - vždy skončí ve stavu
  "Ke kontrole" s poznámkou, ať to člověk posoudí (může jít o skutečně dva různé doklady se
  shodným číslováním, nebo o omylem dvakrát nahraný stejný doklad).

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

**Automatický denní běh:** zapnutý (`vercel.json` obsahuje cron na `/api/cron/sync-padel`,
denně ve 3:00 UTC). Stahuje "včerejší" zaplacené rezervace i platby na místě (barový QR).
`CRON_SECRET` **není potřeba nastavovat ručně** – Vercel ho od ledna 2026 sám automaticky
vytváří a posílá při každém plánovaném spuštění. Bezplatný Hobby plán podporuje cron až 1×
denně zdarma; víc by vyžadovalo placený Pro plán.

**Rozlišení zdroje platby (jen Fio, dva toky):** sloupec `documents.revenue_source`:
- `'fio'` – platba spárovaná s konkrétní rezervací (přes `import_padel_reservation` /
  `get_accounting_export`),
- `'fio_vs406'` – platba na místě přes stálý barový QR kód (VS 406), **bez vazby na rezervaci**
  (přes `import_fio_bar_payment` / navrhovanou `get_bar_payments_export` na straně rezervačního
  systému - kontrakt zatím čeká na implementaci tam, funkce v naší appce je připravená).

Žádná ČSOB - obě cesty jdou přes stejný Fio účet.

**Kompletní měsíční export (`/exporty`):** teď obsahuje **příjmy i výdaje pohromadě** - přesně
to, co potřebuje účetní místo syrového bankovního výpisu. Nahoře souhrnné dlaždice (příjmy,
výdaje, rozdíl, DPH na výstupu/vstupu), pak samostatné sekce Příjmy (tržby za kurty podle
zdroje platby) a Výdaje (přijaté doklady s kategorií a stavem). CSV export
(`/api/exports/padel-revenue?month=YYYY-MM`) obsahuje obojí v jednom souboru se sloupcem
"Typ" (Příjem/Výdaj) a mezisoučty za obě strany.

**Nespárované platby a nepotvrzené rezervace (`/ke-kontrole`):** appka čte i funkci
`get_review_items_export` v rezervačním systému (nespárované Fio transakce + rezervace, kde
byla platba založena, ale zatím není potvrzená/spárovaná). Tahle funkce byla přidána přímo z
téhle appky (čtecí, bez zásahu do rezervačního systému) - stejný bezpečný vzor jako ostatní dvě.

## Kompletní sada pro účetní

**Banka (`/banka`):** import výpisu z ČSOB **přímo jako PDF** (tak, jak ho ČSOB reálně posílá)
nebo jako CSV export z internetbankingu - appka pozná formát podle přípony/typu souboru.
PDF parser rekonstruuje rozvržení sloupců podle pozic textu na stránce (čistý JavaScript přes
`pdfjs-dist`, žádná závislost na systémových nástrojích jako poppler - funguje i v serverless
prostředí Vercelu). Ověřeno na reálném červencovém výpisu: 274/274 transakcí, přesná shoda se
souhrnem na výpisu (počet i celková částka). CSV parser sám rozpoznává běžné sloupce (Datum,
Objem/Částka, Protiúčet, Variabilní symbol, Zpráva pro příjemce) podle názvu hlavičky. Opakovaný
import stejného souboru nic neduplikuje (hash řádku podle datum+částka+protiúčet+VS+zpráva).

**Kompletní měsíční export (`/exporty`):** tři sekce pohromadě - Příjmy (tržby za kurty),
Výdaje (přijaté doklady) a Bankovní pohyb ČSOB (nahraný výpis). CSV export
(`/api/exports/padel-revenue?month=YYYY-MM`) obsahuje všechny tři se sloupcem "Typ" a
mezisoučty - jeden soubor k odevzdání účetní místo tří různých zdrojů.

**Databáze odběratelů a opakovaná fakturace:** při každém uložení faktury s vyplněným IČO se
odběratel automaticky uloží/aktualizuje v `business_partners` (žádná ruční správa navíc).
Stránka `/vydane-doklady/odberatele` ukazuje všechny uložené odběratele s počtem a součtem
fakturovaného, a tlačítkem "🧾 Nová faktura" u každého (předvyplní se název/adresa/IČO/DIČ).
Ve formuláři nové faktury jde odběratele i vybrat přímo z rozbalovacího seznamu. Popisy položek
mají chytré napovídání (`<datalist>`) z posledních 200 dřív použitých popisů - psaní stejné
položky podruhé stačí začít psát a appka nabídne dokončení.

## Nabídky (cenové nabídky zboží)

Samostatný modul odděl od faktur - nabídky **nejsou daňový doklad**, proto nejsou v tabulce
`documents` a nezasahují do žádných účetních exportů/přehledů. Vlastní tabulky `quotes` +
`quote_line_items`, vlastní číslování (`NAB-1/08/2026`).

- **Nová nabídka** (`/nabidky/nova`): stejný formulář jako u faktur (ARES lookup, položky,
  obousměrný přepočet cena/celkem s plnou přesností, napovídání popisů - sdílené i s fakturami),
  jen místo splatnosti "Platnost nabídky do" a bez platebních údajů/QR.
- **Náhled/tisk** (`/nabidka/[id]`): samostatná stránka bez bočního menu, se stavem nabídky
  (Návrh/Odeslána/Přijata/Zamítnuta/Fakturováno).
- **Převést na fakturu** - jedním tlačítkem se ze všech položek nabídky vytvoří nová faktura
  (vlastní číslo, splatnost +14 dní), beze změny textu. Nabídka zůstane zachovaná, jen se označí
  jako "Fakturováno" a propojí s novou fakturou.
- Zákazníci se ukládají do stejné databáze `business_partners` jako u faktur.

## Vystavování faktur (nahrazuje samostatnou appku Faktury-MKD)

Bývalá samostatná appka (`faktury-mkd.html`, Claude Artifact) je teď součástí MKD Účetnictví -
**historie faktur se ukládá do Supabase, ne do dočasného `window.storage`**, takže při
nahrazení kódu appky (redeploy) žádná data nezmizí.

- **Nová faktura** (`/vydane-doklady/nova-faktura`): ARES lookup podle IČO (server-side, žádné
  CORS omezení prohlížeče), řádkové položky s libovolnou sazbou DPH, živá rekapitulace DPH podle
  sazby, výběr firemního bankovního účtu pro QR platbu.
- **Číslování faktur**: formát `pořadí/měsíc/rok` (např. `1/08/2026`), počítá se automaticky
  podle nejvyššího čísla použitého v aktuálním roce.
- **Tisk/PDF** (`/faktura/[id]`): samostatná stránka bez bočního menu (čistá pro tisk/uložení
  jako PDF přes tiskový dialog prohlížeče), s QR kódem pro platbu (formát SPD, generovaný
  server-side přes `qrcode`).
- **Úprava** existující faktury: `/vydane-doklady/[id]/uprava-faktury`.
- Položky faktury jsou v tabulce `document_line_items`, propojené s `documents`
  (`company_id`, `document_id`), s vlastní RLS podle stejného vzoru jako zbytek appky.
- Souhrnná sazba DPH na `documents` (pro exporty a přehledy) se automaticky odvozuje jako sazba
  s největším základem mezi položkami - skutečný rozpad víc sazeb zůstává v položkách faktury.

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
