# 모킹 & 비동기 상호작용 패턴

대상이 **외부 의존성**(네트워크 `fetch`, `axios`, 다른 모듈)을 호출하거나 **비동기
상태 전환**(폼 제출 → 성공/실패 메시지)을 가질 때 읽으세요. 이런 코드는 의존성을
실제로 호출하면 테스트가 불안정해지므로, 의존성을 가짜로 바꿔 **우리 코드의 로직만**
검증합니다.

핵심 원칙: *우리가 작성한 코드의 동작만 검증한다.* axios나 fetch 자체의 동작이 아니라,
"성공 응답이 오면 X, 실패하면 Y"라는 우리 코드의 분기를 검증하는 것입니다. 그리고
모킹은 테스트마다 정리해 서로 새지 않게 합니다.

## 전역 fetch 모킹 (lib/api/fetch-client.ts 류)

`fetchConcepts`는 전역 `fetch`를 호출하고, `!res.ok`이면 throw합니다. 해피패스와
에러 경로를 모두 검증하세요. `vi.stubGlobal`로 갈아끼우고 `afterEach`에서 되돌립니다.

```typescript
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

    // 비동기 throw는 rejects.toThrow로 받는다
    await expect(fetchConcepts()).rejects.toThrow("500");
  });
});
```

요점: 에러 경로는 단순한 try/catch보다 `await expect(promise).rejects.toThrow(...)`가
간결하고 의도가 분명합니다.

## 모듈 모킹 — vi.mock (axios-client, 외부 라이브러리)

대상이 다른 모듈의 함수를 호출할 때, 그 모듈 전체를 가짜로 바꿉니다. `vi.mock`은
파일 최상단으로 **호이스팅**되므로 import 순서와 무관하게 적용됩니다. 가짜 함수를
가져와 테스트별로 동작(성공/실패)을 지정하세요.

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { postFeedback } from "@/lib/api/axios-client";

// 모듈 전체를 모킹 (호이스팅됨)
vi.mock("@/lib/api/axios-client", () => ({
  postFeedback: vi.fn(),
}));

// 타입이 있는 mock 핸들로 받기
const mockedPostFeedback = vi.mocked(postFeedback);

beforeEach(() => {
  vi.clearAllMocks();
});

// 이후 테스트에서:
//   mockedPostFeedback.mockResolvedValue({ id: 1 });   // 성공
//   mockedPostFeedback.mockRejectedValue(new Error()); // 실패
```

`axios`를 직접 모킹해야 한다면 `vi.mock("axios")` 후 `vi.mocked(axios.post)`로
접근합니다. 단, 우리가 만든 래퍼(`postFeedback`)가 있으면 라이브러리(axios)보다
**래퍼 모듈을 모킹**하는 편이 테스트가 구현 세부에 덜 묶입니다.

## 비동기 상호작용이 있는 컴포넌트 (FeedbackForm.tsx 류)

`useState`로 상태를 관리하고 제출 시 비동기 호출 후 메시지를 바꾸는 폼은:
상호작용을 일으킨 뒤 **상태 전환 결과는 `findBy*`(또는 `waitFor`)로 기다려서**
검증합니다. `getBy*`는 즉시 조회라 비동기 갱신을 놓칩니다.

> 이 프로젝트에는 `@testing-library/user-event`가 **설치돼 있지 않습니다**. 새 의존성을
> 추가하지 말고, `@testing-library/react`가 재export하는 **`fireEvent`**로 상호작용을
> 일으키세요. (입력 변경은 `fireEvent.change`, 제출 버튼은 `fireEvent.click`.)

```typescript
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

    // 비동기 상태 전환 → findBy로 대기
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
```

요점:
- 비동기 결과 대기에는 `await screen.findByText(...)`가 필수입니다(`getByText`는 즉시
  조회라 실패함).
- 정확한 전체 문구 대신 `/전송 실패/` 같은 정규식 부분 매칭을 쓰면 마크업 안의
  부가 텍스트에 덜 취약합니다.
- 입력값을 바꿔야 하면: `fireEvent.change(input, { target: { value: "..." } })`.

## stub / 미구현 핸들러 (app/api/feedback/route.ts 류)

핸들러가 의도적으로 미완성(예: 501 + `{ stub: true }` 반환)이면, **억지로 구현하거나
통과시키지 마세요.** 그건 이 스킬의 범위(테스트 작성)를 벗어납니다. 대신 둘 중
하나를 하세요:

1. **현재 계약을 그대로 검증**하는 테스트를 쓴다(지금 501 + stub을 반환한다는 사실을
   고정). 이렇게 하면 학습자가 나중에 구현을 완성할 때 이 테스트가 자연스럽게
   실패→갱신 대상이 되어 TODO 역할을 합니다.
2. 또는 사용자에게 "이 핸들러는 미구현 stub이라 의미 있는 유닛 테스트가 제한적"이라고
   보고하고 어떻게 할지 묻는다.

```typescript
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/feedback/route";

describe("app/api/feedback (현재 stub)", () => {
  it("POST는 아직 미구현이라 501 stub 응답을 반환한다", async () => {
    const req = new Request("http://test/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conceptSlug: "x", rating: 5 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.stub).toBe(true);
  });
});
```
