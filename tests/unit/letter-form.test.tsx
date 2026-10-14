import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReducer, type Dispatch } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  LETTER_BODY_MAX,
  LETTER_SECTION_IDS,
  LONG_LETTER_WORDS,
  LetterForm,
  bodyStats,
  foreignDefaults,
} from "@/components/letter/LetterForm";
import { createEmptyCV, type CVData, type Language } from "@/lib/cv-schema";
import { I18nProvider } from "@/lib/i18n";
import letterEn from "@/lib/i18n/features/letter.en";
import letterId from "@/lib/i18n/features/letter.id";
import { letterReducer, type LetterAction } from "@/lib/letter-reducer";
import {
  LETTER_DEFAULTS,
  MAX_ADDRESS,
  MAX_BODY,
  MAX_LETTER_FIELD,
  createEmptyLetter,
  sanitizeLetter,
  senderFromCV,
  todayIso,
  type LetterData,
} from "@/lib/letter-schema";
import { richSampleCV, sampleLetter } from "@/lib/sample-cv";

// Typing into many fields with userEvent is slow in jsdom.
const SLOW = { timeout: 30_000 };

interface StoredCV {
  id: string;
  name: string;
  cv: CVData | null;
}

/** Renders LetterForm with the real reducer and exposes the latest letter and dispatch. */
function renderForm({
  letter = createEmptyLetter("en"),
  lang = "en",
  cvs = [],
  loadCV,
}: {
  letter?: LetterData;
  lang?: Language;
  cvs?: StoredCV[];
  loadCV?: (id: string) => CVData | null;
} = {}) {
  const state: { letter: LetterData; dispatch: Dispatch<LetterAction> } = { letter, dispatch: () => {} };
  const load = vi.fn(loadCV ?? ((id: string) => cvs.find((c) => c.id === id)?.cv ?? null));
  const cvOptions = cvs.map(({ id, name }) => ({ id, name }));
  function Harness() {
    const [current, dispatch] = useReducer(letterReducer, letter);
    state.letter = current;
    state.dispatch = dispatch;
    return <LetterForm letter={current} dispatch={dispatch} cvOptions={cvOptions} loadCV={load} />;
  }
  const utils = render(
    <I18nProvider initialLang={lang}>
      <Harness />
    </I18nProvider>,
  );
  return { ...utils, state, loadCV: load, user: userEvent.setup() };
}

function withLanguage(letter: LetterData, language: Language): LetterData {
  return { ...letter, meta: { ...letter.meta, language } };
}

function cvNamed(fullName: string, email: string): CVData {
  const cv = createEmptyCV();
  cv.personal = {
    ...cv.personal,
    fullName,
    title: "Data Analyst",
    email,
    phone: "+62 812 0000 0000",
    city: "Bandung",
    country: "Indonesia",
    linkedin: "linkedin.com/in/example",
    website: "example.com",
  };
  return cv;
}

const section = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No section #${id}`);
  return el;
};

