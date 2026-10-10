# Free AI CV Maker

A free, privacy-friendly CV builder that runs entirely in the browser. Create a professional CV, choose a template, save drafts locally and download a clean A4 PDF. There are no accounts, no watermarks, no download limits and no paid services.

- **Free:** creating CVs and downloading PDFs costs nothing. There are no ads, subscriptions or premium tiers.
- **No account:** drafts are stored in the browser's `localStorage`.
- **Private:** CV data never leaves the device. The app has no backend, database or analytics.
- **Works without AI:** AI assistance is optional, disabled by default and consent-gated.
- **English & Indonesian** interface, with a separate CV language for headings and dates.

## Features

| Area | What's implemented |
| --- | --- |
| Pages | Landing (`/`), CV builder (`/builder/`), privacy notice (`/privacy/`), help (`/help/`) |
| Editor | Personal info (with optional photo), summary with character guidance, work experience, education, projects, technical and soft skills with optional proficiency, certifications. Add, edit, remove (confirmation when an entry has content) and reorder entries with accessible up/down buttons. Non-blocking validation for email, URLs and date order. |
| Preview | Live A4 preview scaled to fit, with approximate page-break guides and a page count |
| Templates | **ATS Minimal** (single column, no photo), **Modern Professional** (serif name, accent rules, optional photo), **Graduate / Student** (education and projects first, skill tags). All three render the same data. |
| PDF | Browser print-to-PDF with dedicated print CSS: A4, consistent margins, selectable text, headings kept with their content, no app UI, no watermark, no remote assets |
| Drafts | Debounced autosave (600 ms) plus a flush when the tab is hidden, recovery after refresh, "Save draft", "Start new CV" (keeps the previous draft), "Restore previous draft", "Delete draft" with confirmation, "Erase all local data" on the privacy page |
| Import/export | Versioned JSON export; import is validated, sanitised and migrated |
| i18n | English and Indonesian UI (`lib/i18n`), with an independent CV language for headings and month names (`lib/cv-format.ts`) |
| Accessibility | Semantic landmarks, labelled controls, visible focus, skip link, native `<dialog>` modals, live status messages, tab pattern on mobile, axe-checked pages |
| AI (optional) | Provider contract, prompt templates and a consent → review → apply UI for summary rewrites. It only appears when an operator configures their own proxy. |

## Tech stack

