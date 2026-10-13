/** Pure state transitions for the CV editor (unit-tested in tests/unit/cv-reducer.test.ts). */

import {
  LIST_SECTIONS,
  MAX_CUSTOM_ITEMS,
  MAX_CUSTOM_SECTIONS,
  createId,
  emptyCustomItem,
  emptyItem,
  isValidId,
  type CVData,
  type CVMeta,
  type CustomItem,
  type CustomSection,
  type ListItem,
  type ListSection,
  type PersonalInfo,
} from "./cv-schema";
import { allSectionsInOrder, customSectionKey, sectionExists, type SectionKey } from "./cv-sections";
import { sanitizeStyle, type DocStyle } from "./doc-style";

export type CVAction =
  | { type: "replace"; data: CVData }
  | { type: "setPersonal"; patch: Partial<PersonalInfo> }
  | { type: "setSummary"; value: string }
  | { type: "setMeta"; patch: Partial<CVMeta> }
  | { type: "addItem"; section: ListSection; id?: string }
  | { type: "updateItem"; section: ListSection; id: string; patch: Record<string, unknown> }
  | { type: "removeItem"; section: ListSection; id: string }
  | { type: "moveItem"; section: ListSection; id: string; direction: -1 | 1 }
  | { type: "setStyle"; patch: Partial<DocStyle> }
  | { type: "moveSection"; key: SectionKey; direction: -1 | 1 }
  | { type: "setSectionHidden"; key: SectionKey; hidden: boolean }
  | { type: "resetSectionOrder" }
  | { type: "addCustomSection"; id?: string; title: string }
  | { type: "renameCustomSection"; id: string; title: string }
  | { type: "removeCustomSection"; id: string }
  | { type: "addCustomItem"; sectionId: string; id?: string }
  | { type: "updateCustomItem"; sectionId: string; id: string; patch: Partial<CustomItem> }
  | { type: "removeCustomItem"; sectionId: string; id: string }
  | { type: "moveCustomItem"; sectionId: string; id: string; direction: -1 | 1 };

function mapSection<S extends ListSection>(
  cv: CVData,
  section: S,
  fn: (items: ListItem<S>[]) => ListItem<S>[],
): CVData {
  return { ...cv, [section]: fn(cv[section] as ListItem<S>[]) };
}

