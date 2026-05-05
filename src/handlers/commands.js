import { formatCoffeeCard, formatEntryList } from "../formatters/entry.js";
import { getLastEntryForUser, listEntriesForUser } from "../storage/store.js";
import { sendMessage } from "../telegram/api.js";

export async function handleCommand(message) {
  const text = message.text ?? "";
  const chatId = message.chat.id;
  const userId = message.from.id;

  if (text.startsWith("/start")) {
    await sendMessage(
      chatId,
      "Send me a photo of a coffee bag. I will read the label, build a coffee card, and ask you for a rating."
    );
    return true;
  }

  if (text.startsWith("/help")) {
    await sendMessage(
      chatId,
      ["/start - begin", "/help - commands", "/list - recent coffees", "/last - latest coffee"].join("\n")
    );
    return true;
  }

  if (text.startsWith("/list")) {
    const entries = await listEntriesForUser(userId, 10);
    await sendMessage(chatId, formatEntryList(entries));
    return true;
  }

  if (text.startsWith("/last")) {
    const entry = await getLastEntryForUser(userId);
    if (!entry) {
      await sendMessage(chatId, "No coffees saved yet. Send me a bag photo first.");
      return true;
    }

    await sendMessage(chatId, formatCoffeeCard(entry));
    return true;
  }

  return false;
}
