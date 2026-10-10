import { describe, expect, it, vi } from "vitest";
import { createEmptyCV } from "@/lib/cv-schema";
import { pdfFileName, printCV } from "@/lib/pdf";

describe("PDF export helpers", () => {
  it("builds a safe file name from the CV owner's name", () => {
    const cv = createEmptyCV();
    expect(pdfFileName(cv)).toBe("CV");
    cv.personal.fullName = "  Siti Nurhaliza Ç/../ ";
    expect(pdfFileName(cv)).toBe("Siti_Nurhaliza_C_CV");
  });

  it("opens the print dialog with the CV title and restores the page title afterwards", () => {
    const cv = createEmptyCV();
    cv.personal.fullName = "Jane Doe";
    document.title = "App";
    const print = vi.spyOn(window, "print").mockImplementation(() => {
      expect(document.title).toBe("Jane_Doe_CV");
    });
    expect(printCV(cv)).toBe(true);
    expect(print).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("afterprint"));
    expect(document.title).toBe("App");
  });

  it("reports failure when printing throws", () => {
    vi.spyOn(window, "print").mockImplementation(() => {
      throw new Error("blocked");
    });
    document.title = "App";
    expect(printCV(createEmptyCV())).toBe(false);
    expect(document.title).toBe("App");
  });
});
