import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PrivacyContent } from "@/components/pages/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Free AI CV Maker stores, where it is stored and what is sent over the internet.",
};

export default function Page() {
  return (
    <>
      <SiteHeader />
      <PrivacyContent />
      <SiteFooter />
    </>
  );
}
