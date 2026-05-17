# Coffee Journal Telegram Bot Audit

Audit date: 2026-05-08

## Scope

This document reflects the current state after:

- Telegram MVP implementation
- Railway deployment
- Supabase integration for `coffee_entries` and `pending_ratings`
- config rename to `SUPABASE_SERVICE_ROLE_KEY`
- structured runtime diagnostics rollout

The goal of this audit is to separate:

- what is already working
- what is still fragile
- what should be done next, in order

## What Is Working

- Telegram photo flow is live.
- OCR runs through OCR.space.
- OCR output is parsed into coffee fields.
- One photo creates one independent rating session.
- Multiple pending rating cards can coexist without overwriting each other.
- Temporary `Reading the bag...` messages are cleaned up.
- Final card is edited in place after successful rating save.
- Two persistence backends exist:
  - local JSON
  - Supabase
- Structured JSON logs now exist for:
  - startup
  - update receipt
  - photo processing stages
  - OCR request and parse stages
  - pending rating persistence
  - rating callback and final entry save

## Current Architecture

### Runtime

- Node.js ESM application
- Telegram Bot API over HTTP
- long polling via `getUpdates`
- single process
- in-memory polling offset

### Main Request Flow

1. User sends photo to bot.
2. Bot downloads the largest Telegram photo variant.
3. Bot runs OCR through OCR.space.
4. OCR text is parsed into:
   - coffee name
   - roaster name
   - origin country
   - process
   - variety
   - descriptors
5. Bot sends rating card with inline keyboard.
6. Bot persists pending rating session.
7. User clicks rating button.
8. Bot reads pending rating session.
9. Bot writes final entry.
10. Bot edits message into final saved card.

### Storage Model

Two storage modes exist:

- `STORAGE_BACKEND=json`
  - entries: `storage/entries.json`
  - pending ratings: `storage/pending-ratings.json`
  - photos: `storage/photos/`

- `STORAGE_BACKEND=supabase`
  - entries: `coffee_entries`
  - pending ratings: `pending_ratings`
  - photos: still local disk only

### Main Modules

- entrypoint: [src/index.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/index.js)
- Telegram wrapper: [src/telegram/api.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/telegram/api.js)
- photo flow: [src/handlers/photos.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/handlers/photos.js)
- callback flow: [src/handlers/callbacks.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/handlers/callbacks.js)
- OCR adapter: [src/ocr/placeholder-ocr.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/ocr/placeholder-ocr.js)
- parser heuristics: [src/ocr/coffee-parser.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/ocr/coffee-parser.js)
- storage switch: [src/storage/store.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/storage/store.js)
- Supabase adapter: [src/storage/supabase-store.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/storage/supabase-store.js)
- logger: [src/utils/logger.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/utils/logger.js)

## Current Findings