- [Next.js 16](https://nextjs.org) App Router with `output: "export"` (fully static), React 19, TypeScript (strict)
- Tailwind CSS 4 for the app UI. The CV document uses plain CSS in physical units (`app/globals.css`).
- Vitest + Testing Library (jsdom) for unit and integration tests, Playwright + axe-core for end-to-end tests
- **No runtime dependencies** beyond `next`, `react` and `react-dom`

## Repository structure

```
app/
  layout.tsx            Root layout (metadata, I18nProvider)
  globals.css           Design tokens, CV template styles, A4 print stylesheet
  page.tsx              Landing page
  builder/page.tsx      CV builder
  privacy/page.tsx      Privacy notice + erase local data
  help/page.tsx         Instructions (incl. PDF export per browser)
  icon.svg
components/
  builder/BuilderApp.tsx   Builder state, autosave, toolbar, dialogs, import/export, print root
  cv-form/                 Section editors, generic RepeatableSection, optional AI assist
  cv-preview/CVPreview.tsx Scaled A4 preview with page guides
  templates/               AtsMinimal, ModernProfessional, Graduate + shared parts
  layout/                  Site header (with language switcher) and footer
  pages/                   Client content for landing, help and privacy pages
  ui/                      Field, MonthField, Dialog, Icons, shared class names
lib/
  cv-schema.ts          Typed, versioned data model and helpers
  cv-validation.ts      Sanitisation, JSON import/export, migrations, field validators
  cv-reducer.ts         Pure editor state transitions
  cv-format.ts          CV-language labels, date formatting, bullet parsing
  storage.ts            Safe localStorage access (draft, backup, corruption handling)
  pdf.ts                Print-to-PDF helper and file naming
  sample-cv.ts          Clearly fictional sample CV (previews and tests)
  i18n/                 en.ts, id.ts dictionaries and provider
  ai/provider.ts        Optional AI provider contract (disabled by default)
  ai/prompts.ts         Prompt templates with no-fabrication rules
tests/
  unit/                 Vitest unit and integration tests
  e2e/                  Playwright end-to-end tests
public/_headers         Security headers for Cloudflare Pages
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

## Deploying to Cloudflare Pages (free plan)

The build is fully static, so no Workers, Functions or paid features are needed.

### Option A: Git integration (recommended)

1. Push this repository to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and select the repository.
3. Configure the build:
   - **Framework preset:** `Next.js (Static HTML Export)`
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
   - **Environment variable (optional):** `NODE_VERSION=22`. The `.nvmrc` already requests Node 22.
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
- Replace the placeholder contact address in `lib/i18n/en.ts` and `lib/i18n/id.ts` (`footer.contactPlaceholder`) before going public.

## Data model and schema migrations

`CVData` (in `lib/cv-schema.ts`) carries `schemaVersion`. Stored drafts and exported files wrap it as `{ schemaVersion, savedAt | exportedAt, data }`. All external input (localStorage, imported files) goes through `parseCVValue` / `parseCVJson` in `lib/cv-validation.ts`, which:

1. unwraps the envelope,
2. migrates step by step using `migrations[fromVersion]`,
3. sanitises every field (types, lengths, list sizes, unique ids, `data:image/*` photos only, http(s)-only links).

To change the schema:

1. Update the interfaces and `CV_SCHEMA_VERSION` in `lib/cv-schema.ts`.
2. Add `migrations[N] = (raw) => ({ ...raw, schemaVersion: N + 1, /* transform */ })` for the previous version `N`.
3. Update `sanitizeCV` for the new fields, and add a test in `tests/unit/cv-validation.test.ts`.

Data from a *newer* version than the app knows is rejected (imports show an error). An unreadable stored draft is moved to `free-cv-maker:corrupted` instead of being overwritten.

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
3. Add the proxy origin to `connect-src` in `public/_headers`.

**Never** put a provider API key in a `NEXT_PUBLIC_*` variable or anywhere in the frontend, because those values are embedded in public JavaScript. The UI asks for explicit consent per request, shows exactly the text being sent, and requires the user to review a suggestion before applying it. Prompt templates in `lib/ai/prompts.ts` instruct the model to preserve facts and never invent experience, credentials or metrics. Only "rewrite summary" has UI today. Grammar, bullet conversion, keyword suggestions and translation exist as prompt templates only.

**Cost note:** AI APIs are generally paid per token, and a public free tool can generate significant usage. A proxy also needs hosting. Cloudflare Workers has a free tier with daily request limits, but higher volumes are billed. Budget, rate-limit and monitor before enabling.

## Testing status

Run locally during development:

- `npm test`: 73 unit and integration tests (schema validation, migration, reducer add/edit/delete/reorder, empty-section handling, storage persistence/corruption/quota, JSON import/export, template switching and rendering, PDF helper, AI-disabled and consent flows, builder integration).
- `npm run test:e2e`: 15 Playwright tests. They cover the full user journey (landing → create → templates → refresh → restore → print → PDF inspection → delete), a multi-page A4 PDF per template (content complete, no blank pages, no heading stranded at a page bottom), no remote requests, axe WCAG 2.1 AA scans of all pages, the language switch, keyboard operation, the erase-data flow, corrupted-draft recovery, and the mobile tab layout with no horizontal overflow.

## Known limitations

- **PDF export uses the browser's print dialog.** Users must pick "Save as PDF", and on some browsers turn off headers/footers and turn on background graphics (the builder shows these steps). Output was verified in Chromium. Firefox and Safari can paginate slightly differently, and mobile print-to-PDF varies by OS.
- **Preview page breaks are approximate.** The printed PDF may move a whole entry to the next page to avoid splitting it.
- **Local storage only.** There is no sync between devices or browsers. Clearing site data or using private windows loses drafts, and storage is limited (typically about 5 MB; photos are resized to 360 px JPEG before saving). Only one current draft and one previous draft are kept; use JSON export for more.
- **Static HTML is pre-rendered in English.** An Indonesian preference is applied right after load, so the page may briefly show English, and search engines see English.
- **ATS compatibility** of the ATS Minimal template follows common guidance (single column, standard headings, real text), but no tool can guarantee how every ATS parses a document.
- Reordering uses up/down buttons, not drag-and-drop.
- Only the summary has AI UI, and no AI proxy implementation is included.
- `npm audit` reports high-severity advisories in the dev-only ESLint toolchain (`braces` via `eslint-config-next`). They are not part of the shipped static site.
- Automated end-to-end tests run in Chromium only.

## Services that could introduce costs in future

- **AI provider API usage** (per token), plus hosting for the AI proxy beyond free tiers.
- **Cloudflare** beyond the free Pages plan, for example Workers/Functions above free limits or a custom domain registration.
- Any future cloud sync, accounts or analytics would need a backend, a database and an updated privacy notice.

## License

No license has been chosen yet. Add one before accepting outside contributions.
