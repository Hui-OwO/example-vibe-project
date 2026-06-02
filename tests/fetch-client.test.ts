import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchConcepts } from "@/lib/api/fetch-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lib/api/fetch-client", () => {
  it("fetchConcepts는 응답의 concepts 배열을 반환한다", async () => {
    const fake = [{ slug: "a", title: "A" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ concepts: fake }),
      }),
    );

    const result = await fetchConcepts();
    expect(result).toEqual(fake);
    expect(fetch).toHaveBeenCalledWith("/api/concepts");
  });

  it("응답이 ok가 아니면 status를 담아 throw한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    await expect(fetchConcepts()).rejects.toThrow("500");
  });
});
