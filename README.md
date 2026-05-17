# Coffee Journal Telegram Bot

## Setup

1. Create a bot with BotFather.
2. Copy the token.
3. Create `.env` or export env vars in your shell:

```bash
export TELEGRAM_BOT_TOKEN="your-token"
```

Optional:

```bash
export TELEGRAM_STORAGE_DIR="/absolute/path/to/storage"
export OCR_SPACE_API_KEY="your-ocr-space-key"
export STORAGE_BACKEND="json"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

## Run

```bash
cd "/Users/nonenone/Documents/New project 2/telegram-bot"
npm start
```

For moving the project to another Mac or into a fresh Codex setup, use:

- [SETUP-NEW-MAC.md](/Users/nonenone/Documents/New%20project%202/telegram-bot/SETUP-NEW-MAC.md)
- [.env.example](/Users/nonenone/Documents/New%20project%202/telegram-bot/.env.example)

## Current State

- long polling works
- accepts photo messages
- supports multiple concurrent pending ratings per user
- asks for rating via inline keyboard
- cleans up temporary "Reading the bag..." messages
- OCR uses OCR.space API and local coffee field parsing heuristics
- supports two persistence backends: local JSON and Supabase
- emits structured JSON logs for Railway/runtime diagnostics

## Storage Backends

The bot supports two storage modes:

- `STORAGE_BACKEND=json`
- `STORAGE_BACKEND=supabase`

### JSON

Default local mode for quick testing.

### Supabase

Recommended first real database setup.

1. Create a Supabase project.
2. Run [supabase/schema.sql](/Users/nonenone/Documents/New%20project%202/telegram-bot/supabase/schema.sql) in the SQL editor.
3. Add:
   - `STORAGE_BACKEND=supabase`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

For the current MVP this is enough to move coffee entries and pending ratings out of local JSON.

Important:

- the bot should use the Supabase `service_role` key
- the preferred variable name is `SUPABASE_SERVICE_ROLE_KEY`
- backward compatibility with `SUPABASE_ANON_KEY` exists temporarily, but should be removed later
- after changing Railway variables, do a full redeploy before testing callback/rating flow
- on startup, verify logs show:
  - `storageBackend: "supabase"`
  - `supabaseKeySource: "SUPABASE_SERVICE_ROLE_KEY"` or temporary `SUPABASE_ANON_KEY_FALLBACK`
  - the expected `supabaseUrlHost`
- the bot now saves `pending_ratings` before showing the clickable rating card, so if Supabase config is broken the card should not be shown as if it were safe to click

## Railway Checklist

Use this exact checklist when callback saves fail in production:

1. Confirm Railway deploys the latest commit on branch `codex/fix-supabase-runtime-config`.
2. Confirm service env vars contain:
   - `STORAGE_BACKEND=supabase`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy after any env change. Do not rely on an old running instance.
4. Check startup logs for `app.started` and confirm:
   - `storageBackend` is `supabase`
   - `supabaseKeySource` is not `missing`
   - `supabaseUrlHost` matches the intended Supabase project
5. Run one full test:
   - send photo
   - confirm logs contain `photo.pending_rating.saved`
   - confirm logs contain `photo.pending_rating.updated`
   - click rating
   - confirm logs contain `rating.entry.saved`
6. If `photo.pending_rating.saved` is missing or startup crashes with Supabase config error, treat it as deployment/configuration, not a callback-only bug.

## OCR Note

- if `OCR_SPACE_API_KEY` is not set, the bot uses the public demo key `helloworld`
- for real testing, it is much better to register your own free OCR.space key

## Next Step

1. Stabilize live Supabase config in Railway and confirm full `photo -> rating -> saved row` flow.
2. Move photo storage from local disk to Supabase Storage.
3. Replace long polling with webhook delivery for hosted production use.
4. Improve roaster detection with curated roaster catalog + aliases.
