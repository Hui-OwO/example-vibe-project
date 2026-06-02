import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FeedbackForm } from "@/components/FeedbackForm";
import { postFeedback } from "@/lib/api/axios-client";

vi.mock("@/lib/api/axios-client", () => ({ postFeedback: vi.fn() }));
const mockedPostFeedback = vi.mocked(postFeedback);

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("components/FeedbackForm", () => {
  it("제출에 성공하면 완료 메시지를 보여준다", async () => {
    mockedPostFeedback.mockResolvedValue({ ok: true });

    render(<FeedbackForm slug="agent-loop" />);
    fireEvent.click(screen.getByRole("button", { name: /피드백 보내기/ }));

    expect(await screen.findByText("전송 완료 ✓")).toBeDefined();
    expect(mockedPostFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ conceptSlug: "agent-loop", rating: 5 }),
    );
  });

  it("제출에 실패하면 실패 메시지를 보여준다", async () => {
    mockedPostFeedback.mockRejectedValue(new Error("boom"));

    render(<FeedbackForm slug="agent-loop" />);
    fireEvent.click(screen.getByRole("button", { name: /피드백 보내기/ }));

    expect(await screen.findByText(/전송 실패/)).toBeDefined();
  });
});
