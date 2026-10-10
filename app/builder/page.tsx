import type { Metadata } from "next";
import { BuilderApp } from "@/components/builder/BuilderApp";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "CV Builder",
  description: "Edit your CV with a live A4 preview. Drafts are saved in your browser.",
};

export default function BuilderPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <BuilderApp />
      </main>
    </>
  );
}
