import path from "node:path";
import { config } from "../config.js";
import { logInfo } from "../utils/logger.js";
import { ensureDir, readJson, writeJson } from "../utils/fs.js";

const entriesFile = path.join(config.storageDir, "entries.json");
const sessionsFile = path.join(config.storageDir, "sessions.json");
const pendingRatingsFile = path.join(config.storageDir, "pending-ratings.json");
const photosDir = path.join(config.storageDir, "photos");

export async function initJsonStorage() {
  await ensureDir(config.storageDir);
  await ensureDir(photosDir);
  logInfo("storage.json.initialized", {
    storageDir: config.storageDir,
    photosDir,
  });
}

export async function getJsonEntries() {
  return readJson(entriesFile, []);
}

export async function saveJsonEntries(entries) {
  await writeJson(entriesFile, entries);
}

export async function addJsonEntry(entry) {
  const entries = await getJsonEntries();
  entries.unshift(entry);
  await saveJsonEntries(entries);
}

export async function listJsonEntriesForUser(userId, limit = 10) {
  const entries = await getJsonEntries();
  return entries.filter((entry) => entry.userId === userId).slice(0, limit);
}

export async function getJsonLastEntryForUser(userId) {
  const entries = await listJsonEntriesForUser(userId, 1);
  return entries[0] ?? null;
}

export async function getJsonSessions() {
  return readJson(sessionsFile, {});
}

export async function getJsonSession(userId) {
  const sessions = await getJsonSessions();
  return sessions[String(userId)] ?? null;
}

export async function setJsonSession(userId, session) {
  const sessions = await getJsonSessions();
  sessions[String(userId)] = session;
  await writeJson(sessionsFile, sessions);
}

export async function clearJsonSession(userId) {
  const sessions = await getJsonSessions();
  delete sessions[String(userId)];
  await writeJson(sessionsFile, sessions);
}

export async function getJsonPendingRatings() {
  return readJson(pendingRatingsFile, {});
}

export async function getJsonPendingRating(ratingSessionId) {
  const pendingRatings = await getJsonPendingRatings();
  return pendingRatings[String(ratingSessionId)] ?? null;
}

export async function setJsonPendingRating(ratingSessionId, pendingRating) {
  const pendingRatings = await getJsonPendingRatings();
  pendingRatings[String(ratingSessionId)] = pendingRating;
  await writeJson(pendingRatingsFile, pendingRatings);
}

export async function clearJsonPendingRating(ratingSessionId) {
  const pendingRatings = await getJsonPendingRatings();
  delete pendingRatings[String(ratingSessionId)];
  await writeJson(pendingRatingsFile, pendingRatings);
}

export function getJsonPhotosDir() {
  return photosDir;
}