::code-comment{title="[P1] Rating card was visible before pending state was durably saved" body="The photo flow originally sent the inline rating card before persisting `pending_ratings`. If Supabase config was stale, the key was missing at runtime, or the insert failed for any other reason, users still saw clickable buttons but callback lookup later returned no session. This was both a UX bug and a diagnostic trap because it made deployment failures look like callback-only issues." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/handlers/photos.js" start=75 end=114 priority=1 confidence=0.99}

::code-comment{title="[P1] Railway deployment can still run with stale or incomplete env config" body="Hosted failures can still come from runtime config drift. The bot now logs the detected Supabase key source and validates required Supabase env presence during startup, which makes stale deploys and missing Railway variables visible earlier instead of only during callback handling." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/config.js" start=3 end=26 priority=1 confidence=0.99}

::code-comment{title="[P1] Hosted mode still stores photos on ephemeral local disk" body="Even with `STORAGE_BACKEND=supabase`, photo files are still written to a local path derived from `storageDir`. On Railway this storage is not durable across restarts or redeploys, but the path is still saved with the entry. This remains the main data durability gap after database persistence." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/storage/supabase-store.js" start=4 end=4 priority=1 confidence=0.98}

::code-comment{title="[P1] Long polling remains operationally fragile in hosted mode" body="The bot still relies on `getUpdates`, so any second instance with the same token can terminate polling with `other getUpdates request`. Token rotation solved the immediate conflict once, but the architectural risk remains until hosted delivery moves to webhooks or strict single-instance discipline is enforced." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/index.js" start=53 end=72 priority=1 confidence=0.96}

::code-comment{title="[P2] Roaster detection is the weakest product-quality layer" body="OCR now gets far enough to produce useful cards, but roaster extraction remains heuristic and brittle for Russian specialty packaging. This is the most visible quality issue in normal user experience once storage/config bugs are stabilized." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/ocr/coffee-parser.js" start=155 end=166 priority=2 confidence=0.99}

::code-comment{title="[P2] Config migration fallback should remain temporary" body="The code still supports `SUPABASE_ANON_KEY` as a fallback for compatibility, but the canonical server variable is now `SUPABASE_SERVICE_ROLE_KEY`. This fallback is useful during migration, but leaving it indefinitely increases the chance of silent misconfiguration later." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/config.js" start=7 end=10 priority=2 confidence=0.97}

::code-comment{title="[P3] OCR adapter filename is misleading" body="`placeholder-ocr.js` is now a real OCR adapter with production logic, error handling, and logging. The filename no longer describes its role and will slow future maintenance or onboarding." file="/Users/nonenone/Documents/New project 2/telegram-bot/src/ocr/placeholder-ocr.js" start=1 end=1 priority=3 confidence=0.93}

## Observability Status

Observability was previously a major gap. That is no longer true.

The bot now emits structured logs for:

- `app.started`
- `telegram.update.received`
- `telegram.updates.batch`
- `telegram.polling.failed`
- `photo.received`
- `photo.processing.started`
- `photo.downloaded`
- `photo.ocr.parsed`
- `photo.rating_prompt.sent`
- `photo.pending_rating.saved`
- `photo.processing.failed`
- `ocr.request.started`
- `ocr.request.completed`
- `ocr.analysis.started`
- `ocr.analysis.completed`
- `ocr.analysis.failed`
- `rating.callback.received`
- `rating.callback.expired`
- `rating.entry.save_started`
- `rating.entry.saved`
- `rating.pending_rating.cleared`
- `rating.callback.completed`
- `rating.callback.failed`
- `storage.json.initialized`
- `storage.supabase.initialized`

Conclusion:

- logging is no longer a roadmap item
- deployment debugging should now happen from logs first, not from UI symptoms

## Priority Order Now

The correct engineering order has changed.

### 1. Stabilize hosted Supabase configuration

This is the immediate blocker.

Definition of done:

- Railway runs the latest commit
- `SUPABASE_URL` is present
- `SUPABASE_SERVICE_ROLE_KEY` is present
- startup log `app.started` shows:
  - `storageBackend: "supabase"`
  - `supabaseKeySource: "SUPABASE_SERVICE_ROLE_KEY"` or temporary `SUPABASE_ANON_KEY_FALLBACK`
  - expected `supabaseUrlHost`
- one rating click produces:
  - `photo.pending_rating.saved`
  - `photo.pending_rating.updated`
  - `rating.entry.saved`
  - row visible in `coffee_entries`

### 2. Move photo storage to durable object storage

Target:

- Supabase Storage

Required change:

- upload Telegram-downloaded image to bucket
- persist object path instead of only local path
- stop depending on Railway local disk for user photos

### 3. Replace long polling with webhooks in hosted mode

Target:

- Railway public HTTP endpoint
- Telegram webhook delivery

This removes:

- `other getUpdates request`
- token-conflict style failures
- polling ambiguity during deploys and local tests

### 4. Improve roaster detection quality

This is the next product-quality workstream after infra stabilization.

Primary place to improve:

- [src/ocr/coffee-parser.js](/Users/nonenone/Documents/New%20project%202/telegram-bot/src/ocr/coffee-parser.js)

Recommended implementation path:

- curated catalog of Russian roasters
- aliases in Latin/Cyrillic
- punctuation-normalized lookup
- matching across all OCR lines
- confidence score
- reject weak guesses instead of inventing a roaster

### 5. Remove transitional configuration and naming debt

After production is stable:

- remove `SUPABASE_ANON_KEY` fallback
- rename `placeholder-ocr.js`
- document exact Railway env vars and deployment checks

## Near-Term Task Summary

### Immediate tasks

- verify Railway deploy is on latest commit
- verify `SUPABASE_SERVICE_ROLE_KEY` exists in live env vars
- redeploy
- test one full photo -> rating -> row-in-Supabase flow

### Next tasks

- migrate photos to Supabase Storage
- add webhook delivery
- strengthen roaster detection with catalog-based matching

### Later tasks

- user-selected descriptors after rating
- free-text comment field
- normalized `roasters` table
- admin/debug command for last failed operation

## Cleanup Notes

- `README.md` should continue to reflect the real deployed topology, not just local shell usage
- `placeholder-ocr.js` should be renamed after stability work
- JSON session helpers should be reviewed for dead code once production flow is settled

## Bottom Line

The MVP bot is real and usable.

The most likely root cause chain was mixed:

- operational risk in Railway env/deploy consistency
- plus a real sequencing bug where the rating card could be shown before `pending_ratings` was durably saved

That sequencing bug is now fixed in code, so a failed Supabase insert should stop the flow before the user gets a misleading clickable card.

The current blockers are operational:

- live Supabase env config consistency
- photo durability
- polling topology

The main product-quality issue after that is roaster recognition.
