# API 라우트 핸들러 테스트 패턴

`app/api/**/route.ts`의 Next.js App Router 핸들러용. 핸들러 함수(`GET`, `POST`
등)를 **직접 import해서 호출**하고, 반환된 `Response`(`NextResponse`)의
`status`와 JSON 본문을 검증합니다. HTTP 서버를 띄울 필요가 없습니다.

## 무엇을 검증할까

- **정상 응답(해피패스)**: status 200, 본문 JSON의 형태/키.
- **에러·분기(핵심 엣지)**: 없는 리소스 → 404, 잘못된 입력 → 400 등.
- 핸들러가 호출하는 lib 함수의 로직 자체는 그 모듈의 테스트에서 다루므로, 여기서는
  **핸들러의 응답 계약**에 집중합니다.

## 응답 읽는 법

`NextResponse.json(...)`은 표준 `Response`이므로 `await res.json()`으로 본문을,
`res.status`로 상태 코드를 읽습니다.

## 인자 없는 GET (app/api/concepts/route.ts)

```typescript
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/concepts/route";

describe("app/api/concepts", () => {
  it("GET은 200과 concepts 배열을 반환한다", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.concepts)).toBe(true);
    expect(body.concepts.length).toBeGreaterThan(0);
  });
});
```

> 이 핸들러는 `logger.info`로 콘솔에 출력합니다. 테스트 로그를 깔끔히 하려면
> `vi.spyOn(console, "log").mockImplementation(() => {})`로 가로채도 되지만,
> 필수는 아닙니다.

## 동적 라우트 + params (app/api/concepts/[slug]/route.ts)

이 핸들러는 두 번째 인자로 `{ params: Promise<{ slug: string }> }`를 받습니다
(Next 15에서 params는 Promise). 테스트에서 `params`를 `Promise.resolve(...)`로
직접 만들어 넘기고, 첫 인자 `Request`는 사용되지 않으면 더미를 넘깁니다.

```typescript
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/concepts/[slug]/route";

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
    const res = await GET(new Request("http://test/"), {
      params: Promise.resolve({ slug: "does-not-exist" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("not_found");
  });
});
```

## POST 등 본문이 있는 핸들러

요청 본문이 필요하면 `Request`에 직접 실어 보냅니다:

```typescript
const req = new Request("http://test/api/feedback", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ message: "hi" }),
});
// const res = await POST(req);
```

핸들러가 미완성 stub이거나 의도적으로 에러를 던지면, 억지로 통과시키지 말고
현재 동작을 그대로 검증하거나 사용자에게 보고하세요.
