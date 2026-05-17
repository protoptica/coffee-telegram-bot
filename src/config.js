import path from "node:path";

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

export const config = {
  token: process.env.TELEGRAM_BOT_TOKEN ?? "",
  apiBase: "https://api.telegram.org",
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY ?? "helloworld",
  storageBackend: process.env.STORAGE_BACKEND ?? "json",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: supabaseServiceRoleKey || supabaseAnonKey,
  storageDir:
    process.env.TELEGRAM_STORAGE_DIR ??
    path.resolve(process.cwd(), "storage"),
};

export function getSupabaseConfigDiagnostics() {
  return {
    storageBackend: config.storageBackend,
    supabaseUrlConfigured: Boolean(config.supabaseUrl),
    supabaseUrlHost: config.supabaseUrl
      ? new URL(config.supabaseUrl).host
      : null,
    supabaseKeyConfigured: Boolean(config.supabaseServiceRoleKey),
    supabaseKeySource: supabaseServiceRoleKey
      ? "SUPABASE_SERVICE_ROLE_KEY"
      : supabaseAnonKey
        ? "SUPABASE_ANON_KEY_FALLBACK"
        : "missing",
  };
}
