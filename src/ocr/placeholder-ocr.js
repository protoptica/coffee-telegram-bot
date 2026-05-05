import fs from "node:fs/promises";
import { basename } from "node:path";
import { config } from "../config.js";
import { parseCoffeeText } from "./coffee-parser.js";

export async function analyzeCoffeePhoto(filePath) {
  const rawText = await extractTextViaOcrSpace(filePath);
  const parsed = parseCoffeeText(rawText);

  return {
    ...parsed,
    rawText,
  };
}

async function extractTextViaOcrSpace(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: "image/jpeg" });

  formData.append("file", blob, basename(filePath));
  formData.append("language", "rus");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");
  formData.append("scale", "true");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: config.ocrSpaceApiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR request failed with status ${response.status}`);
  }

  const json = await response.json();
  if (json.IsErroredOnProcessing) {
    const message = Array.isArray(json.ErrorMessage)
      ? json.ErrorMessage.join("; ")
      : json.ErrorMessage || "OCR processing failed";
    throw new Error(message);
  }

  const rawText = (json.ParsedResults ?? [])
    .map((item) => item?.ParsedText?.trim())
    .filter(Boolean)
    .join("\n");

  if (!rawText) {
    throw new Error("OCR returned no text");
  }

  return rawText;
}
