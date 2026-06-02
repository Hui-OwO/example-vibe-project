import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/feedback/route";

// 이 핸들러는 의도적으로 미구현 stub(501)이다. 현재 계약을 고정해,
// 학습자가 IDEAS.md #3를 완성하면 이 테스트가 실패→갱신 대상이 되게 한다.
describe("app/api/feedback (현재 stub)", () => {
  it("POST는 아직 미구현이라 501 stub 응답을 반환한다", async () => {
    const req = new Request("http://test/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conceptSlug: "agent-loop", rating: 5 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(501);

    const body = await res.json();
    expect(body.stub).toBe(true);
  });
});