describe("LetterForm structure", () => {
  it("renders the four sections in order, each labelled by its heading", () => {
    const { container } = renderForm();
    const sections = Array.from(container.querySelectorAll("section"));
    expect(sections.map((s) => s.id)).toEqual(Object.values(LETTER_SECTION_IDS));
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Your details",
      "Recipient",
      "Date and subject",
      "Letter",
    ]);
    for (const s of sections) {
      expect(s).toHaveAttribute("aria-labelledby", `${s.id}-title`);
    }
  });

  it("gives every control an accessible name", () => {
    const { container } = renderForm({
      letter: { ...createEmptyLetter("en"), sender: { ...sampleLetter().sender }, signature: "" },
      cvs: [{ id: "cv-1", name: "Jane CV", cv: richSampleCV() }],
    });
    const controls = container.querySelectorAll("input, textarea, select, button");
    expect(controls.length).toBeGreaterThan(15);
    for (const el of controls) expect(el).toHaveAccessibleName();
  });

  it("shows the letter's current values", () => {
    const letter = sampleLetter();
    renderForm({ letter });
    expect(screen.getByLabelText("Full name")).toHaveValue("Alex Example");
    expect(screen.getByLabelText("Email")).toHaveValue("alex@example.com");
    expect(screen.getByLabelText("Company or organisation")).toHaveValue("Example Analytics Ltd.");
    expect(screen.getByLabelText("Address")).toHaveValue("Jl. Contoh No. 1\nJakarta 10110\nIndonesia");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-03-02");
    expect(screen.getByLabelText("Subject")).toHaveValue(letter.subject);
    expect(screen.getByLabelText("Greeting")).toHaveValue("Dear Jordan Sample,");
    expect(screen.getByLabelText("Main text")).toHaveValue(letter.body);
    expect(screen.getByLabelText("Closing")).toHaveValue("Kind regards,");
    expect(screen.getByLabelText("Name under the closing")).toHaveValue("Alex Example");
  });

  it("shows short writing tips as a list", () => {
    renderForm();
    const content = section(LETTER_SECTION_IDS.content);
    expect(within(content).getByRole("heading", { level: 3, name: "Writing tips" })).toBeInTheDocument();
    const tips = within(content).getAllByRole("listitem");
    expect(tips).toHaveLength(letterEn.content.tips.length);
    expect(tips[0]).toHaveTextContent("Name the position and the company in the first paragraph.");
  });

  it("uses Indonesian labels and tips when the UI is in Indonesian", () => {
    renderForm({ lang: "id", letter: createEmptyLetter("id") });
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Data pengirim",
      "Penerima",
      "Tanggal dan perihal",
      "Isi surat",
    ]);
    expect(screen.getByRole("heading", { level: 3, name: "Tips menulis" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nama lengkap")).toBeInTheDocument();
    expect(screen.getByLabelText("Salam pembuka")).toHaveValue("Yth. Bapak/Ibu HRD,");
    expect(screen.getByLabelText("Salam penutup")).toHaveValue("Hormat saya,");
    expect(screen.getByLabelText("Perihal")).toHaveAccessibleDescription(/“Perihal:”/);
  });
});

