import type { Dictionary } from "@/lib/i18n/en";

export type NoticeKind = "success" | "error" | "info";

/**
 * A message shown under the builder toolbar. The text is resolved at render time, so it
 * follows the interface language (which is applied after the first render).
 */
export interface Notice {
  kind: NoticeKind;
  text: (t: Dictionary) => string;
}
