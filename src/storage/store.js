import { config } from "../config.js";
import {
  addJsonEntry,
  clearJsonPendingRating,
  clearJsonSession,
  getJsonLastEntryForUser,
  getJsonPendingRating,
  getJsonPhotosDir,
  getJsonSession,
  initJsonStorage,
  listJsonEntriesForUser,
  setJsonPendingRating,
  setJsonSession,
} from "./json-store.js";
import {
  addSupabaseEntry,
  clearSupabasePendingRating,
  getSupabaseLastEntryForUser,
  getSupabasePendingRating,
  getSupabasePhotosDir,
  initSupabaseStorage,
  listSupabaseEntriesForUser,
  setSupabasePendingRating,
} from "./supabase-store.js";

export async function initStorage() {
  if (config.storageBackend === "supabase") {
    await initSupabaseStorage();
    return;
  }

  await initJsonStorage();
}

export async function addEntry(entry) {
  if (config.storageBackend === "supabase") {
    return addSupabaseEntry(entry);
  }

  return addJsonEntry(entry);
}

export async function listEntriesForUser(userId, limit = 10) {
  if (config.storageBackend === "supabase") {
    return listSupabaseEntriesForUser(userId, limit);
  }

  return listJsonEntriesForUser(userId, limit);
}

export async function getLastEntryForUser(userId) {
  if (config.storageBackend === "supabase") {
    return getSupabaseLastEntryForUser(userId);
  }

  return getJsonLastEntryForUser(userId);
}

export async function getSession(userId) {
  if (config.storageBackend === "supabase") {
    return null;
  }

  return getJsonSession(userId);
}

export async function setSession(userId, session) {
  if (config.storageBackend === "supabase") {
    return;
  }

  await setJsonSession(userId, session);
}

export async function clearSession(userId) {
  if (config.storageBackend === "supabase") {
    return;
  }

  await clearJsonSession(userId);
}

export async function getPendingRating(ratingSessionId) {
  if (config.storageBackend === "supabase") {
    const row = await getSupabasePendingRating(ratingSessionId);
    return row?.payload ?? null;
  }

  return getJsonPendingRating(ratingSessionId);
}

export async function setPendingRating(ratingSessionId, pendingRating) {
  if (config.storageBackend === "supabase") {
    return setSupabasePendingRating(ratingSessionId, pendingRating);
  }

  return setJsonPendingRating(ratingSessionId, pendingRating);
}

export async function clearPendingRating(ratingSessionId) {
  if (config.storageBackend === "supabase") {
    return clearSupabasePendingRating(ratingSessionId);
  }

  return clearJsonPendingRating(ratingSessionId);
}

export function getPhotosDir() {
  if (config.storageBackend === "supabase") {
    return getSupabasePhotosDir();
  }

  return getJsonPhotosDir();
}
