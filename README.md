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

## OCR Note

- if `OCR_SPACE_API_KEY` is not set, the bot uses the public demo key `helloworld`
- for real testing, it is much better to register your own free OCR.space key

## Next Step

Replace the placeholder OCR adapter with a real OCR implementation.
