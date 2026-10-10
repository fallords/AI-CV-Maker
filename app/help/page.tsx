import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HelpContent } from "@/components/pages/HelpContent";

export const metadata: Metadata = {
  title: "Help",
  description: "How to create, save and download your CV as a PDF.",
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