describe("LetterForm editing", SLOW, () => {
  it("updates sender, recipient and letter fields through the reducer", async () => {
    const { state, user } = renderForm();

    await user.type(screen.getByLabelText("Full name"), "Jane Doe");
    await user.type(screen.getByLabelText("Professional title"), "Data Analyst");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Phone number"), "+62 812");
    await user.type(screen.getByLabelText("City"), "Bandung");
    await user.type(screen.getByLabelText("Country"), "Indonesia");
    await user.type(screen.getByLabelText("LinkedIn URL"), "linkedin.com/in/jane");
    await user.type(screen.getByLabelText("Portfolio / website URL"), "jane.example.com");
    expect(state.letter.sender).toEqual({
      fullName: "Jane Doe",
      title: "Data Analyst",
      email: "jane@example.com",
      phone: "+62 812",
      city: "Bandung",
      country: "Indonesia",
      linkedin: "linkedin.com/in/jane",
      website: "jane.example.com",
    });

    const recipient = section(LETTER_SECTION_IDS.recipient);
    await user.type(within(recipient).getByLabelText("Name"), "Rina Wijaya");
    await user.type(within(recipient).getByLabelText("Job title"), "HR Manager");
    await user.type(within(recipient).getByLabelText("Company or organisation"), "Example Ltd.");
    await user.type(within(recipient).getByLabelText("Address"), "Jl. Contoh 1{Enter}Jakarta");
    expect(state.letter.recipient).toEqual({
      name: "Rina Wijaya",
      title: "HR Manager",
      company: "Example Ltd.",
      address: "Jl. Contoh 1\nJakarta",
    });

    await user.type(screen.getByLabelText("Subject"), "Application for Data Analyst");
    const greeting = screen.getByLabelText("Greeting");
    await user.clear(greeting);
    await user.type(greeting, "Dear Ms. Wijaya,");
    await user.click(screen.getByLabelText("Main text"));
    await user.paste("First paragraph.\n\nSecond paragraph.");
    const closing = screen.getByLabelText("Closing");
    await user.clear(closing);
    await user.type(closing, "Sincerely,");
    await user.type(screen.getByLabelText("Name under the closing"), "Jane");

    expect(state.letter).toMatchObject({
      subject: "Application for Data Analyst",
      greeting: "Dear Ms. Wijaya,",
      body: "First paragraph.\n\nSecond paragraph.",
      closing: "Sincerely,",
      signature: "Jane",
    });
  });

  it("flags an invalid email address and web address without blocking input", async () => {
    const { state, user } = renderForm();
    await user.type(screen.getByLabelText("Email"), "jane@");
    await user.type(screen.getByLabelText("LinkedIn URL"), "not a url");
    const alerts = screen.getAllByRole("alert").map((a) => a.textContent);
    expect(alerts).toContain(letterEn.errors.email);
    expect(alerts).toContain(letterEn.errors.url);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(state.letter.sender.email).toBe("jane@");
  });

  it("shows the address hint and keeps the field within the stored limits", () => {
    renderForm();
    expect(screen.getByLabelText("Address")).toHaveAccessibleDescription(letterEn.recipient.addressHint);
    expect(screen.getByLabelText("Address")).toHaveAttribute("maxlength", String(MAX_ADDRESS));
    expect(screen.getByLabelText("Main text")).toHaveAttribute("maxlength", String(LETTER_BODY_MAX));
    expect(screen.getByLabelText("Subject")).toHaveAttribute("maxlength", String(MAX_LETTER_FIELD));
    // The form's limits are the ones sanitizeLetter applies when the letter is stored.
    expect(LETTER_BODY_MAX).toBe(MAX_BODY);
    const long = sanitizeLetter({
      ...createEmptyLetter("en"),
      body: "a".repeat(MAX_BODY + 10),
      subject: "b".repeat(MAX_LETTER_FIELD + 10),
      recipient: { name: "", title: "", company: "", address: "c".repeat(MAX_ADDRESS + 10) },
    } as unknown as Record<string, unknown>);
    expect(long.body).toHaveLength(MAX_BODY);
    expect(long.subject).toHaveLength(MAX_LETTER_FIELD);
    expect(long.recipient.address).toHaveLength(MAX_ADDRESS);
  });
});

