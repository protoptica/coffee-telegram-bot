import { config } from "./config.js";
import { handleCallbackQuery } from "./handlers/callbacks.js";
import { handleCommand } from "./handlers/commands.js";
import { handlePhotoMessage } from "./handlers/photos.js";
import { initStorage } from "./storage/store.js";
import { getUpdates, sendMessage } from "./telegram/api.js";

let offset = 0;

async function processUpdate(update) {
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
  console.log("Coffee Journal bot is running...");

  while (true) {
    try {
      const updates = await getUpdates(offset);
      for (const update of updates) {
        offset = update.update_id + 1;
        await processUpdate(update);
      }
    } catch (error) {
      console.error("Polling error:", error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