function swap<T extends { id: string }>(items: T[], id: string, direction: -1 | 1): T[] {
  const from = items.findIndex((i) => i.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function mapCustom(cv: CVData, sectionId: string, fn: (s: CustomSection) => CustomSection): CVData {
  const index = cv.customSections.findIndex((s) => s.id === sectionId);
  if (index < 0) return cv;
  const current = cv.customSections[index];
  const updated = fn(current);
  if (updated === current) return cv;
  const customSections = [...cv.customSections];
  customSections[index] = updated;
  return { ...cv, customSections };
}

/** True when any entry of any list or custom section already uses this id. */
function entryIdTaken(cv: CVData, id: string): boolean {
  return (
    LIST_SECTIONS.some((l) => (cv[l] as { id: string }[]).some((i) => i.id === id)) ||
    cv.customSections.some((cs) => cs.items.some((i) => i.id === id))
  );
}

/** The requested entry id when it is valid and unused, otherwise undefined (a fresh id is made). */
function freeEntryId(cv: CVData, id: string | undefined): string | undefined {
  return id && isValidId(id) && !entryIdTaken(cv, id) ? id : undefined;
}

export function cvReducer(cv: CVData, action: CVAction): CVData {
  switch (action.type) {
    case "replace":
      return action.data;
    case "setPersonal":
      return { ...cv, personal: { ...cv.personal, ...action.patch } };
    case "setSummary":
      return { ...cv, summary: action.value };
    case "setMeta":
      return { ...cv, meta: { ...cv.meta, ...action.patch } };
    case "addItem": {
      const item = emptyItem(action.section);
      const id = freeEntryId(cv, action.id);
      if (id) item.id = id;
      return mapSection(cv, action.section, (items) => [...items, item]);
    }
    case "updateItem":
      return mapSection(cv, action.section, (items) =>
        items.map((item) => {
          if (item.id !== action.id) return item;
          // The id is immutable; ignore attempts to patch it.
          const { id: _ignored, ...patch } = action.patch;
          void _ignored;
          const next = { ...item, ...patch } as typeof item;
          // Marking an entry as current clears any stale end date.
          if ("current" in patch && patch.current === true && "endDate" in next) {
            (next as { endDate: string }).endDate = "";
          }
          return next;
        }),
      );
    case "removeItem":
      return mapSection(cv, action.section, (items) => items.filter((i) => i.id !== action.id));
    case "moveItem":
      return mapSection(cv, action.section, (items) => swap(items, action.id, action.direction));

    /* ---------- appearance ---------- */
    case "setStyle":
      // Invalid values (e.g. a malformed colour) fall back to the defaults.
      return { ...cv, meta: { ...cv.meta, style: sanitizeStyle({ ...cv.meta.style, ...action.patch }) } };

    /* ---------- section order and visibility ---------- */
    case "moveSection": {
      const order = allSectionsInOrder(cv);
      const from = order.indexOf(action.key);
      const to = from + action.direction;
      if (from < 0 || to < 0 || to >= order.length) return cv;
      [order[from], order[to]] = [order[to], order[from]];
      return { ...cv, meta: { ...cv.meta, sectionOrder: order } };
    }
    case "setSectionHidden": {
      if (!sectionExists(cv, action.key)) return cv;
      const without = cv.meta.hiddenSections.filter((k) => k !== action.key);
      const hiddenSections = action.hidden ? [...without, action.key] : without;
      return { ...cv, meta: { ...cv.meta, hiddenSections } };
    }
    case "resetSectionOrder":
      return { ...cv, meta: { ...cv.meta, sectionOrder: [] } };

    /* ---------- custom sections ---------- */
    case "addCustomSection": {
      if (cv.customSections.length >= MAX_CUSTOM_SECTIONS) return cv;
      const taken = (id: string) => cv.customSections.some((s) => s.id === id);
      const id = action.id && isValidId(action.id) && !taken(action.id) ? action.id : createId();
      const section: CustomSection = { id, title: action.title, items: [] };
      const sectionOrder = cv.meta.sectionOrder.length
        ? [...cv.meta.sectionOrder, customSectionKey(id)]
        : cv.meta.sectionOrder;
      return { ...cv, customSections: [...cv.customSections, section], meta: { ...cv.meta, sectionOrder } };
    }
    case "renameCustomSection":
      return mapCustom(cv, action.id, (s) => ({ ...s, title: action.title }));
    case "removeCustomSection": {
      if (!cv.customSections.some((s) => s.id === action.id)) return cv;
      const key = customSectionKey(action.id);
      return {
        ...cv,
        customSections: cv.customSections.filter((s) => s.id !== action.id),
        meta: {
          ...cv.meta,
          sectionOrder: cv.meta.sectionOrder.filter((k) => k !== key),
          hiddenSections: cv.meta.hiddenSections.filter((k) => k !== key),
        },
      };
    }
    case "addCustomItem":
      return mapCustom(cv, action.sectionId, (s) => {
        if (s.items.length >= MAX_CUSTOM_ITEMS) return s;
        const item = emptyCustomItem(freeEntryId(cv, action.id));
        return { ...s, items: [...s.items, item] };
      });
    case "updateCustomItem":
      return mapCustom(cv, action.sectionId, (s) => ({
        ...s,
        items: s.items.map((item) => {
          if (item.id !== action.id) return item;
          // The id is immutable; ignore attempts to patch it.
          const { id: _ignored, ...patch } = action.patch;
          void _ignored;
          return { ...item, ...patch };
        }),
      }));
    case "removeCustomItem":
      return mapCustom(cv, action.sectionId, (s) => ({ ...s, items: s.items.filter((i) => i.id !== action.id) }));
    case "moveCustomItem":
      return mapCustom(cv, action.sectionId, (s) => {
        const items = swap(s.items, action.id, action.direction);
        return items === s.items ? s : { ...s, items };
      });
    default:
      return cv;
  }
}
