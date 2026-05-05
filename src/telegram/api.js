import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

function methodUrl(method) {
  return `${config.apiBase}/bot${config.token}/${method}`;
}

export async function callTelegram(method, payload) {
  const response = await fetch(methodUrl(method), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload ?? {}),
  });

  const json = await response.json();
  if (!json.ok) {
    throw new Error(json.description ?? `Telegram API error on ${method}`);
  }

  return json.result;
}

export async function getUpdates(offset) {
  return callTelegram("getUpdates", {
    offset,
    timeout: 30,
    allowed_updates: ["message", "callback_query"],
  });
}

export async function sendMessage(chatId, text, extra = {}) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    ...extra,
  });
}

export async function answerCallbackQuery(callbackQueryId, text) {
  return callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function editMessageReplyMarkup(chatId, messageId, replyMarkup = null) {
  return callTelegram("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup,
  });
}

export async function editMessageText(chatId, messageId, text, extra = {}) {
  return callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...extra,
  });
}

export async function deleteMessage(chatId, messageId) {
  return callTelegram("deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

export async function getFile(fileId) {
  return callTelegram("getFile", { file_id: fileId });
}

export async function downloadTelegramFile(filePath, targetPath) {
  const url = `${config.apiBase}/file/bot${config.token}/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download file: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer);
  return targetPath;
}
