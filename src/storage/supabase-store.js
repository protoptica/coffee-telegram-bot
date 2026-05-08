import { config } from "../config.js";
import { ensureDir } from "../utils/fs.js";

const photosDir = `${config.storageDir}/photos`;

function getSupabaseHeaders() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("Supabase storage backend requires SUPABASE_URL and SUPABASE_ANON_KEY.");
  }

  return {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
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

export async function initSupabaseStorage() {
  await ensureDir(photosDir);
}

export async function addSupabaseEntry(entry) {
  await supabaseRequest("coffee_entries", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify([entry]),
  });
}

export async function listSupabaseEntriesForUser(userId, limit = 10) {
  return supabaseRequest(
    `coffee_entries?userId=eq.${encode(userId)}&order=createdAt.desc&limit=${limit}`
  );
}

export async function getSupabaseLastEntryForUser(userId) {
  const entries = await listSupabaseEntriesForUser(userId, 1);
  return entries[0] ?? null;
}

export async function getSupabasePendingRating(ratingSessionId) {
  const rows = await supabaseRequest(
    `pending_ratings?ratingSessionId=eq.${encode(ratingSessionId)}&limit=1`
  );
  return rows[0] ?? null;
}

export async function setSupabasePendingRating(ratingSessionId, pendingRating) {
  await supabaseRequest("pending_ratings", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([
      {
        ratingSessionId,
        payload: pendingRating,
        userId: pendingRating.userId,
        createdAt: pendingRating.createdAt,
      },
    ]),
  });
}

export async function clearSupabasePendingRating(ratingSessionId) {
  await supabaseRequest(`pending_ratings?ratingSessionId=eq.${encode(ratingSessionId)}`, {
    method: "DELETE",
  });
}

export function getSupabasePhotosDir() {
  return photosDir;
}
