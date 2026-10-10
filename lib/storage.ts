/**
 * Browser-local persistence. Nothing here leaves the device.
 *
 * Keys:
 *   DRAFT_KEY      – the current draft (autosaved)
 *   BACKUP_KEY     – the previous draft, kept when the user starts a new CV
 *   CORRUPT_KEY    – raw contents of a draft that could not be read, kept so it is
 *                    not silently destroyed
 *   UI_LANG_KEY    – interface language preference
 *
 * Every access is wrapped: storage can be disabled (private mode, blocked
 * cookies), full (QuotaExceededError) or contain corrupted data.
 */

import { CV_SCHEMA_VERSION, type CVData } from "./cv-schema";
import { parseCVValue } from "./cv-validation";

export const STORAGE_PREFIX = "free-cv-maker:";
export const DRAFT_KEY = `${STORAGE_PREFIX}draft`;
export const BACKUP_KEY = `${STORAGE_PREFIX}backup`;
export const CORRUPT_KEY = `${STORAGE_PREFIX}corrupted`;
export const UI_LANG_KEY = `${STORAGE_PREFIX}ui-lang`;

export interface StoredDraft {
  schemaVersion: number;
  savedAt: string;
  data: CVData;
}

export type LoadResult =
  | { status: "empty" }
  | { status: "ok"; data: CVData; savedAt: string | null }
  | { status: "corrupted" }
  | { status: "unavailable" };

export type SaveResult = { ok: true; savedAt: string } | { ok: false; reason: "unavailable" | "quota" };

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = `${STORAGE_PREFIX}probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isStorageAvailable(): boolean {
  return getStorage() !== null;
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22)
  );
}

function write(key: string, cv: CVData): SaveResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: "unavailable" };
  const savedAt = new Date().toISOString();
  const payload: StoredDraft = { schemaVersion: CV_SCHEMA_VERSION, savedAt, data: cv };
  try {
    storage.setItem(key, JSON.stringify(payload));
    return { ok: true, savedAt };
  } catch (e) {
    return { ok: false, reason: isQuotaError(e) ? "quota" : "unavailable" };
  }
}

function read(key: string): LoadResult {
  const storage = getStorage();
  if (!storage) return { status: "unavailable" };
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { status: "unavailable" };
  }
  if (raw === null) return { status: "empty" };
  try {
    const value: unknown = JSON.parse(raw);
    const result = parseCVValue(value);
    if (!result.ok) throw new Error("invalid draft");
    const savedAt =
      typeof value === "object" && value && "savedAt" in value && typeof value.savedAt === "string"
        ? value.savedAt
        : null;
    return { status: "ok", data: result.data, savedAt };
  } catch {
    // Keep the unreadable data aside instead of overwriting it on the next autosave.
    try {
      storage.setItem(CORRUPT_KEY, raw);
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
    return { status: "corrupted" };
  }
}

export const saveDraft = (cv: CVData) => write(DRAFT_KEY, cv);
export const loadDraft = () => read(DRAFT_KEY);
export const saveBackup = (cv: CVData) => write(BACKUP_KEY, cv);
export const loadBackup = () => read(BACKUP_KEY);

export function hasBackup(): boolean {
  try {
    return getStorage()?.getItem(BACKUP_KEY) != null;
  } catch {
    return false;
  }
}

export function hasDraft(): boolean {
  try {
    return getStorage()?.getItem(DRAFT_KEY) != null;
  } catch {
    return false;
  }
}

export function deleteDraft(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(DRAFT_KEY);
    storage.removeItem(BACKUP_KEY);
    storage.removeItem(CORRUPT_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Remove every key this app has written, including preferences. */
export function eraseAllLocalData(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => storage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}

export function readPreference(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    /* preferences are best-effort */
  }
}
