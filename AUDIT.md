# Coffee Journal Telegram Bot Audit

## Scope

Audit date: 2026-05-08

This document summarizes:

- what has been implemented
- current architecture
- known bugs and inconsistencies
- recommended next steps

## Implemented

- Telegram bot with long polling
- photo upload flow from Telegram chat
- OCR through OCR.space
- heuristic extraction of coffee fields
- per-card rating sessions via inline keyboard
- local JSON storage backend
- Supabase storage backend for entries and pending ratings
- Railway deployment path

## Current Architecture

### Runtime

- Node.js ESM application
- Telegram Bot API via HTTP + `getUpdates`
- single process, in-memory polling offset

### Request Flow

1. User sends photo
2. Bot downloads largest Telegram photo variant
3. Bot sends image to OCR.space
4. OCR text is parsed into:
   - coffee name
   - country
   - process
   - variety
   - descriptors
   - roaster name
5. Bot sends rating card with inline buttons
6. User selects rating
7. Entry is persisted

### Storage

Two backends exist:

- `json`
  - entries in `storage/entries.json`
  - pending rating sessions in `storage/pending-ratings.json`
  - photos in `storage/photos/`
- `supabase`
  - entries in `coffee_entries`
  - pending rating sessions in `pending_ratings`
  - photos still stored on local disk

### Main Modules

- entrypoint: [src/index.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/index.js)
- Telegram API wrapper: [src/telegram/api.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/telegram/api.js)
- photo flow: [src/handlers/photos.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/handlers/photos.js)
- rating callback flow: [src/handlers/callbacks.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/handlers/callbacks.js)
- OCR parser: [src/ocr/coffee-parser.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/ocr/coffee-parser.js)
- storage switch: [src/storage/store.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/storage/store.js)
- Supabase adapter: [src/storage/supabase-store.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/storage/supabase-store.js)

## Findings

::code-comment{title="[P1] Hosted mode still stores photos on ephemeral local disk" body="The Supabase backend only moves entry and pending-rating records into Postgres, but photo files are still written to a local path derived from `storageDir`. On Railway or any ephemeral container, those files are not durable across redeploys or restarts, while their paths are still persisted in the database. This produces broken references and data loss for any workflow that later expects the image to exist." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/storage/supabase-store.js" start=4 end=4 priority=1 confidence=0.98}

::code-comment{title="[P1] Long polling conflicts when more than one instance runs" body="The bot uses `getUpdates` in a tight loop with no single-instance coordination. Any second process with the same token, whether local or another deployment, causes Telegram to terminate one of the polling streams. For hosted production use this is an operational instability, not just a developer inconvenience." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/index.js" start=42 end=52 priority=1 confidence=0.95}

::code-comment{title="[P2] Supabase key migration needs cleanup after rename" body="The preferred server-side key name should be `SUPABASE_SERVICE_ROLE_KEY`, and the code now supports that. However, backward compatibility with the old `SUPABASE_ANON_KEY` name should be treated as transitional only and removed once deployments are updated, otherwise configuration drift remains possible." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/config.js" start=7 end=11 priority=2 confidence=0.97}

::code-comment{title="[P2] Roaster detection is too weak for Russian specialty packaging" body="Roaster extraction currently only looks for generic `coffee`/`.coffee` markers in the first few OCR lines. That will miss many real roasters that use logo-only branding, Cyrillic names, stylized names without the word `coffee`, or place the roaster away from the headline area. This is the main quality bottleneck once OCR succeeds." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/ocr/coffee-parser.js" start=155 end=166 priority=2 confidence=0.99}

::code-comment{title="[P2] OCR failure path hides root cause from operator logs" body="User-facing OCR errors are now handled cleanly, but there is no structured application log for which stage failed with which photo/session and which backend was active. That makes production diagnosis slower than it needs to be, especially when distinguishing OCR timeout, Supabase write failure, and Telegram API conflicts." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/handlers/photos.js" start=67 end=75 priority=2 confidence=0.89}

::code-comment{title="[P3] README is still partly operationally inconsistent" body="The README now reflects more of the current system, but it still centers the shell `npm start` path even though the project has been run in environments without npm in PATH, and it still treats the current setup as if local disk storage were acceptable beyond quick testing. This is documentation debt rather than an immediate runtime bug." file="/Users/nonenone/Documents/New project 2/telegram-bot/README.md" start=23 end=28 priority=3 confidence=0.76}

## Highest Priority Improvements

### 1. Move photos to durable object storage

This is the most important architectural gap.

Recommended target:

- Supabase Storage

What to change:

- upload downloaded Telegram photo to a bucket
- persist storage object path or public/signed URL
- stop relying on `local_photo_path` in hosted mode

### 2. Replace long polling with webhooks in hosted mode

This removes:

- `other getUpdates request` conflicts
- ambiguity around duplicate running instances
- wasted polling cycles

Recommended hosted design:

- Railway public URL
- Telegram webhook
- one HTTP handler process

### 3. Improve roaster detection quality

This should be treated as a dedicated workstream, not a small regex tweak.

#### Where improvement must happen

Primary file:

- [src/ocr/coffee-parser.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/ocr/coffee-parser.js)

Supporting future assets:

- `src/ocr/roaster-catalog.js`
- `data/roasters.json`

#### Recommended approach

Phase 1:

- build curated catalog of Russian roasters
- include aliases, Latin/Cyrillic spellings, punctuation-normalized forms
- match against all OCR lines, not just top 5

Phase 2:

- add fuzzy matching with confidence score
- reject weak matches rather than guessing

Phase 3:

- add packaging heuristics:
  - roaster often near logo
  - roaster often repeats across different lots
  - some brands have stable visual tokens

#### Why this matters

Coffee name, country, and process are already reasonably salvageable from OCR text. Roaster detection is currently the weakest part of the product meaning, especially for repeat-purchase and collection browsing workflows.

## Recommended Near-Term Roadmap

### Next 1-2 sessions

- verify Supabase writes with current deployment
- add explicit runtime logs:
  - active storage backend
  - OCR request started/failed/succeeded
  - pending rating saved
  - final coffee entry saved
- remove backward compatibility for `SUPABASE_ANON_KEY` after deployments are migrated

### Next 3-5 sessions

- move photos to Supabase Storage
- add roaster catalog + alias matching
- add `/debug_last` operator command or admin-only diagnostics

### After that

- switch from long polling to webhooks
- add descriptors chosen by user after OCR card
- add explicit comments field
- add basic admin metrics

## Data Model Direction

Current entry shape is still acceptable for MVP, but next schema iteration should formalize:

- `users`
- `coffee_entries`
- `pending_ratings`
- `roasters`
- `photos`

With `coffee_entries.roaster_id` eventually replacing best-effort string-only `roaster_name`.

## Recommended Cleanup

- rename `src/ocr/placeholder-ocr.js` because it is no longer a placeholder implementation
- remove dead JSON session functions if they are no longer used
- add deployment doc for Railway + Supabase exact env vars

## Summary

The bot is already a viable MVP. The main remaining engineering risks are not in Telegram mechanics anymore. They are:

- hosted durability of photos
- single-instance polling conflicts
- weak roaster recognition
- weak operator observability

That is the correct order of work.
