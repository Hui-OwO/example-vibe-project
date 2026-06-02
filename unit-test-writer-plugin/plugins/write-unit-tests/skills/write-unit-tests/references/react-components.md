# React 컴포넌트 테스트 패턴

`components/*.tsx`용. `@testing-library/react`의 `render` + `screen`으로 실제
DOM(jsdom)을 만들어 사용자가 보는 결과를 검증합니다. 구현 세부(클래스명, 내부
state)보다 **렌더된 출력과 동작**을 검증하는 것이 원칙입니다.

## 무엇을 검증할까

- **props 기반 렌더링(해피패스)**: 넘긴 title/description/children 등이 화면에
  나타나는지.
- **조건부 렌더링(핵심 엣지)**: optional prop이 있을 때/없을 때 요소가 나타나거나
  사라지는지. (예: `badge`가 없으면 배지가 렌더되지 않음)
- **링크/속성**: `href` 등 핵심 속성이 올바른지.
- **상호작용**이 있는 컴포넌트면 `fireEvent`(클릭·입력)로 동작시킨 뒤 결과를 검증.
  (이 프로젝트엔 `@testing-library/user-event`가 미설치이니 새로 추가하지 말 것.)

## 쿼리 우선순위

가급적 접근성 기반 쿼리를 쓰세요: `getByRole`, `getByText`, `getByLabelText`.
존재하지 않음을 검증할 땐 `queryBy*` + `toBeNull()`을 씁니다(`getBy*`는 없으면
throw).

## 기본 예시 (components/Card.tsx)

`Card`는 `href, title, description`과 optional `badge`를 받아 `next/link`로
감싼 카드를 렌더합니다.

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/Card";

describe("components/Card", () => {
  it("title과 description을 렌더한다", () => {
    render(
      <Card href="/x" title="에이전트 루프" description="루프 설명" />,
    );

    expect(screen.getByText("에이전트 루프")).toBeDefined();
    expect(screen.getByText("루프 설명")).toBeDefined();
  });

  it("href를 링크에 연결한다", () => {
    render(<Card href="/agent-loop" title="t" description="d" />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/agent-loop");
  });

  it("badge가 있으면 배지를 렌더한다", () => {
    render(<Card href="/x" title="t" description="d" badge="NEW" />);
    expect(screen.getByText("NEW")).toBeDefined();
  });

  it("badge가 없으면 배지를 렌더하지 않는다", () => {
    render(<Card href="/x" title="t" description="d" />);
    expect(screen.queryByText("NEW")).toBeNull();
  });
});
```

## 참고 사항

- `vitest.config.ts`에 `environment: "jsdom"`, React 플러그인이 이미 설정돼 있어
  추가 설정 없이 JSX 렌더가 됩니다.
- 단언은 기존 프로젝트 스타일대로 Vitest 내장 `expect`(`toBeDefined`, `toBeNull`,
  `getAttribute(...).toBe(...)`)로 충분합니다. `@testing-library/jest-dom`
  matcher(`toBeInTheDocument` 등)는 현재 설정에 없으므로 도입하지 마세요.
- 상호작용 예시 (`fireEvent` 사용, 비동기 결과는 `findBy*`로 대기):

```typescript
import { fireEvent } from "@testing-library/react";
// fireEvent.click(screen.getByRole("button", { name: "보내기" }));
// expect(await screen.findByText("완료")).toBeDefined();
```

모듈 모킹·비동기 상태 전환이 필요한 컴포넌트는 `references/mocking.md`를 보세요.

`next/link`는 테스트에서 평범한 `<a>`로 렌더되므로 별도 모킹이 필요 없습니다.

## 의존성 호출 / 비동기 상태가 있는 컴포넌트

`"use client"` 컴포넌트가 `useState`로 상태를 바꾸거나, 제출 시 다른 모듈(예:
`@/lib/api/axios-client`의 `postFeedback`)을 호출한다면, 그 모듈을 `vi.mock`으로
모킹하고 `userEvent`로 상호작용한 뒤 결과를 `findBy*`로 기다려 검증해야 합니다.
이 패턴은 `references/mocking.md`를 참고하세요.
