# Move Project To Another Mac

## Goal

Bring the Telegram bot project into Codex on another Mac with the minimum manual setup and without copying local junk, secrets, or ephemeral storage.

## What To Move

Do not manually copy the whole working directory.

Use Git for code and docs:

- repo: `https://github.com/protoptica/coffee-telegram-bot.git`
- branch for current work: `codex/fix-supabase-runtime-config`

Do not move these by file copy:

- `storage/`
- `.env`
- `.env.local`
- any BotFather token pasted into shell history

These are not in Git and must be recreated on the new Mac:

- `TELEGRAM_BOT_TOKEN`
- `OCR_SPACE_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## What Is Already In Git

Tracked files now include:

- bot source code
- Supabase schema
- current audit
- current README
- `.env.example`
- this setup guide

## New Mac Setup

### 1. Clone

```bash
git clone https://github.com/protoptica/coffee-telegram-bot.git
cd coffee-telegram-bot
git checkout codex/fix-supabase-runtime-config
```

### 2. Open In Codex

Open the cloned folder in Codex on the new Mac.

Recommended working directory:

- the cloned repo root itself

## 3. Create Local Env File

```bash
cp .env.example .env
```

Then fill in real values:

- `TELEGRAM_BOT_TOKEN`
- `OCR_SPACE_API_KEY`
- `STORAGE_BACKEND`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If you want local-only testing without Supabase:

- set `STORAGE_BACKEND=json`

If you want the hosted-like path:

- set `STORAGE_BACKEND=supabase`

## 4. Supabase

If the target Supabase project is new:

1. Create project.
2. Run [supabase/schema.sql](/Users/nonenone/Documents/New%20project%202/telegram-bot/supabase/schema.sql).
3. Copy:
   - project URL
   - service role key

If using the existing Supabase project, only copy:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 5. Run Locally

This project has no npm dependencies at the moment.

Run:

```bash
export $(grep -v '^#' .env | xargs)
npm start
```

Or for auto-restart:

```bash
export $(grep -v '^#' .env | xargs)
npm run dev
```

## 6. What To Verify First

On startup, logs should show:

- `app.started`
- `storageBackend`
- `supabaseKeySource`
- `supabaseUrlHost`

For one full test:

1. Send photo.
2. Confirm logs contain:
   - `photo.pending_rating.saved`
   - `photo.pending_rating.updated`
3. Click rating.
4. Confirm logs contain:
   - `rating.entry.saved`

If `STORAGE_BACKEND=supabase`, also verify:

- row appears in `pending_ratings` before click
- row appears in `coffee_entries` after click

## 7. Railway

If you want the other Mac only for development, you do not need to touch Railway.

If you want to manage production from the new Mac, keep these values accessible:

- Railway project/service
- Railway env vars
- Supabase project URL
- Supabase service role key
- BotFather access to rotate token if needed

## 8. What Not To Expect Yet

These are still known limitations:

- photo files still live on local disk even in `supabase` mode
- hosted mode still uses long polling, not webhooks
- roaster detection is heuristic and incomplete

## Fastest Recovery Path

If something fails on the new Mac:

1. Check `.env`.
2. Run the bot locally.
3. Inspect structured logs.
4. Compare startup log fields:
   - `storageBackend`
   - `supabaseKeySource`
   - `supabaseUrlHost`
