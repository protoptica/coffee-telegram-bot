import path from "node:path";

export const config = {
  token: process.env.TELEGRAM_BOT_TOKEN ?? "",
  apiBase: "https://api.telegram.org",
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY ?? "helloworld",
  storageDir:
    process.env.TELEGRAM_STORAGE_DIR ??
    path.resolve(process.cwd(), "storage"),
};
