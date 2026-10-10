import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HelpContent } from "@/components/pages/HelpContent";

export const metadata: Metadata = {
  title: "Help",
  description: "How to fill in your CV, save drafts and download a PDF in each browser.",
};

export default function Page() {
  return (
    <>
      <SiteHeader />
      <HelpContent />
      <SiteFooter />
    </>
  );
}