describe("LetterForm fill in from a CV", SLOW, () => {
  const jane = cvNamed("Jane Doe", "jane@example.com");
  const budi = cvNamed("Budi Santoso", "budi@example.com");
  const cvs: StoredCV[] = [
    { id: "cv-jane", name: "Jane’s CV", cv: jane },
    { id: "cv-budi", name: "Budi – Analyst", cv: budi },
  ];

  it("is not offered when there are no CVs", () => {
    renderForm();
    expect(screen.queryByLabelText("Fill in from a CV")).toBeNull();
    expect(screen.queryByRole("button", { name: "Fill in details" })).toBeNull();
  });

  it("lists the CVs and copies the chosen one's details and name into an empty letter", async () => {
    const { state, user, loadCV } = renderForm({ cvs });
    const select = screen.getByLabelText("Fill in from a CV");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Jane’s CV", "Budi – Analyst"]);
    expect(select).toHaveAccessibleDescription(letterEn.fromCv.hint);

    await user.selectOptions(select, "cv-budi");
    await user.click(screen.getByRole("button", { name: "Fill in details" }));

    expect(loadCV).toHaveBeenCalledWith("cv-budi");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state.letter.sender).toEqual(senderFromCV(budi));
    expect(state.letter.signature).toBe("Budi Santoso");
    expect(screen.getByLabelText("Full name")).toHaveValue("Budi Santoso");
    expect(screen.getByText("Details copied from “Budi – Analyst”.")).toBeInTheDocument();
  });

  it("removes the confirmation once a sender field is edited", async () => {
    const { user } = renderForm({ cvs });
    await user.click(screen.getByRole("button", { name: "Fill in details" }));
    expect(screen.getByText("Details copied from “Jane’s CV”.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Phone number"), "9");
    expect(screen.queryByText("Details copied from “Jane’s CV”.")).toBeNull();
  });

  it("asks before replacing details that were already entered", async () => {
    const start = createEmptyLetter("en");
    start.sender.fullName = "Old Name";
    start.sender.email = "old@example.com";
    start.signature = "Old Name";
    const { state, user } = renderForm({ letter: start, cvs });

    await user.click(screen.getByRole("button", { name: "Fill in details" }));
    const dialog = screen.getByRole("dialog", { name: "Replace your details?" });
    expect(dialog).toHaveTextContent("The details you’ve entered here will be replaced with the ones from “Jane’s CV”.");

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state.letter.sender.fullName).toBe("Old Name");
    expect(state.letter.sender.email).toBe("old@example.com");

    await user.click(screen.getByRole("button", { name: "Fill in details" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Replace" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state.letter.sender).toEqual(senderFromCV(jane));
    // The signature followed the old sender name, so it follows the new one.
    expect(state.letter.signature).toBe("Jane Doe");
  });

  it("keeps a signature the user wrote themselves", async () => {
    const start = createEmptyLetter("en");
    start.signature = "J. D.";
    const { state, user } = renderForm({ letter: start, cvs });
    await user.click(screen.getByRole("button", { name: "Fill in details" }));
    expect(state.letter.sender.fullName).toBe("Jane Doe");
    expect(state.letter.signature).toBe("J. D.");
  });

  it("doesn't ask when the letter already holds the same details", async () => {
    const start = createEmptyLetter("en");
    start.sender = senderFromCV(jane);
    const { user } = renderForm({ letter: start, cvs });
    await user.click(screen.getByRole("button", { name: "Fill in details" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Details copied from “Jane’s CV”.")).toBeInTheDocument();
  });

  it("reports a CV that can't be opened and leaves the letter unchanged", async () => {
    const start = createEmptyLetter("en");
    const { state, user } = renderForm({ letter: start, cvs: [{ id: "gone", name: "Deleted CV", cv: null }] });
    await user.click(screen.getByRole("button", { name: "Fill in details" }));
    expect(screen.getByRole("alert")).toHaveTextContent(letterEn.fromCv.failed);
    expect(state.letter).toEqual(start);
  });

  it("treats a loader that throws like a missing CV", async () => {
    const { user } = renderForm({
      cvs: [{ id: "bad", name: "Broken", cv: null }],
      loadCV: () => {
        throw new Error("storage error");
      },
    });
    await user.click(screen.getByRole("button", { name: "Fill in details" }));
    expect(screen.getByRole("alert")).toHaveTextContent(letterEn.fromCv.failed);
  });
});

describe("LetterForm date and subject", () => {
  it("shows how the date appears on the letter and updates it", () => {
    const { state } = renderForm({ letter: sampleLetter() });
    const date = screen.getByLabelText("Date");
    expect(date).toHaveAttribute("type", "date");
    expect(date).toHaveAccessibleDescription("Shown on the letter as “2 March 2026”.");

    fireEvent.change(date, { target: { value: "2026-10-13" } });
    expect(state.letter.date).toBe("2026-10-13");
    expect(date).toHaveAccessibleDescription("Shown on the letter as “13 October 2026”.");

    fireEvent.change(date, { target: { value: "" } });
    expect(state.letter.date).toBe("");
    expect(date).toHaveAccessibleDescription("No date will be shown on the letter.");
  });

  it("puts the city before the date for letters in Indonesian", () => {
    renderForm({ letter: withLanguage(sampleLetter(), "id") });
    expect(screen.getByLabelText("Date")).toHaveAccessibleDescription("Shown on the letter as “Bandung, 2 Maret 2026”.");
    expect(screen.getByLabelText("City")).toHaveAccessibleDescription(letterEn.sender.cityHintId);
  });

  it("doesn't add the city hint for letters in English", () => {
    renderForm({ letter: sampleLetter() });
    expect(screen.getByLabelText("City")).not.toHaveAccessibleDescription();
  });

  it("sets today's date and keeps focus on the date field", async () => {
    const { state } = renderForm({ letter: sampleLetter() });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Use today’s date" }));
    expect(state.letter.date).toBe(todayIso());
    expect(screen.queryByRole("button", { name: "Use today’s date" })).toBeNull();
    expect(screen.getByLabelText("Date")).toHaveFocus();
  });

  it("names the subject prefix of the letter's language", () => {
    renderForm({ letter: sampleLetter() });
    expect(screen.getByLabelText("Subject")).toHaveAccessibleDescription(
      "Printed after “Subject:”. Name the position, and add the job reference if the ad gives one.",
    );
  });
});

describe("LetterForm main text", () => {
  const setBody = (value: string, label = "Main text") =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const count = () => screen.getByTestId("letter-body-count");

  it("counts paragraphs, words and characters and describes the field with them", () => {
    renderForm();
    expect(count()).toHaveTextContent("0 paragraphs, 0 words, 0 characters");
    setBody("Hello");
    expect(count()).toHaveTextContent("1 paragraph, 1 word, 5 characters");
    const text = "I’m applying for the role.\n\nI have built dashboards.";
    setBody(text);
    expect(count()).toHaveTextContent(`2 paragraphs, 9 words, ${text.length} characters`);
    expect(screen.getByLabelText("Main text")).toHaveAccessibleDescription(
      `Leave a blank line between paragraphs. 2 paragraphs, 9 words, ${text.length} characters`,
    );
  });

  it("writes the body in the letter's language for spellchecking", () => {
    renderForm({ letter: withLanguage(createEmptyLetter("en"), "id") });
    expect(screen.getByLabelText("Main text")).toHaveAttribute("lang", "id");
  });

  it("suggests trimming once the letter is longer than about a page", () => {
    renderForm();
    setBody(Array.from({ length: LONG_LETTER_WORDS }, () => "word").join(" "));
    expect(screen.queryByText(/Over 400 words/)).toBeNull();
    setBody(Array.from({ length: LONG_LETTER_WORDS + 1 }, () => "word").join(" "));
    expect(screen.getByText(/Over 400 words/).closest("[role=status]")).not.toBeNull();
  });

  it("shows how many characters are left near the limit", () => {
    renderForm();
    setBody("a".repeat(LETTER_BODY_MAX - 1500));
    expect(count()).not.toHaveTextContent("left");
    setBody("a".repeat(LETTER_BODY_MAX - 500));
    expect(count()).toHaveTextContent("500 characters left");
  });

  it("formats large counts for the UI language", () => {
    renderForm({ lang: "id", letter: createEmptyLetter("id") });
    setBody("a".repeat(1234), "Teks utama");
    expect(count()).toHaveTextContent("1 paragraf, 1 kata, 1.234 karakter");
  });
});

describe("LetterForm greeting, closing and signature", SLOW, () => {
  it("offers the letter language's greeting and closing when the defaults are in another language", async () => {
    const { state, user } = renderForm({ letter: withLanguage(createEmptyLetter("en"), "id") });
    expect(
      screen.getByText("The greeting or closing is still the English default, but the letter is in Indonesian."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Use the Indonesian defaults" }));
    expect(state.letter.greeting).toBe(LETTER_DEFAULTS.id.greeting);
    expect(state.letter.closing).toBe(LETTER_DEFAULTS.id.closing);
    expect(screen.queryByRole("button", { name: "Use the Indonesian defaults" })).toBeNull();
    expect(screen.getByLabelText("Greeting")).toHaveFocus();
  });

  it("only replaces fields that still hold the other language's default", async () => {
    const letter = withLanguage(createEmptyLetter("id"), "en");
    letter.greeting = "Dear Ms. Wijaya,";
    const { state, user } = renderForm({ letter });
    await user.click(screen.getByRole("button", { name: "Use the English defaults" }));
    expect(state.letter.greeting).toBe("Dear Ms. Wijaya,");
    expect(state.letter.closing).toBe(LETTER_DEFAULTS.en.closing);
  });

  it("shows no language note when greeting and closing match the letter", () => {
    renderForm({ letter: createEmptyLetter("id") });
    expect(screen.queryByRole("button", { name: /defaults/ })).toBeNull();
  });

  it("uses the letter language's defaults as placeholders", () => {
    const letter = createEmptyLetter("id");
    letter.greeting = "";
    letter.closing = "";
    renderForm({ letter });
    expect(screen.getByLabelText("Greeting")).toHaveAttribute("placeholder", LETTER_DEFAULTS.id.greeting);
    expect(screen.getByLabelText("Closing")).toHaveAttribute("placeholder", LETTER_DEFAULTS.id.closing);
  });

  it("offers the sender's name as the signature", async () => {
    const letter = createEmptyLetter("en");
    letter.sender.fullName = "Jane Doe";
    const { state, user } = renderForm({ letter });
    await user.click(screen.getByRole("button", { name: "Use “Jane Doe”" }));
    expect(state.letter.signature).toBe("Jane Doe");
    expect(screen.queryByRole("button", { name: "Use “Jane Doe”" })).toBeNull();
    expect(screen.getByLabelText("Name under the closing")).toHaveFocus();
  });

  it("doesn't offer the name when there is none or it is already used", () => {
    const { state } = renderForm();
    expect(screen.queryByRole("button", { name: /^Use “/ })).toBeNull();
    act(() => state.dispatch({ type: "setSender", patch: { fullName: "Jane Doe" } }));
    expect(screen.getByRole("button", { name: "Use “Jane Doe”" })).toBeInTheDocument();
    act(() => state.dispatch({ type: "setField", field: "signature", value: "Jane Doe" }));
    expect(screen.queryByRole("button", { name: /^Use “/ })).toBeNull();
  });
});

describe("letter form helpers", () => {
  it("bodyStats counts like the templates split paragraphs", () => {
    expect(bodyStats("")).toEqual({ paragraphs: 0, words: 0, characters: 0 });
    expect(bodyStats("   \n\n  ")).toEqual({ paragraphs: 0, words: 0, characters: 7 });
    expect(bodyStats("One two\nthree\n\n\n  four ")).toEqual({ paragraphs: 2, words: 4, characters: 23 });
  });

  it("foreignDefaults finds greeting/closing text left over from another language", () => {
    expect(foreignDefaults(createEmptyLetter("en"))).toBeNull();
    expect(foreignDefaults(withLanguage(createEmptyLetter("en"), "id"))).toEqual({
      from: "en",
      fields: ["greeting", "closing"],
    });
    const custom = withLanguage(createEmptyLetter("id"), "en");
    custom.closing = "Salam,";
    expect(foreignDefaults(custom)).toEqual({ from: "id", fields: ["greeting"] });
  });
});

describe("letter dictionaries", () => {
  const shape = (v: unknown): unknown =>
    Array.isArray(v)
      ? `array:${v.length}`
      : v && typeof v === "object"
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)]))
        : typeof v;

  const strings = (v: unknown): string[] =>
    typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];

  it("have the same keys and list lengths in English and Indonesian", () => {
    expect(shape(letterId)).toEqual(shape(letterEn));
  });

  it("follow the copy rules (no exclamation marks, em dashes or straight apostrophes in English)", () => {
    for (const s of [...strings(letterEn), ...strings(letterId)]) {
      expect(s).not.toMatch(/[!—]/);
    }
    for (const s of strings(letterEn)) expect(s).not.toMatch(/[a-z]'[a-z]/i);
  });

  it("keep the preview label used by the preview", () => {
    expect(letterEn.previewLabel).toBe("Cover letter preview");
    expect(letterId.previewLabel).toBe("Pratinjau surat lamaran");
  });
});
