import fs from "node:fs/promises";
import { basename } from "node:path";
import { config } from "../config.js";
import { logError, logInfo } from "../utils/logger.js";
import { parseCoffeeText } from "./coffee-parser.js";

export class CoffeeOcrError extends Error {
  constructor(message, code = "OCR_FAILED") {
    super(message);
    this.name = "CoffeeOcrError";
    this.code = code;
  }
}

export async function analyzeCoffeePhoto(filePath) {
  logInfo("ocr.analysis.started", {
    fileName: basename(filePath),
  });

  try {
    const rawText = await extractTextViaOcrSpace(filePath);
    const parsed = parseCoffeeText(rawText);
    logInfo("ocr.analysis.completed", {
      fileName: basename(filePath),
      rawTextLength: rawText.length,
      coffeeName: parsed.coffeeName,
      roasterName: parsed.roasterName,
      descriptorsCount: parsed.descriptors?.length ?? 0,
    });

    return {
      ...parsed,
      rawText,
    };
  } catch (error) {
    logError("ocr.analysis.failed", error, {
      fileName: basename(filePath),
    });
    throw error;
  }
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
  logInfo("ocr.request.started", {
    fileName: basename(filePath),
    apiKeyMode: config.ocrSpaceApiKey === "helloworld" ? "demo" : "custom",
  });

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: config.ocrSpaceApiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new CoffeeOcrError(`OCR request failed with status ${response.status}`, "OCR_HTTP_ERROR");
  }

  const json = await response.json();
  if (json.IsErroredOnProcessing) {
    const message = Array.isArray(json.ErrorMessage)
      ? json.ErrorMessage.join("; ")
      : json.ErrorMessage || "OCR processing failed";
    throw new CoffeeOcrError(message, "OCR_PROCESSING_ERROR");
  }

  const rawText = (json.ParsedResults ?? [])
    .map((item) => item?.ParsedText?.trim())
    .filter(Boolean)
    .join("\n");

  if (!rawText) {
    throw new CoffeeOcrError("OCR returned no text", "OCR_EMPTY");
  }

  logInfo("ocr.request.completed", {
    fileName: basename(filePath),
    parsedResultsCount: (json.ParsedResults ?? []).length,
    rawTextLength: rawText.length,
  });

  return rawText;
}
