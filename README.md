# Free AI CV Maker

A free, privacy-friendly CV and cover letter builder that runs entirely in the browser. Write several CVs and cover letters, choose a template and adjust its design, check the CV for missing details, and download a clean A4 PDF, a Word file or plain text. There are no accounts, no watermarks, no download limits and no paid services.

- **Free:** creating documents and downloading them in any format costs nothing. There are no ads, subscriptions or premium tiers.
- **No account:** documents are stored in the browser's `localStorage`.
- **Private:** CV and letter data never leaves the device. The app has no backend, database or analytics, and every export file is made in the browser.
- **Works without AI:** AI assistance is optional, disabled by default and consent-gated. The CV checker is rule-based and runs locally.
- **English & Indonesian** interface, with a separate document language for headings, dates and letter labels.

## Features

| Area | What's implemented |
| --- | --- |
| Pages | Landing (`/`), builder (`/builder/`), privacy notice (`/privacy/`), help (`/help/`) |
| CV editor | Personal info (with optional photo), summary with character guidance, work experience, education, projects, technical and soft skills with optional proficiency, certifications, organizations & volunteering, awards, languages (with level), references, interests, and up to 20 custom sections with their own title (e.g. courses, publications). Add, edit, remove (confirmation when an entry has content) and reorder entries with accessible up/down buttons. Non-blocking validation for email, URLs and date order. |
| Cover letters | Letter editor with sender details (copied from a chosen CV on request), recipient, date, subject, greeting, body, closing and signature. A new letter takes the template and design of the CV it was created from. Letter language sets the date format and the "Subject" / "Perihal" label; Indonesian letters put the sender's city before the date. |
| Documents | Several CVs and cover letters per browser: a document switcher and "Your documents" dialog to open, rename, duplicate and delete documents, start a new CV or letter, and import a JSON file as a new document. Debounced autosave (600 ms) per document, plus a flush when the tab is hidden, before switching documents and before downloads. A tab never overwrites a copy another tab saved since it last loaded or wrote the document: it reloads that copy when it has no unsaved changes, and otherwise offers "Load the newer version" or "Keep mine". Without browser storage, new and imported documents still open in memory (unsaved), with a confirmation before one is replaced. "Erase all local data" on the privacy page. |
| Design | Per-document accent colour (presets or custom, with a contrast warning below 4.5:1 on white), font (template default, system sans/serif, bundled IBM Plex Sans/Serif), text size, spacing and page margins. For CVs, a section manager to reorder sections, hide them without deleting content, and reset to the template order. |
| CV check | Rule-based checker in the browser (no AI): a 0 to 100 score plus errors, warnings and tips from more than 30 rules, for example missing contact details, invalid email or URLs, summary length, missing or reversed dates, descriptions without bullet points, first-person or very long bullet lines, few action verbs, missing or duplicate skills, more than two pages, a photo with the ATS template, a low-contrast accent and untitled custom sections. Each finding jumps to the field or setting. Messages never suggest adding facts the user doesn't have. |
| Preview | Live A4 preview scaled to fit, with approximate page-break guides and a page count |
| Templates | **ATS Minimal** (single column, no photo), **Modern Professional** (serif name, accent rules, optional photo), **Graduate / Student** (education and projects first, skill tags). All three render the same data and have a matching cover letter layout. |
| PDF | Browser print-to-PDF with dedicated print CSS: A4, margins from the document's design, selectable text, headings kept with their content, no app UI, no watermark, no remote assets |
| Word & plain text | `.docx` built in the browser with the `docx` library (loaded on demand): A4, the document's margins, colours and font, real Word bullets, right-aligned dates, section order and visibility. `.txt` with uppercase headings and `-` bullets for pasting into application forms. |
| Import/export | Versioned JSON backup for CVs and letters; import is validated, sanitised and migrated (files from the single-draft version still import) and always adds a new document |
| i18n | English and Indonesian UI (`lib/i18n`), with an independent document language for headings, month names and letter labels (`lib/cv-format.ts`) |
| Accessibility | Semantic landmarks, labelled controls, visible focus, skip link, native `<dialog>` modals, live status messages, tab patterns for the editor and on mobile, axe-checked pages |
| AI (optional) | Provider contract, prompt templates and a consent → review → apply UI for summary rewrites. It only appears when an operator configures their own proxy. |

