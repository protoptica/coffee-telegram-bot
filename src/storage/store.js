import path from "node:path";
import { config } from "../config.js";
import { ensureDir, readJson, writeJson } from "../utils/fs.js";

const entriesFile = path.join(config.storageDir, "entries.json");
const sessionsFile = path.join(config.storageDir, "sessions.json");
const pendingRatingsFile = path.join(config.storageDir, "pending-ratings.json");
const photosDir = path.join(config.storageDir, "photos");

export async function initStorage() {
  await ensureDir(config.storageDir);
  await ensureDir(photosDir);
}

export async function getEntries() {
  return readJson(entriesFile, []);
}

export async function saveEntries(entries) {
  await writeJson(entriesFile, entries);
}

export async function addEntry(entry) {
  const entries = await getEntries();
  entries.unshift(entry);
  await saveEntries(entries);
}

export async function listEntriesForUser(userId, limit = 10) {
  const entries = await getEntries();
  return entries.filter((entry) => entry.userId === userId).slice(0, limit);
}

export async function getLastEntryForUser(userId) {
  const entries = await listEntriesForUser(userId, 1);
  return entries[0] ?? null;
}

export async function getSessions() {
  return readJson(sessionsFile, {});
}

export async function getSession(userId) {
  const sessions = await getSessions();
  return sessions[String(userId)] ?? null;
}

export async function setSession(userId, session) {
  const sessions = await getSessions();
  sessions[String(userId)] = session;
  await writeJson(sessionsFile, sessions);
}

export async function clearSession(userId) {
  const sessions = await getSessions();
  delete sessions[String(userId)];
  await writeJson(sessionsFile, sessions);
}

export async function getPendingRatings() {
  return readJson(pendingRatingsFile, {});
}

export async function getPendingRating(ratingSessionId) {
  const pendingRatings = await getPendingRatings();
  return pendingRatings[String(ratingSessionId)] ?? null;
}

export async function setPendingRating(ratingSessionId, pendingRating) {
  const pendingRatings = await getPendingRatings();
  pendingRatings[String(ratingSessionId)] = pendingRating;
  await writeJson(pendingRatingsFile, pendingRatings);
}

export async function clearPendingRating(ratingSessionId) {
  const pendingRatings = await getPendingRatings();
  delete pendingRatings[String(ratingSessionId)];
  await writeJson(pendingRatingsFile, pendingRatings);
}

export function getPhotosDir() {
  return photosDir;
}
