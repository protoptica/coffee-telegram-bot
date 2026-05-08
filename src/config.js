import path from "node:path";

export const config = {
  token: process.env.TELEGRAM_BOT_TOKEN ?? "",
  apiBase: "https://api.telegram.org",
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY ?? "helloworld",
  storageBackend: process.env.STORAGE_BACKEND ?? "json",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    "",
  storageDir:
    process.env.TELEGRAM_STORAGE_DIR ??
    path.resolve(process.cwd(), "storage"),
};
