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
export SUPABASE_ANON_KEY="your-supabase-anon-key"
```

## Run

```bash
cd "/Users/nonenone/Documents/New project 2/telegram-bot"
npm start
```

## Current State

- long polling works
- accepts photo messages
- stores user sessions
- asks for rating via inline keyboard
- saves entries to local JSON
- OCR uses OCR.space API and local coffee field parsing heuristics

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
   - `SUPABASE_ANON_KEY`

For the current MVP this is enough to move coffee entries and pending ratings out of local JSON.

## OCR Note

- if `OCR_SPACE_API_KEY` is not set, the bot uses the public demo key `helloworld`
- for real testing, it is much better to register your own free OCR.space key

## Next Step

Replace the placeholder OCR adapter with a real OCR implementation.
