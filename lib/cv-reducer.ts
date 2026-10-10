/** Pure state transitions for the CV editor (unit-tested in tests/unit/cv-reducer.test.ts). */

import {
  emptyItem,
  type CVData,
  type CVMeta,
  type ListItem,
  type ListSection,
  type PersonalInfo,
} from "./cv-schema";

export type CVAction =
  | { type: "replace"; data: CVData }
  | { type: "setPersonal"; patch: Partial<PersonalInfo> }
  | { type: "setSummary"; value: string }
  | { type: "setMeta"; patch: Partial<CVMeta> }
  | { type: "addItem"; section: ListSection; id?: string }
  | { type: "updateItem"; section: ListSection; id: string; patch: Record<string, unknown> }
  | { type: "removeItem"; section: ListSection; id: string }
  | { type: "moveItem"; section: ListSection; id: string; direction: -1 | 1 };

function mapSection<S extends ListSection>(
  cv: CVData,
  section: S,
  fn: (items: ListItem<S>[]) => ListItem<S>[],
): CVData {
  return { ...cv, [section]: fn(cv[section] as ListItem<S>[]) };
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
      if (action.id) item.id = action.id;
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
      return mapSection(cv, action.section, (items) => {
        const from = items.findIndex((i) => i.id === action.id);
        const to = from + action.direction;
        if (from < 0 || to < 0 || to >= items.length) return items;
        const next = [...items];
        [next[from], next[to]] = [next[to], next[from]];
        return next;
      });
    default:
      return cv;
  }
}
