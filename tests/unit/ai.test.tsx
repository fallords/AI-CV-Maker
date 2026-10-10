import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AiSummaryAssist } from "@/components/cv-form/AiSummaryAssist";
import { HttpProxyProvider, getAIProvider, isAIEnabled, type AIProvider } from "@/lib/ai/provider";
import { buildPrompt } from "@/lib/ai/prompts";

describe("AI is disabled by default", () => {
  it("has no provider without configuration", () => {
    expect(getAIProvider({})).toBeNull();
    expect(getAIProvider({ NEXT_PUBLIC_AI_PROXY_URL: "  " })).toBeNull();
    expect(isAIEnabled()).toBe(false);
  });

  it("refuses non-HTTPS proxy URLs", () => {
    expect(getAIProvider({ NEXT_PUBLIC_AI_PROXY_URL: "http://insecure.example.com" })).toBeNull();
    expect(getAIProvider({ NEXT_PUBLIC_AI_PROXY_URL: "https://proxy.example.com/ai" })).toBeInstanceOf(HttpProxyProvider);
  });

  it("renders no AI controls when no provider is configured", () => {
    const { container } = render(<AiSummaryAssist text="Hello" language="en" onApply={() => {}} provider={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("never makes network requests when disabled", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<AiSummaryAssist text="Hello" language="en" onApply={() => {}} provider={null} />);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("AI prompts", () => {
  it("instruct the model not to fabricate facts", () => {
    const { system, prompt } = buildPrompt({ task: "rewrite-summary", text: "I build dashboards.", language: "id" });
    expect(system).toMatch(/Never invent/);
    expect(prompt).toContain("Indonesian");
    expect(prompt).toContain("I build dashboards.");
  });
});

describe("AI rewrite flow with a configured provider", () => {
  it("requires explicit consent and user review before applying", async () => {
    const user = userEvent.setup();
    const complete = vi.fn<AIProvider["complete"]>().mockResolvedValue({ text: "Improved summary." });
    const onApply = vi.fn();
    render(<AiSummaryAssist text="My summary" language="en" onApply={onApply} provider={{ id: "mock", complete }} />);

    await user.click(screen.getByRole("button", { name: /suggest an improved summary/i }));
    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toBeDisabled();
    expect(complete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: /I agree/i }));
    await user.click(send);
    expect(complete).toHaveBeenCalledWith({ task: "rewrite-summary", text: "My summary", language: "en" });

    expect(await screen.findByText(/may contain errors/i)).toBeInTheDocument();
    expect(screen.getByText("Improved summary.")).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /replace my summary/i }));
    expect(onApply).toHaveBeenCalledWith("Improved summary.");
  });

  it("shows an error and leaves the text unchanged when the provider fails", async () => {
    const user = userEvent.setup();
    const complete = vi.fn<AIProvider["complete"]>().mockRejectedValue(new Error("down"));
    const onApply = vi.fn();
    render(<AiSummaryAssist text="My summary" language="en" onApply={onApply} provider={{ id: "mock", complete }} />);
    await user.click(screen.getByRole("button", { name: /suggest an improved summary/i }));
    await user.click(screen.getByRole("checkbox", { name: /I agree/i }));
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be reached/i);
    expect(onApply).not.toHaveBeenCalled();
  });
});
