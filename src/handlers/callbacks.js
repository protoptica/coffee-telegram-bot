import { randomUUID } from "node:crypto";
import { addEntry, clearPendingRating, getPendingRating } from "../storage/store.js";
import {
  answerCallbackQuery,
  deleteMessage,
  editMessageText,
} from "../telegram/api.js";
import { formatCoffeeCard } from "../formatters/entry.js";
import { logError, logInfo } from "../utils/logger.js";

export async function handleCallbackQuery(callbackQuery) {
  const data = callbackQuery.data ?? "";
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  logInfo("rating.callback.received", {
    userId,
    chatId,
    messageId,
    callbackQueryId: callbackQuery.id,
    data,
  });

  if (!data.startsWith("rate:") || !chatId || !messageId) {
    return false;
  }

  try {
    const [, ratingSessionId, ratingValue] = data.split(":");
    const pendingDraft = ratingSessionId ? await getPendingRating(ratingSessionId) : null;
    const rating = Number(ratingValue);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      await answerCallbackQuery(callbackQuery.id, "Invalid rating value.");
      return true;
    }

    if (!pendingDraft || pendingDraft.userId !== userId) {
      logInfo("rating.callback.expired", {
        userId,
        chatId,
        messageId,
        ratingSessionId,
        pendingDraftUserId: pendingDraft?.userId,
      });
      await answerCallbackQuery(callbackQuery.id, "This rating session expired.");
      return true;
    }

    const entry = {
      entryId: randomUUID(),
      ...pendingDraft,
      rating,
    };

    logInfo("rating.entry.save_started", {
      userId,
      chatId,
      messageId,
      ratingSessionId,
      rating,
      coffeeName: entry.coffeeName,
    });
    await addEntry(entry);
    logInfo("rating.entry.saved", {
      userId,
      chatId,
      messageId,
      ratingSessionId,
      rating,
      entryId: entry.entryId,
    });

    await clearPendingRating(ratingSessionId);
    logInfo("rating.pending_rating.cleared", {
      userId,
      chatId,
      messageId,
      ratingSessionId,
    });

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
    logInfo("rating.callback.completed", {
      userId,
      chatId,
      messageId,
      ratingSessionId,
      rating,
      entryId: entry.entryId,
    });

    return true;
  } catch (error) {
    logError("rating.callback.failed", error, {
      userId,
      chatId,
      messageId,
      callbackQueryId: callbackQuery.id,
      data,
    });
    throw error;
  }
}
