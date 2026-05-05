import { randomUUID } from "node:crypto";
import { addEntry, clearPendingRating, getPendingRating } from "../storage/store.js";
import {
  answerCallbackQuery,
  deleteMessage,
  editMessageText,
} from "../telegram/api.js";
import { formatCoffeeCard } from "../formatters/entry.js";

export async function handleCallbackQuery(callbackQuery) {
  const data = callbackQuery.data ?? "";
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (!data.startsWith("rate:") || !chatId || !messageId) {
    return false;
  }

  const [, ratingSessionId, ratingValue] = data.split(":");
  const pendingDraft = ratingSessionId ? await getPendingRating(ratingSessionId) : null;

  if (!pendingDraft || pendingDraft.userId !== userId) {
    await answerCallbackQuery(callbackQuery.id, "This rating session expired.");
    return true;
  }

  const rating = Number(ratingValue);
  const entry = {
    entryId: randomUUID(),
    ...pendingDraft,
    rating,
  };

  await addEntry(entry);
  await clearPendingRating(ratingSessionId);
  if (pendingDraft.processingMessageId) {
    try {
      await deleteMessage(chatId, pendingDraft.processingMessageId);
    } catch {
      // Ignore if Telegram no longer allows deleting the temporary message.
    }
  }

  await editMessageText(
    chatId,
    messageId,
    `Saved to your collection.\n\n${formatCoffeeCard(entry)}`
  );
  await answerCallbackQuery(callbackQuery.id, `Saved rating ${rating}/5`);

  return true;
}
