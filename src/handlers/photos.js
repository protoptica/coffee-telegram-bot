import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { analyzeCoffeePhoto, CoffeeOcrError } from "../ocr/placeholder-ocr.js";
import { formatCoffeeCard } from "../formatters/entry.js";
import { getPhotosDir, setPendingRating } from "../storage/store.js";
import { deleteMessage, downloadTelegramFile, getFile, sendMessage } from "../telegram/api.js";
import { logError, logInfo } from "../utils/logger.js";

function buildRatingKeyboard(ratingSessionId) {
  return {
    inline_keyboard: [
      [
        { text: "1", callback_data: `rate:${ratingSessionId}:1` },
        { text: "2", callback_data: `rate:${ratingSessionId}:2` },
        { text: "3", callback_data: `rate:${ratingSessionId}:3` },
        { text: "4", callback_data: `rate:${ratingSessionId}:4` },
        { text: "5", callback_data: `rate:${ratingSessionId}:5` }
      ]
    ]
  };
}

export async function handlePhotoMessage(message) {
  const photo = message.photo?.[message.photo.length - 1];
  if (!photo) {
    return false;
  }

  const chatId = message.chat.id;
  const userId = message.from.id;
  const sourceMessageId = message.message_id;
  logInfo("photo.received", {
    chatId,
    userId,
    sourceMessageId,
    telegramPhotoFileId: photo.file_id,
  });

  const processingMessage = await sendMessage(chatId, "Reading the bag...");
  try {
    logInfo("photo.processing.started", {
      chatId,
      userId,
      sourceMessageId,
      processingMessageId: processingMessage.message_id,
    });

    const telegramFile = await getFile(photo.file_id);
    const fileName = `${randomUUID()}.jpg`;
    const targetPath = path.join(getPhotosDir(), fileName);
    await downloadTelegramFile(telegramFile.file_path, targetPath);
    logInfo("photo.downloaded", {
      chatId,
      userId,
      sourceMessageId,
      targetPath,
    });

    const parsed = await analyzeCoffeePhoto(targetPath);
    logInfo("photo.ocr.parsed", {
      chatId,
      userId,
      sourceMessageId,
      coffeeName: parsed.coffeeName,
      roasterName: parsed.roasterName,
      originCountry: parsed.originCountry,
      process: parsed.process,
      descriptorsCount: parsed.descriptors?.length ?? 0,
      rawTextLength: parsed.rawText?.length ?? 0,
    });

    const draft = {
      id: randomUUID(),
      userId,
      chatId,
      telegramPhotoFileId: photo.file_id,
      localPhotoPath: targetPath,
      createdAt: new Date().toISOString(),
      ...parsed,
    };

    const ratingSessionId = randomUUID();
    await setPendingRating(ratingSessionId, {
      ...draft,
      processingMessageId: processingMessage.message_id,
      ratingMessageId: null,
    });
    logInfo("photo.pending_rating.saved", {
      chatId,
      userId,
      sourceMessageId,
      ratingSessionId,
      storageBackend: config.storageBackend,
    });

    const ratingMessage = await sendMessage(
      chatId,
      `${formatCoffeeCard(draft)}\n\nRate this coffee:`,
      {
        reply_markup: buildRatingKeyboard(ratingSessionId),
      }
    );
    logInfo("photo.rating_prompt.sent", {
      chatId,
      userId,
      sourceMessageId,
      ratingSessionId,
      ratingMessageId: ratingMessage.message_id,
    });

    await setPendingRating(ratingSessionId, {
      ...draft,
      processingMessageId: processingMessage.message_id,
      ratingMessageId: ratingMessage.message_id,
    });
    logInfo("photo.pending_rating.updated", {
      chatId,
      userId,
      sourceMessageId,
      ratingSessionId,
      ratingMessageId: ratingMessage.message_id,
      storageBackend: config.storageBackend,
    });

    try {
      await deleteMessage(chatId, processingMessage.message_id);
    } catch {
      // Ignore if Telegram refuses to delete the temporary processing message.
    }

    return true;
  } catch (error) {
    logError("photo.processing.failed", error, {
      chatId,
      userId,
      sourceMessageId,
      telegramPhotoFileId: photo.file_id,
      processingMessageId: processingMessage.message_id,
    });

    try {
      await deleteMessage(chatId, processingMessage.message_id);
    } catch {
      // Ignore if Telegram refuses to delete the temporary processing message.
    }

    await sendMessage(chatId, buildPhotoFailureMessage(error));
    return true;
  }
}

function buildPhotoFailureMessage(error) {
  if (error instanceof CoffeeOcrError) {
    if (
      error.code === "OCR_NETWORK_ERROR" ||
      error.code === "OCR_TIMEOUT" ||
      error.code === "OCR_HTTP_RETRYABLE"
    ) {
      return "The text recognition service is temporarily unavailable. Please try again in a minute.";
    }

    if (
      error.message.includes("Timed out waiting for results") ||
      error.code === "OCR_PROCESSING_ERROR"
    ) {
      return "I couldn't finish reading this bag in time. Please try sending the photo again, preferably a clearer close-up with the label text large in frame.";
    }

    if (error.code === "OCR_EMPTY") {
      return "I couldn't recognize text on this photo. Please send a clearer photo of the bag label.";
    }
  }

  return "Something went wrong while reading this bag. Please try again in a moment.";
}
