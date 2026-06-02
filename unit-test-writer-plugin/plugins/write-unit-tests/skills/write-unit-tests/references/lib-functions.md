# 순수 함수 / lib 모듈 테스트 패턴

`lib/` 아래의 함수·클래스처럼 입력 → 출력이 명확하고 부수효과가 적은 코드용
패턴입니다. 모킹 없이 직접 호출해 반환값과 throw를 검증하는 것이 기본입니다.

## 무엇을 검증할까

- **정상 반환값(해피패스)**: 대표적인 입력에 대해 기대한 값/형태를 반환하는지.
- **계약을 드러내는 핵심 엣지**: 없는 입력 → `undefined`, 기본값, 잘못된 입력 →
  에러 throw. 모든 경계를 망라하지 말고 그 함수가 "약속"하는 동작에 집중합니다.
- **클래스**: 기본 생성·옵션 override·프로퍼티 값.

## 기본 예시 (기존 테스트 그대로)

`lib/concepts.ts` → `tests/concepts.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { listConcepts, findConcept } from "@/lib/concepts";

describe("lib/concepts", () => {
  it("listConcepts는 최소 2개 이상의 개념을 반환한다", () => {
    const all = listConcepts();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.every((c) => c.slug && c.title)).toBe(true);
  });

  it("findConcept는 없는 slug에 undefined를 반환한다", () => {
    expect(findConcept("does-not-exist")).toBeUndefined();
  });
});
```

## 에러 throw 검증

`AppError`처럼 throw하거나 옵션을 받는 코드:

```typescript
import { describe, it, expect } from "vitest";
import { AppError } from "@/lib/errors";

describe("lib/errors", () => {
  it("기본값은 500 + internal_error", () => {
    const err = new AppError("boom");
    expect(err.status).toBe(500);
    expect(err.code).toBe("internal_error");
  });
});

// 함수가 던지는 경우:
//   expect(() => doThing(bad)).toThrow();
//   expect(() => doThing(bad)).toThrow(AppError);
```

## console 등 부수효과만 있는 함수 (예: lib/logger.ts)

`logger`처럼 반환값 없이 `console.*`로만 출력하는 경우, `vi.spyOn`으로 콘솔을
가로채 호출 여부와 인자를 검증합니다. 테스트가 콘솔을 오염시키지 않도록
`mockRestore`로 정리하세요.

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "@/lib/logger";

describe("lib/logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("info는 console.log로 JSON 한 줄을 출력한다", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info({ module: "test", event: "ping" });

    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({ level: "info", module: "test", event: "ping" });
    expect(payload.ts).toBeTypeOf("string"); // ISO 타임스탬프 포함
  });

  it("error는 console.error로 보낸다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error({ module: "test", event: "boom" });
    expect(spy).toHaveBeenCalledOnce();
  });
});
```

핵심: 동적인 값(`ts` 타임스탬프)은 정확한 문자열 대신 타입/형태로 검증해 테스트가
시간에 따라 깨지지 않게 합니다.

## 네트워크/외부 모듈을 호출하는 함수

함수가 전역 `fetch`나 `axios`, 다른 모듈을 호출한다면(예: `lib/api/fetch-client.ts`),
실제 호출 대신 의존성을 모킹해 해피패스와 에러 경로를 검증합니다. 이 패턴은
`references/mocking.md`를 참고하세요.
