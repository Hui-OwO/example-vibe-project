import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { postFeedback } from "@/lib/api/axios-client";

// axios 라이브러리 자체를 모킹해 래퍼(postFeedback)의 로직만 검증한다.
vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

const mockedPost = vi.mocked(axios.post);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("lib/api/axios-client", () => {
  it("postFeedback는 /api/feedback로 payload를 POST하고 data를 반환한다", async () => {
    mockedPost.mockResolvedValue({ data: { id: 1, savedAt: "2026-06-03" } });

    const result = await postFeedback({ conceptSlug: "agent-loop", rating: 5 });

    expect(result).toEqual({ id: 1, savedAt: "2026-06-03" });
    expect(mockedPost).toHaveBeenCalledWith("/api/feedback", {
      conceptSlug: "agent-loop",
      rating: 5,
    });
  });

  it("요청이 실패하면 에러를 전파한다", async () => {
    mockedPost.mockRejectedValue(new Error("network down"));

    await expect(
      postFeedback({ conceptSlug: "agent-loop", rating: 1 }),
    ).rejects.toThrow("network down");
  });
});
