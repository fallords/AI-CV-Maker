import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LandingContent } from "@/components/pages/LandingContent";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <LandingContent />
      <SiteFooter />
    </>
  );
}
