import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DownloadMenu } from "@/components/builder/DownloadMenu";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { I18nProvider } from "@/lib/i18n";
import { sampleCV } from "@/lib/sample-cv";

/*
 * tests/setup.ts gives jsdom a showModal() that only opens the dialog. Browsers also run
 * the dialog focusing steps, which move focus to the first focusable element inside it;
 * that is what overrode React's autoFocus. Emulate those steps here.
 */
const FOCUSABLE = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]";
let originalShowModal: typeof HTMLDialogElement.prototype.showModal;
beforeEach(() => {
  originalShowModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    originalShowModal.call(this);
    this.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  };
});
afterEach(() => {
  HTMLDialogElement.prototype.showModal = originalShowModal;
});

function OpenDialog({ marked }: { marked: boolean }) {
  const [open] = useState(true);
  return (
    <Dialog
      open={open}
      onClose={() => {}}
      title="Example"
      footer={
        <button type="button" data-autofocus={marked || undefined}>
          Continue
        </button>
      }
    >
      <label>
        <input type="checkbox" /> An option
      </label>
    </Dialog>
  );
}

describe("dialog focus", () => {
  it("focuses the element marked data-autofocus once the dialog is open", () => {
    render(<OpenDialog marked />);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveFocus();
  });

  it("otherwise leaves focus where the browser puts it (the first focusable element)", () => {
    render(<OpenDialog marked={false} />);
    expect(screen.getByRole("checkbox", { name: "An option" })).toHaveFocus();
  });

  it("focuses Cancel in a confirmation", () => {
    render(
      <ConfirmDialog
        open
        title="Delete it?"
        body={<a href="#more">More about deleting</a>}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(within(screen.getByRole("dialog", { name: "Delete it?" })).getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("focuses “Open print dialog” in the PDF instructions, not the checkbox before it", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLang="en">
        <DownloadMenu doc={{ kind: "cv", data: sampleCV() }} onNotice={() => {}} />
      </I18nProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    const dialog = screen.getByRole("dialog", { name: "Download your CV as PDF" });
    expect(within(dialog).getByRole("button", { name: "Open print dialog" })).toHaveFocus();
    expect(within(dialog).getByRole("checkbox")).not.toHaveFocus();
  });
});
