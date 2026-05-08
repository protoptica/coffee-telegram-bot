import { config } from "../config.js";
import { ensureDir } from "../utils/fs.js";

const photosDir = `${config.storageDir}/photos`;

function getSupabaseHeaders() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase storage backend requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...getSupabaseHeaders(),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function encode(value) {
  return encodeURIComponent(value);
}

function toSupabaseEntryRow(entry) {
  return {
    entry_id: entry.entryId,
    id: entry.id,
    user_id: entry.userId,
    chat_id: entry.chatId,
    telegram_photo_file_id: entry.telegramPhotoFileId,
    local_photo_path: entry.localPhotoPath,
    created_at: entry.createdAt,
    coffee_name: entry.coffeeName,
    roaster_name: entry.roasterName,
    origin_country: entry.originCountry,
    process: entry.process,
    variety: entry.variety,
    descriptors: entry.descriptors ?? [],
    raw_text: entry.rawText ?? null,
    rating: entry.rating ?? null,
    processing_message_id: entry.processingMessageId ?? null,
    rating_message_id: entry.ratingMessageId ?? null,
  };
}

function fromSupabaseEntryRow(row) {
  if (!row) return null;

  return {
    entryId: row.entry_id,
    id: row.id,
    userId: row.user_id,
    chatId: row.chat_id,
    telegramPhotoFileId: row.telegram_photo_file_id,
    localPhotoPath: row.local_photo_path,
    createdAt: row.created_at,
    coffeeName: row.coffee_name,
    roasterName: row.roaster_name,
    originCountry: row.origin_country,
    process: row.process,
    variety: row.variety,
    descriptors: row.descriptors ?? [],
    rawText: row.raw_text,
    rating: row.rating,
    processingMessageId: row.processing_message_id,
    ratingMessageId: row.rating_message_id,
  };
}

function toSupabasePendingRatingRow(ratingSessionId, pendingRating) {
  return {
    rating_session_id: ratingSessionId,
    user_id: pendingRating.userId,
    created_at: pendingRating.createdAt,
    payload: pendingRating,
  };
}

export async function initSupabaseStorage() {
  await ensureDir(photosDir);
}

export async function addSupabaseEntry(entry) {
  await supabaseRequest("coffee_entries", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify([toSupabaseEntryRow(entry)]),
  });
}

export async function listSupabaseEntriesForUser(userId, limit = 10) {
  const rows = await supabaseRequest(
    `coffee_entries?user_id=eq.${encode(userId)}&order=created_at.desc&limit=${limit}`
  );
  return rows.map(fromSupabaseEntryRow);
}

export async function getSupabaseLastEntryForUser(userId) {
  const entries = await listSupabaseEntriesForUser(userId, 1);
  return entries[0] ?? null;
}

export async function getSupabasePendingRating(ratingSessionId) {
  const rows = await supabaseRequest(
    `pending_ratings?rating_session_id=eq.${encode(ratingSessionId)}&limit=1`
  );
  return rows[0] ?? null;
}

export async function setSupabasePendingRating(ratingSessionId, pendingRating) {
  await supabaseRequest("pending_ratings", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([toSupabasePendingRatingRow(ratingSessionId, pendingRating)]),
  });
}

export async function clearSupabasePendingRating(ratingSessionId) {
  await supabaseRequest(`pending_ratings?rating_session_id=eq.${encode(ratingSessionId)}`, {
    method: "DELETE",
  });
}

export function getSupabasePhotosDir() {
  return photosDir;
}
