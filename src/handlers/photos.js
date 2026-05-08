import path from "node:path";
import { randomUUID } from "node:crypto";
import { analyzeCoffeePhoto, CoffeeOcrError } from "../ocr/placeholder-ocr.js";
import { formatCoffeeCard } from "../formatters/entry.js";
import { getPhotosDir, setPendingRating } from "../storage/store.js";
import { deleteMessage, downloadTelegramFile, getFile, sendMessage } from "../telegram/api.js";

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
  const processingMessage = await sendMessage(chatId, "Reading the bag...");
  try {
    const telegramFile = await getFile(photo.file_id);
    const fileName = `${randomUUID()}.jpg`;
    const targetPath = path.join(getPhotosDir(), fileName);
    await downloadTelegramFile(telegramFile.file_path, targetPath);

    const parsed = await analyzeCoffeePhoto(targetPath);

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
    const ratingMessage = await sendMessage(chatId, `${formatCoffeeCard(draft)}\n\nRate this coffee:`, {
      reply_markup: buildRatingKeyboard(ratingSessionId),
    });

    await setPendingRating(ratingSessionId, {
      ...draft,
      processingMessageId: processingMessage.message_id,
      ratingMessageId: ratingMessage.message_id,
    });

    try {
      await deleteMessage(chatId, processingMessage.message_id);
    } catch {
      // Ignore if Telegram refuses to delete the temporary processing message.
    }

    return true;
  } catch (error) {
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
