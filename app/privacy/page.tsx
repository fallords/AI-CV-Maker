import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PrivacyContent } from "@/components/pages/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Free AI CV Maker handles your data",
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
