import { config, getSupabaseConfigDiagnostics } from "./config.js";
import { handleCallbackQuery } from "./handlers/callbacks.js";
import { handleCommand } from "./handlers/commands.js";
import { handlePhotoMessage } from "./handlers/photos.js";
import { initStorage } from "./storage/store.js";
import { getUpdates, sendMessage } from "./telegram/api.js";
import { logError, logInfo } from "./utils/logger.js";

let offset = 0;

async function processUpdate(update) {
  logInfo("telegram.update.received", {
    updateId: update.update_id,
    hasMessage: Boolean(update.message),
    hasCallbackQuery: Boolean(update.callback_query),
    messageType: update.message?.photo?.length
      ? "photo"
      : update.message?.text?.startsWith("/")
        ? "command"
        : update.message?.text
          ? "text"
          : update.message
            ? "other"
            : undefined,
  });

  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query);
  }

  if (!update.message) {
    return false;
  }

  if (update.message.text?.startsWith("/")) {
    return handleCommand(update.message);
  }

  if (update.message.photo?.length) {
    return handlePhotoMessage(update.message);
  }

  await sendMessage(
    update.message.chat.id,
    "Send me a coffee bag photo, or use /help to see available commands."
  );
  return true;
}

async function main() {
  if (!config.token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN environment variable.");
  }

  await initStorage();
  const supabaseDiagnostics = getSupabaseConfigDiagnostics();
  logInfo("app.started", {
    storageBackend: config.storageBackend,
    storageDir: config.storageDir,
    supabaseConfigured:
      supabaseDiagnostics.supabaseUrlConfigured &&
      supabaseDiagnostics.supabaseKeyConfigured,
    supabaseUrlHost: supabaseDiagnostics.supabaseUrlHost,
    supabaseKeySource: supabaseDiagnostics.supabaseKeySource,
    ocrApiKeyMode: config.ocrSpaceApiKey === "helloworld" ? "demo" : "custom",
  });

  while (true) {
    try {
      const updates = await getUpdates(offset);
      if (updates.length > 0) {
        logInfo("telegram.updates.batch", {
          count: updates.length,
          nextOffsetHint: updates[updates.length - 1]?.update_id + 1,
        });
      }

      for (const update of updates) {
        offset = update.update_id + 1;
        await processUpdate(update);
      }
    } catch (error) {
      logError("telegram.polling.failed", error, { offset });
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

main().catch((error) => {
  logError("app.crashed", error);
  process.exit(1);
});
