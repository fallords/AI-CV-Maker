import type { Metadata } from "next";
import { BuilderApp } from "@/components/builder/BuilderApp";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "CV Builder",
  description:
    "Write CVs and cover letters and check them on an A4 preview as you type. Your documents are saved in this browser.",
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
