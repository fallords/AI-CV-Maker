"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  allSectionsInOrder,
  customSectionKey,
  findCustomSection,
  isBuiltinSection,
  isSectionHidden,
  sectionDomId,
  type BuiltinSectionKey,
  type SectionKey,
} from "@/lib/cv-sections";
import { fmt, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "../ui/Dialog";
import { Trash } from "../ui/Icons";
import { btn } from "../ui/styles";
import { AddCustomSection, CustomSectionEditor } from "./CustomSections";
import {
  AwardsSection,
  InterestsSection,
  LanguagesSection,
  OrganizationsSection,
  ReferencesSection,
} from "./ExtraSections";
import {
  CertificationsSection,
  EducationSection,
  ExperienceSection,
  ProjectsSection,
  SkillsSection,
} from "./ListSections";
import { PersonalSection } from "./PersonalSection";
import { builtinSectionTitle } from "./section-titles";
import { SummarySection } from "./SummarySection";
import type { SectionProps } from "./types";

/** Crossed-out eye: marks sections that are hidden from the CV (decorative, paired with text). */
function EyeOff() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  );
}

/** One form section: a rule-separated group (no boxed card), headed by an H2. */
function FormSection({
  id,
  title,
  untitled = false,
  hiddenFromCV = false,
  actions,
  children,
}: {
  id: string;
  title: string;
  /** The title is a placeholder ("Untitled section"), shown muted. */
  untitled?: boolean;
  hiddenFromCV?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-32 border-t border-line pt-6 pb-8 first-of-type:border-t-0"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h2
          id={`${id}-title`}
          className={`min-w-0 font-display text-lg font-semibold break-words ${untitled ? "text-fg-muted" : "text-fg"}`}
        >
          {title}
        </h2>
        {actions}
      </div>
      {hiddenFromCV && (
        <p className="-mt-2 mb-5 flex max-w-[65ch] gap-2 text-sm text-fg-muted" data-testid="section-hidden-note">
          <span className="mt-[3px] shrink-0">
            <EyeOff />
          </span>
          <span>
            <span className="font-medium text-fg">{t.sections.hiddenNote}</span> {t.sections.hiddenHelp}
          </span>
        </p>
      )}
      {children}
    </section>
  );
}

function BuiltinEditor({ sectionKey, ...props }: SectionProps & { sectionKey: BuiltinSectionKey }) {
  switch (sectionKey) {
    case "summary":
      return <SummarySection {...props} />;
    case "experience":
      return <ExperienceSection {...props} />;
    case "education":
      return <EducationSection {...props} />;
    case "projects":
      return <ProjectsSection {...props} />;
    case "skills":
      return <SkillsSection {...props} />;
    case "certifications":
      return <CertificationsSection {...props} />;
    case "organizations":
      return <OrganizationsSection {...props} />;
    case "awards":
      return <AwardsSection {...props} />;
    case "languages":
      return <LanguagesSection {...props} />;
    case "references":
      return <ReferencesSection {...props} />;
    case "interests":
      return <InterestsSection {...props} />;
  }
}

interface FormEntry {
  /** Section key; "personal" for the personal details, which are always first and always shown. */
  key: SectionKey | "personal";
  domId: string;
  title: string;
  untitled: boolean;
  hidden: boolean;
  node: ReactNode;
  actions?: ReactNode;
}

/**
 * The CV editor: personal details first, then every section in the CV's own order
 * (`allSectionsInOrder`, so hidden and custom sections are included), then the
 * control for adding a custom section. Each section's element id is `sectionDomId(key)`
 * and each entry carries `data-item-id`, so other views can jump to them.
 */
export function CVForm(props: SectionProps) {
  const { cv, dispatch } = props;
  const { t } = useI18n();
  const f = t.form;
  const c = t.sections.custom;

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Element to focus once the CV change that creates or removes it has rendered.
  const focusRequest = useRef<(() => HTMLElement | null | undefined) | null>(null);

  useEffect(() => {
    const find = focusRequest.current;
    if (!find) return;
    const el = find();
    if (!el) return;
    focusRequest.current = null;
    el.focus();
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [cv]);

  const entries: FormEntry[] = [
    {
      key: "personal",
      domId: "personal",
      title: f.personal.title,
      untitled: false,
      hidden: false,
      node: <PersonalSection {...props} />,
    },
  ];

  for (const key of allSectionsInOrder(cv)) {
    const hidden = isSectionHidden(cv, key);
    if (isBuiltinSection(key)) {
      entries.push({
        key,
        domId: sectionDomId(key),
        title: builtinSectionTitle(key, t),
        untitled: false,
        hidden,
        node: <BuiltinEditor sectionKey={key} {...props} />,
      });
      continue;
    }
    const section = findCustomSection(cv, key);
    if (!section) continue;
    const title = section.title.trim();
    const shownTitle = title || c.untitled;
    entries.push({
      key,
      domId: sectionDomId(key),
      title: shownTitle,
      untitled: !title,
      hidden,
      node: <CustomSectionEditor section={section} dispatch={dispatch} />,
      actions: (
        <button
          type="button"
          className={`${btn.ghost} -my-2 hover:!bg-danger-soft hover:!text-danger-text`}
          aria-label={`${c.deleteSection}: ${shownTitle}`}
          onClick={() => setPendingDelete(section.id)}
        >
          <Trash /> {c.deleteSection}
        </button>
      ),
    });
  }

  const deleting = pendingDelete === null ? undefined : findCustomSection(cv, customSectionKey(pendingDelete));
  const deletingTitle = deleting?.title.trim() ?? "";

  return (
    <div>
      <nav aria-label={f.sectionNav} className="border-b border-line">
        {/* scroll-padding + scrollIntoView keep a focused link clear of the right-edge fade. */}
        <div className="flex scroll-pr-10 scroll-pl-1 gap-x-5 overflow-x-auto p-1 pr-8 [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] md:flex-wrap md:gap-y-1 md:overflow-visible md:pr-1 md:[mask-image:none]">
          {entries.map((s) => (
            <a
              key={s.key}
              href={`#${s.domId}`}
              aria-label={s.hidden ? `${s.title} (${t.sections.hiddenNav})` : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 py-2 text-sm hover:text-fg ${
                s.hidden ? "text-fg-subtle" : "text-fg-muted"
              }`}
              onFocus={(e) => e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })}
            >
              <span className="max-w-[16rem] truncate">{s.title}</span>
              {s.hidden && <EyeOff />}
            </a>
          ))}
        </div>
      </nav>
      {entries.map((s) => (
        <FormSection
          key={s.key}
          id={s.domId}
          title={s.title}
          untitled={s.untitled}
          hiddenFromCV={s.hidden}
          actions={s.actions}
        >
          {s.node}
        </FormSection>
      ))}
      <AddCustomSection
        cv={cv}
        dispatch={dispatch}
        buttonRef={addButtonRef}
        onAdded={(sectionId, itemId) => {
          focusRequest.current = () =>
            document
              .getElementById(sectionDomId(customSectionKey(sectionId)))
              ?.querySelector<HTMLElement>(`[data-item-id="${itemId}"] input`);
        }}
      />
      <ConfirmDialog
        open={deleting !== undefined}
        title={c.deleteTitle}
        body={deletingTitle ? fmt(c.deleteBody, { title: deletingTitle }) : c.deleteBodyUntitled}
        confirmLabel={c.deleteSection}
        cancelLabel={c.cancel}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (deleting) {
            dispatch({ type: "removeCustomSection", id: deleting.id });
            focusRequest.current = () => addButtonRef.current;
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
