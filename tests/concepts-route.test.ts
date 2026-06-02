import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "@/app/api/concepts/route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("app/api/concepts", () => {
  it("GET은 200과 concepts 배열을 반환한다", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.concepts)).toBe(true);
    expect(body.concepts.length).toBeGreaterThan(0);
  });
});
