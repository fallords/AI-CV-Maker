import { afterEach, describe, expect, it, vi } from "vitest";
import { CV_SCHEMA_VERSION, createEmptyCV } from "@/lib/cv-schema";
import {
  ACTIVE_DOC_KEY,
  CORRUPT_BACKUP_KEY,
  CORRUPT_DOC_KEY,
  CORRUPT_DRAFT_KEY,
  DOCS_INDEX_KEY,
  DOC_KEY,
  MAX_DOC_NAME,
  createDoc,
  defaultDocName,
  deleteDoc,
  docFileBase,
  docLanguage,
  duplicateDoc,
  getActiveDocId,
  isDocEmpty,
  listDocs,
  loadDoc,
  migrateLegacyStorage,
  renameDoc,
  saveDoc,
  setActiveDocId,
  type AnyDoc,
} from "@/lib/documents";
import { LETTER_SCHEMA_VERSION, createEmptyLetter } from "@/lib/letter-schema";
import { richSampleCV, sampleCV, sampleLetter } from "@/lib/sample-cv";
import { BACKUP_KEY, CORRUPT_KEY, DRAFT_KEY, UI_LANG_KEY, eraseAllLocalData } from "@/lib/storage";

const cvDoc = (name = "Alex Example"): AnyDoc => {
  const data = sampleCV();
  data.personal.fullName = name;
  return { kind: "cv", data };
};
const letterDoc = (): AnyDoc => ({ kind: "letter", data: sampleLetter() });

function at(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

function created(result: ReturnType<typeof createDoc>) {
  if (!result.ok) throw new Error(`createDoc failed: ${result.reason}`);
  return result.meta;
}

function denyStorage() {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("denied", "SecurityError");
  });
}

/** A completely full storage: every write that would use more space fails with a quota error. */
function storageFull() {
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
    const current = this.getItem(key);
    if (current === null || value.length > current.length) throw new DOMException("full", "QuotaExceededError");
    return original.call(this, key, value);
  });
}

function quotaFor(match: (key: string) => boolean) {
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
    if (match(key)) throw new DOMException("full", "QuotaExceededError");
    return original.call(this, key, value);
  });
}