## Tech stack

- [Next.js 16](https://nextjs.org) App Router with `output: "export"` (fully static), React 19, TypeScript (strict)
- Tailwind CSS 4 for the app UI. The CV document uses plain CSS in physical units (`app/globals.css`).
- Vitest + Testing Library (jsdom) for unit and integration tests, Playwright + axe-core for end-to-end tests
- Runtime dependencies: `next`, `react`, `react-dom`, `docx` (Word export, loaded only when a Word file is requested) and the `@fontsource/ibm-plex-*` packages (fonts are bundled, nothing is loaded from a font CDN). `jszip` is a dev dependency used by the export tests.

## Repository structure

```
app/
  layout.tsx            Root layout (metadata, I18nProvider, bundled fonts)
  globals.css           Design tokens, CV and letter template styles, A4 print stylesheet
  page.tsx              Landing page
  builder/page.tsx      Builder for CVs and cover letters
  privacy/page.tsx      Privacy notice + erase local data
  help/page.tsx         Instructions (incl. PDF export per browser)
  icon.svg
components/
  builder/
    BuilderApp.tsx      Builder state, documents, autosave, toolbar, editor tabs, check jumps, print root
    DocumentsDialog.tsx "Your documents": open, rename, duplicate, delete, new CV/letter, import
    DownloadMenu.tsx    Download PDF plus Word, plain text and JSON backup
    DesignPanel.tsx     Appearance settings and the CV section manager
    ChecksPanel.tsx     CV check score and findings
    MenuButton.tsx, Tabs.tsx, print.ts, doc-names.ts, notice.ts   Shared builder helpers
  cv-form/              CV section editors (incl. extra and custom sections), EntryList/RepeatableSection, optional AI assist
  letter/LetterForm.tsx Cover letter editor
  cv-preview/           DocumentPreview (scaled A4 preview with page guides) and the CVPreview wrapper
  templates/            AtsMinimal, ModernProfessional, Graduate, LetterDocument, DocumentView, PrintRoot, style variables
  layout/               Site header (with language switcher) and footer
  pages/                Client content for landing, help and privacy pages
  ui/                   Field, MonthField, Dialog, Icons, shared class names
lib/
  cv-schema.ts          Typed, versioned CV data model (v2) and helpers
  cv-sections.ts        Section keys, template section order, visible/hidden sections
  cv-validation.ts      Sanitisation, JSON import/export for CVs and letters, migrations, field validators
  cv-reducer.ts         Pure CV editor state transitions
  cv-checks.ts          Rule-based CV checker and score
  cv-format.ts          Document-language labels, date formatting, bullet parsing
  doc-style.ts          Appearance model shared by CVs and letters (accent, font, size, spacing, margins)
  letter-schema.ts      Cover letter data model, defaults, sanitising, date line
  letter-reducer.ts     Pure letter editor state transitions
  documents.ts          Multi-document localStorage store and legacy draft migration
  storage.ts            Safe localStorage access, preferences, erase, legacy draft reader
  export/               docx.ts, text.ts, model.ts (shared export content), download.ts
  pdf.ts                Print-to-PDF helpers and file naming
  sample-cv.ts          Clearly fictional sample CVs and letter (previews and tests)
  i18n/                 en.ts, id.ts dictionaries, features/*.ts per-feature dictionaries, provider
  ai/provider.ts        Optional AI provider contract (disabled by default)
  ai/prompts.ts         Prompt templates with no-fabrication rules
tests/
  unit/                 Vitest unit and integration tests
  e2e/                  Playwright end-to-end tests
public/_headers         Security headers for Cloudflare Pages
vercel.json             Build settings and security headers for Vercel
```

## Local development

Requirements: Node.js 20.9 or newer (`.nvmrc` pins 22) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production static export to `out/` |
| `npm start` | Serve `out/` locally (after a build) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit and integration tests |
| `npm run test:e2e` | Playwright end-to-end tests against `out/` (run `npm run build` first) |

The end-to-end tests use Chromium. If it isn't installed, run `npx playwright install chromium` once. The PDF tests also extract text with `pdftotext` (poppler-utils) when it is available, and skip only that check otherwise. Generated PDFs are written to `test-results/` for manual inspection.

## Deploying to Vercel

The site is a fully static export, so it runs on Vercel without serverless functions. `vercel.json` sets the build
commands and the same security headers as `public/_headers` (Vercel does not read `_headers`).

### Option A: Git integration (recommended, no token needed)

1. Open <https://vercel.com/new> and sign in with GitHub.
2. Import the `AI-CV-Maker` repository. Vercel detects Next.js; keep the defaults (install `npm ci`, build
   `npm run build`, both come from `vercel.json`). No environment variables are required.
3. Optional environment variables: `NEXT_PUBLIC_CONTACT_EMAIL` (footer contact) and `NEXT_PUBLIC_AI_PROXY_URL`
   (see "Optional AI integration").
4. Click **Deploy**. Vercel builds the production branch (`main` by default) and gives you a `*.vercel.app` URL.
   Every push to `main` redeploys; other branches get preview URLs.

Vercel builds **production from `main`**. Merge the work branch into `main` first, or change the production branch in
the project's **Settings → Environments → Production → Branch Tracking**. Preview deployments of other branches are
protected by Vercel Authentication on new projects by default, so only you can open them until you change
**Settings → Deployment Protection**.

### Option B: Vercel CLI

```bash
npx vercel login
npx vercel          # preview deployment
npx vercel --prod   # production deployment
```

### Plan and cost

Vercel's free **Hobby** plan is for personal, non-commercial use. A commercial deployment needs a paid Pro plan;
Cloudflare Pages (below) is free for commercial use.

## Deploying to Cloudflare Pages (free plan)

The build is fully static, so no Workers, Functions or paid features are needed.

### Option A: Git integration (recommended)

1. Push this repository to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and select the repository.
3. Configure the build:
   - **Framework preset:** `Next.js (Static HTML Export)`
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
   - **Environment variables (optional):** `NODE_VERSION=22` (the `.nvmrc` already requests Node 22), and `NEXT_PUBLIC_CONTACT_EMAIL` if the footer should show a contact address (see the notes below).
4. Click **Save and Deploy**. Each push to the production branch redeploys, and other branches get preview URLs.

### Option B: Direct upload with Wrangler

```bash
npm run build
npx wrangler pages deploy out --project-name free-ai-cv-maker
```

Notes:
- `trailingSlash: true` emits `/builder/index.html` and so on, which Cloudflare Pages serves as `/builder/`. `out/404.html` is used automatically for unknown paths.
- `public/_headers` is copied to `out/_headers` and applies a Content-Security-Policy and other security headers. The CSP allows `'unsafe-inline'` scripts because Next.js static export inlines its bootstrap data. It was checked in Chromium without violations.
- No secrets are needed or committed. `.env*` files are git-ignored except `.env.example`.
- Footer contact: set `NEXT_PUBLIC_CONTACT_EMAIL=you@your-domain.example` at build time (in the Cloudflare Pages build settings, in `.env.local`, or inline as `NEXT_PUBLIC_CONTACT_EMAIL=… npm run build`) and the footer shows "Contact: <address>" as a `mailto:` link. Without it the footer has no contact line, so no dummy address is ever shown. The value is inlined into the static HTML and JavaScript, so a change needs a rebuild and the address is public.

## Data model and schema migrations

### CVs

`CVData` (in `lib/cv-schema.ts`) carries `schemaVersion`, currently **2**. Version 2 added `languages`, `organizations`, `awards`, `references`, `interests` and `customSections`, and extended `meta` with `sectionOrder`, `hiddenSections` (section keys such as `"experience"` or `"custom:<id>"`) and `style` (the appearance settings from `lib/doc-style.ts`). An empty `sectionOrder` means "use the template's order" (`lib/cv-sections.ts`).

All external input (localStorage, imported files) goes through `parseDocumentValue` / `parseDocumentJson` (any document) or `parseCVValue` / `parseCVJson` (CVs only) in `lib/cv-validation.ts`, which:

1. unwraps the envelope,
2. migrates step by step using `migrations[fromVersion]` (v1 data gets the new lists empty, the template's section order and the default style, so it looks exactly as before),
3. sanitises every field (types, lengths, list sizes, unique ids across all lists, valid section keys only, `data:image/*` photos only, http(s)-only links, valid colours and style options).

Data without a version is treated as v1. Data from a *newer* version than the app knows is rejected (imports show an error).

### Cover letters

`LetterData` (in `lib/letter-schema.ts`) has `kind: "letter"` and its own `schemaVersion` (`LETTER_SCHEMA_VERSION`, currently 1), and is sanitised by `sanitizeLetter`.

### Export files

JSON backups are written by `serializeDocument` as `{ app: "free-ai-cv-maker", kind: "cv" | "letter", exportedAt, data }`. Files from the single-draft version (`{ app, exportedAt, data }` without `kind`) are read as CVs and migrated.

### Browser storage

`lib/documents.ts` keeps every document in `localStorage` under the `free-cv-maker:` prefix:

| Key | Contents |
| --- | --- |
| `free-cv-maker:docs` | Index of documents: `{ id, kind, name, createdAt, updatedAt }[]` |
| `free-cv-maker:doc:<id>` | One document: `{ schemaVersion, savedAt, kind, name, createdAt, data }` |
| `free-cv-maker:active` | Id of the document the builder opens |
| `free-cv-maker:corrupted:<id>` | Raw contents of a document that could not be read, set aside instead of overwritten |
| `free-cv-maker:ui-lang`, `free-cv-maker:hide-print-hint` | Preferences |

The index repairs itself: a corrupted index is rebuilt from the stored documents, and documents missing from it are added back.

On opening the builder, `migrateLegacyStorage()` moves the single-draft version's `free-cv-maker:draft` and `free-cv-maker:backup` into documents (the draft becomes the active document, the backup is named after its content or "Previous draft") and then removes the old keys. Unreadable legacy data is kept under `free-cv-maker:corrupted` (or a numbered fallback key) rather than deleted. When storage is too full to hold the draft as a document, the migration reports it as `blocked`; the builder then shows the draft unsaved with a storage-full notice, leaves it under its old key, and stores it as a document (removing the old key) once a save succeeds. "Erase all local data" removes every `free-cv-maker:` key.

### Changing the CV schema

1. Update the interfaces and `CV_SCHEMA_VERSION` in `lib/cv-schema.ts`.
2. Add `migrations[N] = (raw) => ({ ...raw, schemaVersion: N + 1, /* transform */ })` for the previous version `N`.
3. Update `sanitizeCV` for the new fields, and add a test in `tests/unit/cv-validation.test.ts`.

## Optional AI integration

AI is **off by default**, and nothing in the core workflow depends on it. To enable it:

1. Deploy your own server-side proxy, for example a Cloudflare Worker, that holds the AI provider's API key and accepts:
   ```
   POST <proxy-url>
   Content-Type: application/json
   { "task": "rewrite-summary", "system": "...", "prompt": "...", "language": "en" | "id" }
   → 200 { "text": "..." }
   ```
   The proxy should enforce rate limits, request size limits and an allow-list of origins, and must not log CV text.
2. Build with `NEXT_PUBLIC_AI_PROXY_URL=https://your-proxy.example.com/ai` (HTTPS only).
3. Add the proxy origin to `connect-src` in `public/_headers` (Cloudflare) and `vercel.json` (Vercel).

**Never** put a provider API key in a `NEXT_PUBLIC_*` variable or anywhere in the frontend, because those values are embedded in public JavaScript. The UI asks for explicit consent per request, shows exactly the text being sent, and requires the user to review a suggestion before applying it. Prompt templates in `lib/ai/prompts.ts` instruct the model to preserve facts and never invent experience, credentials or metrics. Only "rewrite summary" has UI today. Grammar, bullet conversion, keyword suggestions and translation exist as prompt templates only.

**Cost note:** AI APIs are generally paid per token, and a public free tool can generate significant usage. A proxy also needs hosting. Cloudflare Workers has a free tier with daily request limits, but higher volumes are billed. Budget, rate-limit and monitor before enabling.

## Testing status

Run locally during development (see the output of each command for current counts):

- `npm test`: Vitest unit and integration tests. They cover schema validation and the v1 → v2 migration, the CV and letter reducers, section order and visibility, the documents store (index repair, corruption, quota, legacy draft migration), storage and erase, JSON import/export for CVs and letters, the CV checker rules and score, the Word and plain text exports (including the generated `word/document.xml`), template and letter rendering with design settings, the design panel, the section and letter editors, PDF helpers, AI-disabled and consent flows, and builder integration (documents, tabs, downloads, check jumps).
- `npm run test:e2e`: Playwright tests against the static build. They cover the main user journey in a real browser, multi-page A4 PDFs per template (content complete, no blank pages, no heading stranded at a page bottom), no remote requests, axe WCAG 2.1 AA scans of all pages, the language switch, keyboard operation, the erase-data flow, corrupted-data recovery and the mobile tab layout with no horizontal overflow. See `tests/e2e/` for the current list.

## Known limitations

- **PDF export uses the browser's print dialog.** Users must pick "Save as PDF", and on some browsers turn off headers/footers and turn on background graphics (the builder shows these steps). Output was verified in Chromium. Firefox and Safari can paginate slightly differently, and mobile print-to-PDF varies by OS.
- **Preview page breaks are approximate.** The printed PDF may move a whole entry to the next page to avoid splitting it.
- **Local storage only.** There is no sync between devices or browsers. Clearing site data or using private windows loses documents, and storage is limited (typically about 5 MB shared by all documents; photos are resized to 360 px JPEG before saving). Use JSON backups to keep copies.
- **Word files depend on installed fonts.** Word, Google Docs and LibreOffice use the fonts on the computer that opens the file and substitute a similar one when the chosen font is missing. The layout follows the templates closely but isn't identical to the PDF. A WebP photo from an imported file is left out of the Word file.
- **The CV check is a heuristic.** It looks for missing details and common problems with word lists and simple rules; it can't judge the quality of the content.
- **Static HTML is pre-rendered in English.** An Indonesian preference is applied right after load, so the page may briefly show English, and search engines see English.
- **ATS compatibility** of the ATS Minimal template follows common guidance (single column, standard headings, real text), but no tool can guarantee how every ATS parses a document.
- Reordering uses up/down buttons, not drag-and-drop.
- Only the summary has AI UI, and no AI proxy implementation is included.
- `npm audit` reports high-severity advisories in the dev-only ESLint toolchain (`braces` via `eslint-config-next`). They are not part of the shipped static site.
- Automated end-to-end tests run in Chromium only.

## Services that could introduce costs in future

- **AI provider API usage** (per token), plus hosting for the AI proxy beyond free tiers.
- **Cloudflare** beyond the free Pages plan, for example Workers/Functions above free limits or a custom domain registration.
- **Vercel**: the free Hobby plan is non-commercial only; commercial use or higher usage needs a paid Pro plan.
- Any future cloud sync, accounts or analytics would need a backend, a database and an updated privacy notice.

## License

No license has been chosen yet. Add one before accepting outside contributions.
