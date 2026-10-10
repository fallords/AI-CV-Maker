import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyCV } from "@/lib/cv-schema";
import { sampleCV } from "@/lib/sample-cv";
import {
  BACKUP_KEY,
  CORRUPT_KEY,
  DRAFT_KEY,
  UI_LANG_KEY,
  deleteDraft,
  eraseAllLocalData,
  hasBackup,
  loadBackup,
  loadDraft,
  saveBackup,
  saveDraft,
  writePreference,
} from "@/lib/storage";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("local storage persistence", () => {
  it("returns empty when nothing is stored", () => {
    expect(loadDraft()).toEqual({ status: "empty" });
  });

  it("saves and recovers a draft (as after a browser refresh)", () => {
    const cv = sampleCV("graduate");
    const saved = saveDraft(cv);
    expect(saved.ok).toBe(true);
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY)!);
    expect(stored).toMatchObject({ schemaVersion: 1, data: { meta: { template: "graduate" } } });
    const loaded = loadDraft();
    expect(loaded.status).toBe("ok");
    if (loaded.status === "ok") {
      expect(loaded.data).toEqual(cv);
      expect(loaded.savedAt).toEqual(stored.savedAt);
    }
  });

  it("sets corrupted drafts aside instead of overwriting them", () => {
    localStorage.setItem(DRAFT_KEY, "{broken json");
    expect(loadDraft()).toEqual({ status: "corrupted" });
    expect(localStorage.getItem(CORRUPT_KEY)).toBe("{broken json");
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("treats drafts from an unknown future version as corrupted", () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ schemaVersion: 99, data: { schemaVersion: 99 } }));
    expect(loadDraft().status).toBe("corrupted");
  });

  it("reports unavailable storage without throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(saveDraft(createEmptyCV())).toEqual({ ok: false, reason: "unavailable" });
    expect(loadDraft()).toEqual({ status: "unavailable" });
  });

  it("reports a full storage quota", () => {
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === DRAFT_KEY) throw new DOMException("full", "QuotaExceededError");
      return original.call(this, key, value);
    });
    expect(saveDraft(sampleCV())).toEqual({ ok: false, reason: "quota" });
  });

  it("keeps a separate backup slot", () => {
    expect(hasBackup()).toBe(false);
    saveBackup(sampleCV());
    expect(hasBackup()).toBe(true);
    const b = loadBackup();
    expect(b.status === "ok" && b.data.personal.fullName).toBe("Alex Example");
  });

  it("deletes drafts but keeps preferences", () => {
    saveDraft(sampleCV());
    saveBackup(sampleCV());
    writePreference(UI_LANG_KEY, "id");
    expect(deleteDraft()).toBe(true);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(localStorage.getItem(UI_LANG_KEY)).toBe("id");
  });

  it("erases every key written by the app and nothing else", () => {
    saveDraft(sampleCV());
    writePreference(UI_LANG_KEY, "id");
    localStorage.setItem("other-app", "keep me");
    expect(eraseAllLocalData()).toBe(true);
    expect(Object.keys(localStorage)).toEqual(["other-app"]);
  });
});
