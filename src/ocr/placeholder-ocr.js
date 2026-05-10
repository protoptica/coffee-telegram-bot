import fs from "node:fs/promises";
import { basename } from "node:path";
import { config } from "../config.js";
import { logError, logInfo } from "../utils/logger.js";
import { parseCoffeeText } from "./coffee-parser.js";

const OCR_REQUEST_TIMEOUT_MS = 20000;
const OCR_MAX_ATTEMPTS = 2;

export class CoffeeOcrError extends Error {
  constructor(message, code = "OCR_FAILED") {
    super(message);
    this.name = "CoffeeOcrError";
    this.code = code;
  }
}

function buildOcrFormData(fileBuffer, fileName) {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: "image/jpeg" });

  formData.append("file", blob, fileName);
  formData.append("language", "rus");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");
  formData.append("scale", "true");

  return formData;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryOcrError(error) {
  if (!(error instanceof CoffeeOcrError)) {
    return false;
  }

  return ["OCR_NETWORK_ERROR", "OCR_TIMEOUT", "OCR_HTTP_RETRYABLE"].includes(
    error.code
  );
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
  const fileName = basename(filePath);

  for (let attempt = 1; attempt <= OCR_MAX_ATTEMPTS; attempt += 1) {
    try {
      logInfo("ocr.request.started", {
        fileName,
        attempt,
        maxAttempts: OCR_MAX_ATTEMPTS,
        apiKeyMode: config.ocrSpaceApiKey === "helloworld" ? "demo" : "custom",
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OCR_REQUEST_TIMEOUT_MS);

      let response;
      try {
        response = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          headers: {
            apikey: config.ocrSpaceApiKey,
          },
          body: buildOcrFormData(fileBuffer, fileName),
          signal: controller.signal,
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new CoffeeOcrError(
            `OCR request timed out after ${OCR_REQUEST_TIMEOUT_MS}ms`,
            "OCR_TIMEOUT"
          );
        }

        throw new CoffeeOcrError(error?.message ?? "OCR fetch failed", "OCR_NETWORK_ERROR");
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const code =
          response.status === 429 || response.status >= 500
            ? "OCR_HTTP_RETRYABLE"
            : "OCR_HTTP_ERROR";
        throw new CoffeeOcrError(
          `OCR request failed with status ${response.status}`,
          code
        );
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
        fileName,
        attempt,
        parsedResultsCount: (json.ParsedResults ?? []).length,
        rawTextLength: rawText.length,
      });

      return rawText;
    } catch (error) {
      const retrying = shouldRetryOcrError(error) && attempt < OCR_MAX_ATTEMPTS;
      logError("ocr.request.attempt_failed", error, {
        fileName,
        attempt,
        maxAttempts: OCR_MAX_ATTEMPTS,
        retrying,
      });

      if (!retrying) {
        throw error;
      }

      await sleep(1500 * attempt);
    }
  }

  throw new CoffeeOcrError("OCR request exhausted all retry attempts");
}
