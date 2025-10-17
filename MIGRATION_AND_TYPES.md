# DB Migration & Supabase Types — Anleitung

Diese Anleitung fasst die Schritte zusammen, die du bereits teilweise ausgeführt hast, und gibt reproduzierbare Befehle, um die Migration, Typsynchronisation und lokale Tests durchzuführen.

Datum: 2025-10-17

## 1) Migration ausführen (falls noch nicht ausgeführt)
Die Migration-Datei liegt bei `migrations/20251017_add_chary_marked_column.sql` und enthält:

```sql
-- Add chary_marked boolean column to charity_analysis_results
ALTER TABLE public.charity_analysis_results
ADD COLUMN IF NOT EXISTS chary_marked boolean DEFAULT false;

-- Backfill existing rows to false where NULL (defensive)
UPDATE public.charity_analysis_results
SET chary_marked = false
WHERE chary_marked IS NULL;

-- Index for quick lookup if you plan to filter by this column
CREATE INDEX IF NOT EXISTS idx_charity_analysis_chary_marked ON public.charity_analysis_results (chary_marked);
```

Option A — mit `psql` (direkter DB-Zugang):
```bash
# Beispiel: psql "postgresql://<user>:<password>@<host>:<port>/<database>" -f migrations/20251017_add_chary_marked_column.sql
psql "postgresql://postgres:YOUR_DB_PASSWORD@db.host:5432/postgres" -f migrations/20251017_add_chary_marked_column.sql
```

Option B — mit `supabase` CLI (wenn du lokal angemeldet bist):
```bash
# setze remote DB falls nötig und führe die SQL aus
supabase db remote set <CONNECTION_STRING>
# oder führe SQL via psql wie oben
psql "<CONNECTION_STRING>" -f migrations/20251017_add_chary_marked_column.sql
```

Hinweis: Die Datei wurde vom Projekt bereits hinzugefügt. Falls du die Migration bereits ausgeführt hast (du sagtest: "Ich habe das SQL Script ausgeführt"), kannst du weiter zu Schritt 2.

## 2) DB-Checks (kurz)
Kontrolliere, ob die Spalte existiert und wie viele Werte gesetzt sind:

```sql
-- prüfe Schema-Spalte
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'charity_analysis_results' AND column_name = 'chary_marked';

Ergebnis:
[
  {
    "column_name": "chary_marked",
    "data_type": "boolean",
    "column_default": "false"
  }
]

-- prüfe counts
SELECT COUNT(*) FILTER (WHERE chary_marked IS TRUE) as true_count,
       COUNT(*) FILTER (WHERE chary_marked IS FALSE) as false_count,
       COUNT(*) FILTER (WHERE chary_marked IS NULL) as null_count
FROM public.charity_analysis_results;
```
Ergebnis:
[
  {
    "true_count": 3,
    "false_count": 45,
    "null_count": 0
  }
]

## 3) Supabase Types regenerieren (empfohlen)
Es ist sicherer, die Datei `src/integrations/supabase/types.ts` automatisch zu generieren, statt sie manuell zu editieren.

Voraussetzungen:
- Supabase CLI installiert (`npm i -g supabase`) und angemeldet mit `supabase login`.
- Du kennst deine Projekt-Referenz (`project id` / `project ref`). In `supabase/config.toml` ist der `project_id` enthalten (z.B. `zwxepwsfcxfifiupmjmk`).

Befehl (empfohlen):
```bash
# generiert types für das ganze Projekt (überschreibt die Datei)
supabase gen types typescript --project-id zwxepwsfcxfifiupmjmk > src/integrations/supabase/types.ts
```

Alternative (nur bestimmte Tabelle):
```bash
supabase gen types typescript --from table charity_analysis_results --project-id zwxepwsfcxfifiupmjmk > src/integrations/supabase/types.ts
```

Wichtig: sichere vor dem Überschreiben die bestehende `types.ts`, falls du manuelle Anpassungen behalten willst.

## 4) Lokaler Dev-Check / Smoke tests
1. Node-Setup (falls noch nicht):
```bash
npm install
```
2. TypeScript-Check (wir schließen `supabase/functions` im Projekt so dass tsc nicht Deno-Dateien prüft):
```bash
npx tsc --noEmit
```
3. Dev-Server starten (Vite):
```bash
npm run dev
```
4. Smoke-test in der UI:
- Öffne http://localhost:5173
- Wechsle zur Startseite und gehe in den 'Neue Beiträge suchen' Bereich (oder nutze den Brain-Button bei einem Beitrag).
- Test: Für einen existierenden Analyse-Datensatz klicke die !CHARY Checkbox an/aus. Prüfe in der DB, ob `chary_marked` aktualisiert wurde.

## 5) Falls etwas schiefgeht
- Falls `npx tsc` Deno-Fehler meldet, prüfe `tsconfig.json` — das Projekt wurde bereits so angepasst, dass `supabase/functions` ausgeschlossen ist.
- Falls `supabase gen types` scheitert, prüfe, ob du angemeldet bist: `supabase login`, und dass du Zugriff auf das Projekt hast.

---
Wenn du möchtest, kann ich:
- die `types.ts` hier im Repo regenerieren, wenn du mir kurz einen temporären, sicheren Service-Key bereitstellen willst (nicht empfohlen), oder
- dich durch die obenstehenden Schritte per Terminal führen, während du die geheimen Werte lokal eingibst.

Sag mir, wie du weiter vorgehen willst — ich helfe beim Regenerieren der Types oder beim lokalen Smoke-Test.