/** Legacy v1 app payload (as written by saveDraft before documents existed). */
function legacyPayload(data: unknown, savedAt = "2025-05-01T10:00:00.000Z") {
  return JSON.stringify({ schemaVersion: 1, savedAt, data });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("creating and listing documents", () => {
  it("lists nothing and writes nothing when storage is empty", () => {
    expect(listDocs()).toEqual([]);
    expect(localStorage.getItem(DOCS_INDEX_KEY)).toBeNull();
  });

  it("creates a CV document with its own key and index entry", () => {
    at("2026-10-13T10:00:00.000Z");
    const meta = created(createDoc(cvDoc(), "My CV"));
    expect(meta).toEqual({
      id: expect.stringMatching(/^[\w-]+$/),
      kind: "cv",
      name: "My CV",
      createdAt: "2026-10-13T10:00:00.000Z",
      updatedAt: "2026-10-13T10:00:00.000Z",
    });
    expect(JSON.parse(localStorage.getItem(DOC_KEY(meta.id))!)).toEqual({
      schemaVersion: CV_SCHEMA_VERSION,
      savedAt: "2026-10-13T10:00:00.000Z",
      kind: "cv",
      name: "My CV",
      createdAt: "2026-10-13T10:00:00.000Z",
      data: cvDoc().data,
    });
    expect(JSON.parse(localStorage.getItem(DOCS_INDEX_KEY)!)).toEqual([meta]);
    expect(listDocs()).toEqual([meta]);
  });

  it("creates letters with the letter schema version", () => {
    const meta = created(createDoc(letterDoc(), "Letter"));
    expect(meta.kind).toBe("letter");
    expect(JSON.parse(localStorage.getItem(DOC_KEY(meta.id))!)).toMatchObject({
      schemaVersion: LETTER_SCHEMA_VERSION,
      kind: "letter",
    });
  });

  it("names documents by default when the name is blank and tidies names", () => {
    expect(created(createDoc(cvDoc("Jane Doe"), "   ")).name).toBe("Jane Doe");
    expect(created(createDoc({ kind: "cv", data: createEmptyCV("id") }, "")).name).toBe("CV tanpa judul");
    expect(created(createDoc(letterDoc(), "")).name).toBe("Cover letter – Example Analytics Ltd.");
    expect(created(createDoc(cvDoc(), "  Two \n  words ")).name).toBe("Two words");
    expect(created(createDoc(cvDoc(), "x".repeat(500))).name).toHaveLength(MAX_DOC_NAME);
  });

  it("gives every document a different id", () => {
    const ids = Array.from({ length: 20 }, () => created(createDoc(cvDoc(), "n")).id);
    expect(new Set(ids).size).toBe(20);
  });

  it("lists the most recently updated document first", () => {
    at("2026-01-01T00:00:00.000Z");
    const a = created(createDoc(cvDoc("A"), "A"));
    at("2026-01-02T00:00:00.000Z");
    const b = created(createDoc(cvDoc("B"), "B"));
    at("2026-01-03T00:00:00.000Z");
    const c = created(createDoc(letterDoc(), "C"));
    expect(listDocs().map((m) => m.id)).toEqual([c.id, b.id, a.id]);

    at("2026-01-04T00:00:00.000Z");
    expect(saveDoc(a.id, cvDoc("A2")).ok).toBe(true);
    expect(listDocs().map((m) => m.id)).toEqual([a.id, c.id, b.id]);
  });
});

describe("loading and saving", () => {
  it("loads what was saved", () => {
    const meta = created(createDoc({ kind: "cv", data: richSampleCV("graduate") }, "Rich"));
    const loaded = loadDoc(meta.id);
    expect(loaded).toEqual({ status: "ok", doc: { kind: "cv", data: richSampleCV("graduate") }, meta });

    const letter = created(createDoc(letterDoc(), "L"));
    expect(loadDoc(letter.id)).toEqual({ status: "ok", doc: letterDoc(), meta: letter });
  });

  it("updates updatedAt but keeps the name and creation time", () => {
    at("2026-01-01T00:00:00.000Z");
    const meta = created(createDoc(cvDoc(), "Keep me"));
    at("2026-02-01T00:00:00.000Z");
    const saved = saveDoc(meta.id, cvDoc("Changed Name"));
    expect(saved).toEqual({ ok: true, savedAt: "2026-02-01T00:00:00.000Z" });
    const loaded = loadDoc(meta.id);
    expect(loaded.status).toBe("ok");
    if (loaded.status !== "ok") return;
    expect(loaded.meta).toEqual({ ...meta, updatedAt: "2026-02-01T00:00:00.000Z" });
    expect(loaded.doc.kind === "cv" && loaded.doc.data.personal.fullName).toBe("Changed Name");
  });

  it("adds a saved document back to the index instead of losing it", () => {
    at("2026-01-01T00:00:00.000Z");
    const meta = created(createDoc(cvDoc(), "Mine"));
    localStorage.setItem(DOCS_INDEX_KEY, "[]");
    at("2026-02-01T00:00:00.000Z");
    expect(saveDoc(meta.id, cvDoc("Back Again")).ok).toBe(true);
    // The name and creation time the document was stored with are kept.
    expect(listDocs()).toEqual([{ ...meta, updatedAt: "2026-02-01T00:00:00.000Z" }]);
  });

  it("names a saved document that was never indexed after its content", () => {
    expect(saveDoc("fresh1", cvDoc("Brand New")).ok).toBe(true);
    expect(listDocs()).toEqual([expect.objectContaining({ id: "fresh1", name: "Brand New", kind: "cv" })]);
  });

  it("stores the name and creation time with the document on every save", () => {
    at("2026-01-01T00:00:00.000Z");
    const meta = created(createDoc(cvDoc(), "Keep me"));
    at("2026-03-01T00:00:00.000Z");
    expect(saveDoc(meta.id, cvDoc("Changed")).ok).toBe(true);
    expect(JSON.parse(localStorage.getItem(DOC_KEY(meta.id))!)).toMatchObject({
      savedAt: "2026-03-01T00:00:00.000Z",
      name: "Keep me",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("keeps working when storage is completely full: reads and deletes succeed, saves report quota", () => {
    const a = created(createDoc(cvDoc("A"), "A"));
    const b = created(createDoc(cvDoc("B"), "B"));
    setActiveDocId(a.id);
    storageFull();
    expect(listDocs().map((m) => m.id).sort()).toEqual([a.id, b.id].sort());
    const loaded = loadDoc(a.id);
    expect(loaded.status === "ok" && loaded.doc.kind === "cv" && loaded.doc.data.personal.fullName).toBe("A");
    expect(getActiveDocId()).toBe(a.id);
    expect(saveDoc(a.id, cvDoc("A2"))).toEqual({ ok: false, reason: "quota" });
    expect(createDoc(cvDoc(), "New")).toEqual({ ok: false, reason: "quota" });
    expect(duplicateDoc(a.id, "Copy")).toEqual({ ok: false, reason: "quota" });
    // Deleting frees space even though nothing can be written.
    expect(deleteDoc(b.id)).toBe(true);
    expect(localStorage.getItem(DOC_KEY(b.id))).toBeNull();
    vi.restoreAllMocks();
    expect(listDocs().map((m) => m.id)).toEqual([a.id]);
  });

  it("reports missing documents and drops their stale index entries", () => {
    expect(loadDoc("nothing-here")).toEqual({ status: "missing" });
    expect(loadDoc("../bad id")).toEqual({ status: "missing" });
    const meta = created(createDoc(cvDoc(), "Gone"));
    localStorage.removeItem(DOC_KEY(meta.id));
    expect(loadDoc(meta.id)).toEqual({ status: "missing" });
    expect(listDocs()).toEqual([]);
  });

  it("sets corrupted documents aside", () => {
    const keep = created(createDoc(cvDoc("Keep"), "Keep"));
    const bad = created(createDoc(cvDoc("Bad"), "Bad"));
    setActiveDocId(bad.id);
    localStorage.setItem(DOC_KEY(bad.id), "{broken");
    expect(loadDoc(bad.id)).toEqual({ status: "corrupted" });
    expect(localStorage.getItem(CORRUPT_DOC_KEY(bad.id))).toBe("{broken");
    expect(localStorage.getItem(DOC_KEY(bad.id))).toBeNull();
    expect(listDocs().map((m) => m.id)).toEqual([keep.id]);
    expect(getActiveDocId()).toBeNull();
    // A second attempt does not overwrite the kept copy.
    expect(loadDoc(bad.id)).toEqual({ status: "missing" });
    expect(localStorage.getItem(CORRUPT_DOC_KEY(bad.id))).toBe("{broken");
  });

  it("treats documents from a newer version as corrupted", () => {
    const meta = created(createDoc(cvDoc(), "Future"));
    localStorage.setItem(DOC_KEY(meta.id), JSON.stringify({ schemaVersion: 9, kind: "cv", data: { schemaVersion: 9 } }));
    expect(loadDoc(meta.id)).toEqual({ status: "corrupted" });
    const letter = created(createDoc(letterDoc(), "Future letter"));
    localStorage.setItem(
      DOC_KEY(letter.id),
      JSON.stringify({ schemaVersion: 5, kind: "letter", data: { ...sampleLetter(), schemaVersion: 5 } }),
    );
    expect(loadDoc(letter.id)).toEqual({ status: "corrupted" });
  });

  it("migrates a v1 CV stored inside a document", () => {
    const meta = created(createDoc(cvDoc(), "Old"));
    const { languages: _l, organizations: _o, awards: _a, references: _r, interests: _i, customSections: _c, ...v1 } =
      sampleCV();
    void [_l, _o, _a, _r, _i, _c];
    localStorage.setItem(
      DOC_KEY(meta.id),
      JSON.stringify({ schemaVersion: 1, savedAt: "x", kind: "cv", data: { ...v1, schemaVersion: 1, meta: { template: "graduate" } } }),
    );
    const loaded = loadDoc(meta.id);
    expect(loaded.status).toBe("ok");
    if (loaded.status !== "ok" || loaded.doc.kind !== "cv") return;
    expect(loaded.doc.data.schemaVersion).toBe(2);
    expect(loaded.doc.data.meta.template).toBe("graduate");
    expect(loaded.doc.data.customSections).toEqual([]);
  });

  it("reports a full storage quota without losing the previous version", () => {
    const meta = created(createDoc(cvDoc("Before"), "Doc"));
    quotaFor((key) => key === DOC_KEY(meta.id));
    expect(saveDoc(meta.id, cvDoc("After"))).toEqual({ ok: false, reason: "quota" });
    vi.restoreAllMocks();
    const loaded = loadDoc(meta.id);
    expect(loaded.status === "ok" && loaded.doc.kind === "cv" && loaded.doc.data.personal.fullName).toBe("Before");
  });

  it("does not leave a stray document behind when the index cannot be written", () => {
    quotaFor((key) => key === DOCS_INDEX_KEY);
    expect(createDoc(cvDoc(), "No room")).toEqual({ ok: false, reason: "quota" });
    vi.restoreAllMocks();
    expect(Object.keys(localStorage).filter((k) => k.startsWith("free-cv-maker:doc:"))).toEqual([]);
    expect(listDocs()).toEqual([]);
  });

  it("reports a full quota when creating", () => {
    quotaFor((key) => key.startsWith("free-cv-maker:doc:"));
    expect(createDoc(cvDoc(), "Too big")).toEqual({ ok: false, reason: "quota" });
  });
});

describe("index recovery", () => {
  it("rebuilds a corrupted index from the stored documents, keeping names and creation times", () => {
    at("2026-01-01T00:00:00.000Z");
    const a = created(createDoc(cvDoc("Ana Example"), "Custom name"));
    const b = created(createDoc(letterDoc(), "Letter"));
    at("2026-02-01T00:00:00.000Z");
    expect(saveDoc(a.id, cvDoc("Ana Example")).ok).toBe(true);
    expect(renameDoc(b.id, "Renamed letter")).toBe(true);
    localStorage.setItem(DOCS_INDEX_KEY, "{not json");
    const list = listDocs();
    expect(list.map((m) => m.id).sort()).toEqual([a.id, b.id].sort());
    expect(list.find((m) => m.id === a.id)).toEqual({
      id: a.id,
      kind: "cv",
      name: "Custom name",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
    expect(list.find((m) => m.id === b.id)).toEqual({
      id: b.id,
      kind: "letter",
      name: "Renamed letter",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(Array.isArray(JSON.parse(localStorage.getItem(DOCS_INDEX_KEY)!))).toBe(true);
  });

  it("falls back to default names for documents stored without a valid name", () => {
    localStorage.setItem(
      DOC_KEY("old1"),
      JSON.stringify({ schemaVersion: 2, savedAt: "2026-01-01T00:00:00.000Z", kind: "cv", name: 42, createdAt: "never", data: sampleCV() }),
    );
    expect(listDocs()).toEqual([
      { id: "old1", kind: "cv", name: "Alex Example", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("never lists blank names from a hostile index", () => {
    const a = created(createDoc(cvDoc("A"), "Chosen"));
    localStorage.setItem(
      DOCS_INDEX_KEY,
      JSON.stringify([
        { id: a.id, kind: "cv", name: { evil: true }, createdAt: "x", updatedAt: "x" },
        { id: "ghost", kind: "cv", name: "   ", createdAt: "x", updatedAt: "x" },
        { id: "ghost2", kind: "letter", name: null },
      ]),
    );
    const list = listDocs();
    expect(list.map((m) => m.id)).toEqual([a.id]);
    expect(list[0].name).toBe("Chosen");
    expect(list.every((m) => m.name.trim().length > 0)).toBe(true);
  });

  it("rejects ids that name Object.prototype members", () => {
    localStorage.setItem(DOC_KEY("__proto__"), JSON.stringify({ schemaVersion: 2, savedAt: "x", kind: "cv", data: sampleCV() }));
    localStorage.setItem(DOCS_INDEX_KEY, JSON.stringify([{ id: "constructor", kind: "cv", name: "C" }]));
    expect(listDocs()).toEqual([]);
    expect(loadDoc("__proto__")).toEqual({ status: "missing" });
    expect(saveDoc("prototype", cvDoc())).toEqual({ ok: false, reason: "unavailable" });
    localStorage.setItem(ACTIVE_DOC_KEY, "constructor");
    expect(getActiveDocId()).toBeNull();
  });

  it("drops malformed and duplicate index entries", () => {
    const a = created(createDoc(cvDoc(), "A"));
    const index = JSON.parse(localStorage.getItem(DOCS_INDEX_KEY)!);
    localStorage.setItem(
      DOCS_INDEX_KEY,
      JSON.stringify([...index, index[0], { id: "<x>", kind: "cv" }, { id: "y", kind: "invoice" }, "junk", null]),
    );
    expect(listDocs().map((m) => m.id)).toEqual([a.id]);
  });

  it("lists readable documents that are missing from the index and sets unreadable ones aside", () => {
    localStorage.setItem(DOC_KEY("orphan1"), JSON.stringify({ schemaVersion: 2, savedAt: "2026-01-01T00:00:00.000Z", kind: "cv", data: sampleCV() }));
    localStorage.setItem(DOC_KEY("orphan2"), "garbage");
    const list = listDocs();
    expect(list).toEqual([
      {
        id: "orphan1",
        kind: "cv",
        name: "Alex Example",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(localStorage.getItem(CORRUPT_DOC_KEY("orphan2"))).toBe("garbage");
    expect(localStorage.getItem(DOC_KEY("orphan2"))).toBeNull();
  });

  it("adds a meta entry when loading a document that is not indexed", () => {
    localStorage.setItem(DOC_KEY("solo"), JSON.stringify({ schemaVersion: 1, savedAt: "2026-01-01T00:00:00.000Z", kind: "letter", data: sampleLetter() }));
    localStorage.setItem(DOCS_INDEX_KEY, "[]");
    const loaded = loadDoc("solo");
    expect(loaded.status).toBe("ok");
    if (loaded.status === "ok") expect(loaded.meta).toMatchObject({ id: "solo", kind: "letter" });
    expect(listDocs().map((m) => m.id)).toEqual(["solo"]);
  });
});

describe("rename, duplicate, delete and active document", () => {
  it("renames documents", () => {
    const meta = created(createDoc(cvDoc(), "Old"));
    expect(renameDoc(meta.id, "  New   name ")).toBe(true);
    expect(listDocs()[0].name).toBe("New name");
    expect(renameDoc(meta.id, "   ")).toBe(false);
    expect(renameDoc("unknown", "Name")).toBe(false);
    expect(listDocs()[0].name).toBe("New name");
    expect(renameDoc(meta.id, "y".repeat(300))).toBe(true);
    expect(listDocs()[0].name).toHaveLength(MAX_DOC_NAME);
  });

  it("keeps the new name in the stored copy so it survives an index rebuild", () => {
    const meta = created(createDoc(cvDoc(), "Old"));
    const before = loadDoc(meta.id);
    expect(renameDoc(meta.id, "New name")).toBe(true);
    expect(JSON.parse(localStorage.getItem(DOC_KEY(meta.id))!)).toMatchObject({ name: "New name", createdAt: meta.createdAt });
    // The content is untouched.
    const after = loadDoc(meta.id);
    expect(after.status === "ok" && after.doc).toEqual(before.status === "ok" && before.doc);
    localStorage.removeItem(DOCS_INDEX_KEY);
    expect(listDocs()).toEqual([{ ...meta, name: "New name" }]);
  });

  it("still renames in the index when the stored copy cannot be rewritten", () => {
    const meta = created(createDoc(cvDoc(), "Old"));
    quotaFor((key) => key === DOC_KEY(meta.id));
    expect(renameDoc(meta.id, "New")).toBe(true);
    vi.restoreAllMocks();
    expect(listDocs()[0].name).toBe("New");
  });

  it("duplicates a document under a new id and name", () => {
    const meta = created(createDoc({ kind: "cv", data: richSampleCV() }, "Original"));
    const copy = created(duplicateDoc(meta.id, "Original (copy)"));
    expect(copy.id).not.toBe(meta.id);
    expect(copy.name).toBe("Original (copy)");
    const a = loadDoc(meta.id);
    const b = loadDoc(copy.id);
    expect(a.status === "ok" && b.status === "ok" && b.doc).toEqual(a.status === "ok" && a.doc);
    expect(listDocs()).toHaveLength(2);
    // Changing the copy leaves the original alone.
    saveDoc(copy.id, cvDoc("Someone Else"));
    const again = loadDoc(meta.id);
    expect(again.status === "ok" && again.doc.kind === "cv" && again.doc.data.personal.fullName).toBe("Alex Example");
  });

  it("refuses to duplicate a missing document", () => {
    expect(duplicateDoc("missing", "Copy")).toEqual({ ok: false, reason: "unavailable" });
  });

  it("deletes a document and clears the active id only when it pointed there", () => {
    const a = created(createDoc(cvDoc("A"), "A"));
    const b = created(createDoc(cvDoc("B"), "B"));
    setActiveDocId(a.id);
    expect(deleteDoc(b.id)).toBe(true);
    expect(getActiveDocId()).toBe(a.id);
    expect(localStorage.getItem(DOC_KEY(b.id))).toBeNull();
    expect(listDocs().map((m) => m.id)).toEqual([a.id]);

    expect(deleteDoc(a.id)).toBe(true);
    expect(getActiveDocId()).toBeNull();
    expect(listDocs()).toEqual([]);
    expect(deleteDoc("never-existed")).toBe(true);
  });

  it("stores the active document id", () => {
    expect(getActiveDocId()).toBeNull();
    setActiveDocId("abc123");
    expect(getActiveDocId()).toBe("abc123");
    expect(localStorage.getItem(ACTIVE_DOC_KEY)).toBe("abc123");
    localStorage.setItem(ACTIVE_DOC_KEY, "<script>");
    expect(getActiveDocId()).toBeNull();
  });

  it("is removed by erasing all local data", () => {
    const meta = created(createDoc(cvDoc(), "A"));
    setActiveDocId(meta.id);
    localStorage.setItem("other-app", "keep");
    expect(eraseAllLocalData()).toBe(true);
    expect(Object.keys(localStorage)).toEqual(["other-app"]);
    expect(listDocs()).toEqual([]);
  });
});

describe("unavailable storage", () => {
  it("never throws and reports unavailability", () => {
    denyStorage();
    expect(listDocs()).toEqual([]);
    expect(loadDoc("abc")).toEqual({ status: "unavailable" });
    expect(saveDoc("abc", cvDoc())).toEqual({ ok: false, reason: "unavailable" });
    expect(createDoc(cvDoc(), "x")).toEqual({ ok: false, reason: "unavailable" });
    expect(duplicateDoc("abc", "x")).toEqual({ ok: false, reason: "unavailable" });
    expect(renameDoc("abc", "x")).toBe(false);
    expect(deleteDoc("abc")).toBe(false);
    expect(getActiveDocId()).toBeNull();
    expect(() => setActiveDocId("abc")).not.toThrow();
    expect(migrateLegacyStorage()).toEqual({ migrated: [], corrupted: false });
  });
});

describe("document helpers", () => {
  it("builds default names in both languages", () => {
    expect(defaultDocName(cvDoc("Jane Doe"), "en")).toBe("Jane Doe");
    expect(defaultDocName({ kind: "cv", data: createEmptyCV() }, "en")).toBe("Untitled CV");
    expect(defaultDocName({ kind: "cv", data: createEmptyCV() }, "id")).toBe("CV tanpa judul");
    expect(defaultDocName({ kind: "letter", data: createEmptyLetter("en") }, "en")).toBe("Cover letter");
    expect(defaultDocName({ kind: "letter", data: createEmptyLetter("id") }, "id")).toBe("Surat lamaran");
    expect(defaultDocName(letterDoc(), "en")).toBe("Cover letter – Example Analytics Ltd.");
    expect(defaultDocName(letterDoc(), "id")).toBe("Surat lamaran – Example Analytics Ltd.");
  });

  it("builds file names", () => {
    expect(docFileBase(cvDoc("Jane Doe"))).toBe("Jane_Doe_CV");
    expect(docFileBase(cvDoc("Dewi Ayu Lestari"))).toBe("Dewi_Ayu_Lestari_CV");
    expect(docFileBase({ kind: "cv", data: createEmptyCV() })).toBe("CV");
    const letter = sampleLetter();
    letter.sender.fullName = "José Núñez";
    expect(docFileBase({ kind: "letter", data: letter })).toBe("Jose_Nunez_Cover_Letter");
    expect(docFileBase({ kind: "letter", data: createEmptyLetter("en") })).toBe("Cover_Letter");
  });

  it("knows the language and emptiness of each kind", () => {
    expect(docLanguage({ kind: "cv", data: createEmptyCV("id") })).toBe("id");
    expect(docLanguage({ kind: "letter", data: createEmptyLetter("id") })).toBe("id");
    expect(isDocEmpty({ kind: "cv", data: createEmptyCV() })).toBe(true);
    expect(isDocEmpty(cvDoc())).toBe(false);
    expect(isDocEmpty({ kind: "letter", data: createEmptyLetter("en") })).toBe(true);
    expect(isDocEmpty(letterDoc())).toBe(false);
  });
});

describe("migrating the legacy single draft", () => {
  it("does nothing when there is no legacy data", () => {
    expect(migrateLegacyStorage()).toEqual({ migrated: [], corrupted: false });
    expect(localStorage.getItem(DOCS_INDEX_KEY)).toBeNull();
  });

  it("moves draft and backup into two documents and opens the draft", () => {
    const backup = sampleCV("graduate");
    backup.personal.fullName = "Backup Person";
    localStorage.setItem(DRAFT_KEY, legacyPayload(richSampleCV("modern-professional"), "2025-06-01T08:00:00.000Z"));
    localStorage.setItem(BACKUP_KEY, legacyPayload(backup, "2025-05-01T08:00:00.000Z"));

    const result = migrateLegacyStorage();
    expect(result.corrupted).toBe(false);
    expect(result.migrated).toHaveLength(2);
    const [draftMeta, backupMeta] = result.migrated;
    expect(draftMeta).toMatchObject({ kind: "cv", name: "Alex Example", updatedAt: "2025-06-01T08:00:00.000Z" });
    expect(backupMeta).toMatchObject({ kind: "cv", name: "Backup Person", updatedAt: "2025-05-01T08:00:00.000Z" });
    expect(getActiveDocId()).toBe(draftMeta.id);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(listDocs().map((m) => m.id)).toEqual([draftMeta.id, backupMeta.id]);

    const draft = loadDoc(draftMeta.id);
    expect(draft.status === "ok" && draft.doc).toEqual({ kind: "cv", data: richSampleCV("modern-professional") });
    const old = loadDoc(backupMeta.id);
    expect(old.status === "ok" && old.doc).toEqual({ kind: "cv", data: backup });
  });

  it("is idempotent", () => {
    localStorage.setItem(DRAFT_KEY, legacyPayload(sampleCV()));
    localStorage.setItem(BACKUP_KEY, legacyPayload(sampleCV()));
    expect(migrateLegacyStorage().migrated).toHaveLength(2);
    const after = listDocs();
    expect(migrateLegacyStorage()).toEqual({ migrated: [], corrupted: false });
    expect(listDocs()).toEqual(after);
  });

  it("migrates legacy keys left behind after documents exist", () => {
    const existing = created(createDoc(cvDoc(), "Existing"));
    localStorage.setItem(DRAFT_KEY, legacyPayload(sampleCV("graduate")));
    const result = migrateLegacyStorage();
    expect(result.migrated).toHaveLength(1);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(listDocs().map((m) => m.id).sort()).toEqual([existing.id, result.migrated[0].id].sort());
    expect(getActiveDocId()).toBe(result.migrated[0].id);
    // The existing document is untouched and a second run is a no-op.
    const snapshot = { ...localStorage };
    expect(migrateLegacyStorage()).toEqual({ migrated: [], corrupted: false });
    expect({ ...localStorage }).toEqual(snapshot);
  });

  it("recovers a draft that did not fit, even after the app created a fresh document", () => {
    localStorage.setItem(DRAFT_KEY, legacyPayload(sampleCV("graduate")));
    quotaFor((key) => key.startsWith("free-cv-maker:doc:"));
    expect(migrateLegacyStorage()).toEqual({ migrated: [], corrupted: false });
    vi.restoreAllMocks();
    // Start-up flow: no document to open, so an empty one is created and opened.
    const fresh = created(createDoc({ kind: "cv", data: createEmptyCV() }, ""));
    setActiveDocId(fresh.id);
    expect(localStorage.getItem(DOCS_INDEX_KEY)).not.toBeNull();

    const result = migrateLegacyStorage();
    expect(result.migrated).toHaveLength(1);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(getActiveDocId()).toBe(result.migrated[0].id);
    const loaded = loadDoc(result.migrated[0].id);
    expect(loaded.status === "ok" && loaded.doc).toEqual({ kind: "cv", data: sampleCV("graduate") });
    expect(listDocs()).toHaveLength(2);
  });

  it("recovers a backup that did not fit without taking over the migrated draft", () => {
    const backup = sampleCV();
    backup.personal.fullName = "Backup Person";
    localStorage.setItem(DRAFT_KEY, legacyPayload(sampleCV("graduate")));
    localStorage.setItem(BACKUP_KEY, legacyPayload(backup));
    let docWrites = 0;
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.startsWith("free-cv-maker:doc:") && ++docWrites > 1) throw new DOMException("full", "QuotaExceededError");
      return original.call(this, key, value);
    });
    const first = migrateLegacyStorage();
    vi.restoreAllMocks();
    expect(first.migrated).toHaveLength(1);
    const draftId = first.migrated[0].id;
    expect(getActiveDocId()).toBe(draftId);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_KEY)).not.toBeNull();

    const second = migrateLegacyStorage();
    expect(second.migrated).toEqual([expect.objectContaining({ name: "Backup Person" })]);
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(getActiveDocId()).toBe(draftId);
    expect(listDocs()).toHaveLength(2);
  });

  it("does not overwrite older corrupted data with a newly corrupted draft", () => {
    localStorage.setItem(CORRUPT_KEY, "OLDER-CORRUPT");
    localStorage.setItem(DRAFT_KEY, "{newer bad");
    expect(migrateLegacyStorage()).toEqual({ migrated: [], corrupted: true });
    expect(localStorage.getItem(CORRUPT_KEY)).toBe("OLDER-CORRUPT");
    expect(localStorage.getItem(CORRUPT_DRAFT_KEY)).toBe("{newer bad");
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    // Later corruptions get numbered keys instead of replacing either copy.
    localStorage.setItem(DRAFT_KEY, "{third");
    localStorage.setItem(BACKUP_KEY, "{fourth");
    localStorage.setItem(CORRUPT_BACKUP_KEY, "OLDER-BACKUP");
    expect(migrateLegacyStorage()).toEqual({ migrated: [], corrupted: true });
    expect(localStorage.getItem(CORRUPT_KEY)).toBe("OLDER-CORRUPT");
    expect(localStorage.getItem(CORRUPT_DRAFT_KEY)).toBe("{newer bad");
    expect(localStorage.getItem(`${CORRUPT_DRAFT_KEY}:2`)).toBe("{third");
    expect(localStorage.getItem(CORRUPT_BACKUP_KEY)).toBe("OLDER-BACKUP");
    expect(localStorage.getItem(`${CORRUPT_BACKUP_KEY}:2`)).toBe("{fourth");
  });

  it("migrates v1 data, unversioned drafts included", () => {
    const v1 = {
      meta: { template: "graduate", cvLanguage: "id" },
      personal: { fullName: "Lama" },
      experience: [{ id: "e1", jobTitle: "Staf" }],
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: "2025-01-01T00:00:00.000Z", data: v1 }));
    const [meta] = migrateLegacyStorage().migrated;
    const loaded = loadDoc(meta.id);
    expect(loaded.status).toBe("ok");
    if (loaded.status !== "ok" || loaded.doc.kind !== "cv") return;
    expect(loaded.doc.data).toMatchObject({
      schemaVersion: 2,
      meta: { template: "graduate", cvLanguage: "id", sectionOrder: [], hiddenSections: [] },
      personal: { fullName: "Lama" },
      languages: [],
      customSections: [],
    });
    expect(loaded.doc.data.experience[0]).toMatchObject({ id: "e1", jobTitle: "Staf" });
  });

  it("names unnamed drafts in the interface language", () => {
    localStorage.setItem(UI_LANG_KEY, "id");
    localStorage.setItem(DRAFT_KEY, legacyPayload(createEmptyCV("en")));
    localStorage.setItem(BACKUP_KEY, legacyPayload(createEmptyCV("en")));
    expect(migrateLegacyStorage().migrated.map((m) => m.name)).toEqual(["CV tanpa judul", "Draf sebelumnya"]);
  });

  it("names an unnamed backup “Previous draft” in English and accepts an explicit language", () => {
    localStorage.setItem(BACKUP_KEY, legacyPayload(createEmptyCV("id")));
    const result = migrateLegacyStorage("en");
    expect(result.migrated.map((m) => m.name)).toEqual(["Previous draft"]);
    // With only a backup, it becomes the active document.
    expect(getActiveDocId()).toBe(result.migrated[0].id);
  });

  it("keeps a corrupted draft aside and still migrates the backup", () => {
    localStorage.setItem(DRAFT_KEY, "{corrupted");
    localStorage.setItem(BACKUP_KEY, legacyPayload(sampleCV()));
    const result = migrateLegacyStorage();
    expect(result.corrupted).toBe(true);
    expect(result.migrated).toHaveLength(1);
    expect(localStorage.getItem(CORRUPT_KEY)).toBe("{corrupted");
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(getActiveDocId()).toBe(result.migrated[0].id);
  });

  it("keeps both corrupted copies when draft and backup are unreadable", () => {
    localStorage.setItem(DRAFT_KEY, "{bad draft");
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ schemaVersion: 99, data: { schemaVersion: 99 } }));
    const result = migrateLegacyStorage();
    expect(result).toEqual({ migrated: [], corrupted: true });
    expect(localStorage.getItem(CORRUPT_KEY)).toBe("{bad draft");
    expect(JSON.parse(localStorage.getItem(CORRUPT_BACKUP_KEY)!)).toMatchObject({ schemaVersion: 99 });
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(listDocs()).toEqual([]);
    // Nothing left to migrate.
    expect(migrateLegacyStorage()).toEqual({ migrated: [], corrupted: false });
  });

  it("keeps the legacy draft when there is no room to migrate it", () => {
    localStorage.setItem(DRAFT_KEY, legacyPayload(sampleCV()));
    quotaFor((key) => key.startsWith("free-cv-maker:doc:"));
    expect(migrateLegacyStorage()).toEqual({ migrated: [], corrupted: false });
    vi.restoreAllMocks();
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
    expect(localStorage.getItem(DOCS_INDEX_KEY)).toBeNull();
    // A later attempt with enough room succeeds.
    expect(migrateLegacyStorage().migrated).toHaveLength(1);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});
