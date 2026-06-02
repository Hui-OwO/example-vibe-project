import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "@/app/api/concepts/[slug]/route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("app/api/concepts/[slug]", () => {
  it("존재하는 slug는 200과 concept를 반환한다", async () => {
    const res = await GET(new Request("http://test/"), {
      params: Promise.resolve({ slug: "agent-loop" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.concept.slug).toBe("agent-loop");
  });

  it("없는 slug는 404와 not_found를 반환한다", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await GET(new Request("http://test/"), {
      params: Promise.resolve({ slug: "does-not-exist" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("not_found");
  });
});
