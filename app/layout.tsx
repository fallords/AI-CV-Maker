import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
// Website UI type: Archivo with its width axis (the wider cut is used for headings).
import "@fontsource-variable/archivo/standard.css";
// IBM Plex is only used by CV/letter documents set in it (lib/doc-style.ts font options).
// Bundled like the UI font, so PDFs never depend on remote assets.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-serif/400.css";
import "@fontsource/ibm-plex-serif/600.css";
import "@fontsource/ibm-plex-serif/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Free AI CV Maker | Write a CV and download it as a PDF",
    template: "%s | Free AI CV Maker",
  },
  description:
    "Write a CV in your browser and save it as an A4 PDF. It’s free, there’s no sign-up, and your draft stays on your device.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c29a6e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
