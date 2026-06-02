---
name: write-unit-tests
description: >
  이 Next.js + TypeScript 프로젝트(Vitest)에서 유닛 테스트를 작성합니다. 사용자가 특정
  함수·모듈·React 컴포넌트·API 라우트의 테스트를 작성/추가/보완해달라고 하거나, "테스트
  짜줘", "커버리지 늘려줘", "lib/x.ts 테스트", "이 컴포넌트 테스트 어떻게 하지", "방금
  만든 거 테스트해줘" 같은 맥락이면 명시적으로 "유닛 테스트"라고 말하지 않아도 반드시 이
  스킬을 사용하세요. 단, 테스트 실행/디버깅만 요청하거나(예: "npm test 돌려줘"),
  E2E/통합 테스트, 또는 이 저장소가 아닌 다른 언어 프로젝트인 경우는 제외합니다.
---

# 유닛 테스트 작성 (Vitest)

이 저장소는 **TypeScript + Next.js** 프로젝트이며 테스트는 **Vitest 3 +
@testing-library/react + jsdom**로 돌아갑니다. 이 스킬의 목표는 *기존 테스트와
구분이 안 갈 만큼* 컨벤션을 그대로 따르는 유닛 테스트를 빠르게 추가하고, 실제로
실행해 통과까지 확인하는 것입니다.

## 워크플로

### 1. 대상을 확인하고 기존 컨벤션을 흡수한다
- 테스트할 대상 파일을 읽어 export, 시그니처, 의존성을 파악합니다.
- `tests/` 디렉터리의 기존 테스트(`concepts.test.ts`, `errors.test.ts`)를 한 번
  읽으세요. 새 테스트는 이 스타일과 한눈에 같아 보여야 합니다. 컨벤션을 추측하지
  말고 실제 파일에서 확인하는 것이 핵심입니다.

### 2. 대상 유형을 분류하고 해당 레퍼런스를 읽는다
대상이 셋 중 무엇인지 판단하고, 그에 맞는 레퍼런스를 읽은 뒤 패턴을 따르세요.

| 대상 | 예시 | 읽을 레퍼런스 |
|------|------|---------------|
| 순수 함수 / lib 모듈 | `lib/concepts.ts`, `lib/errors.ts`, `lib/logger.ts` | `references/lib-functions.md` |
| React 컴포넌트 | `components/*.tsx` | `references/react-components.md` |
| API 라우트 핸들러 | `app/api/**/route.ts` | `references/api-routes.md` |

여러 유형이 섞인 요청이면 각각의 레퍼런스를 읽습니다.

**추가로**, 대상이 아래 중 하나라면 `references/mocking.md`도 **함께** 읽으세요. 이런
코드는 의존성을 모킹하거나 비동기를 기다려야 안정적으로 테스트됩니다:
- 네트워크를 호출(전역 `fetch`, `axios`)하거나 다른 모듈의 함수를 호출하는 코드
  (예: `lib/api/fetch-client.ts`, `lib/api/axios-client.ts`)
- 제출·클릭 후 비동기로 상태가 바뀌는 컴포넌트 (예: `components/FeedbackForm.tsx`)
- 의도적으로 미구현된 stub 핸들러 (예: `app/api/feedback/route.ts`)

### 3. 테스트 파일을 작성한다
아래 **공통 컨벤션**을 지키면서, 레퍼런스의 유형별 패턴대로 작성합니다.

### 4. 실행해서 검증한다
- `npm test`를 실행합니다(= `vitest run`, 전체 스위트).
- 실패하면 출력을 읽고 원인을 파악해 **테스트를** 고칩니다.
- 단, 실패 원인이 명백히 **소스 코드 버그**로 보이면 테스트를 억지로 통과시키도록
  바꾸지 말고, 그 사실을 사용자에게 보고하세요. 더미 학습 프로젝트라 의도적인
  약점이 심어져 있을 수 있습니다.
- 기존 테스트가 깨지지 않았는지(회귀) 함께 확인합니다.

### 5. 결과를 보고한다
추가한 파일, 케이스 개수, `npm test` 결과(통과/실패 수)를 간결히 요약합니다.

## 공통 컨벤션 (반드시 일치)

기존 테스트가 따르는 규칙이며, 새 테스트도 동일해야 자연스럽습니다.

- **위치·네이밍**: 루트 `tests/` 디렉터리에 `<모듈명>.test.ts`. (예: `lib/logger.ts`
  → `tests/logger.test.ts`)
- **import**: `globals: true`로 설정돼 있어도 기존 코드처럼 명시적으로 import 합니다:
  `import { describe, it, expect } from "vitest";`
- **경로 alias**: 대상은 `@/...`로 import 합니다. (예: `import { logger } from "@/lib/logger";`)
- **구조**: 최상위 `describe`의 이름은 **모듈 경로**("lib/logger", "components/Card",
  "app/api/concepts")로 둡니다.
- **테스트 설명은 한글**: `it`의 설명은 "~한다/~된다" 형태의 한글 행동 서술로 씁니다.
  예: `it("listConcepts는 최소 2개 이상의 개념을 반환한다", ...)`.
- **AAA 패턴**: Arrange(준비) → Act(실행) → Assert(검증) 순서로 자연스럽게 흐르게 합니다.
- **커버리지 철학**: **해피패스를 중심**으로 하되, 명백한 핵심 엣지 케이스(없는 입력 →
  `undefined`, 잘못된 입력 → 에러 throw, 빈 배열/null 등)를 *소수* 추가합니다.
  경계값을 모두 망라하려 하지 말고, 그 모듈의 계약(contract)을 드러내는 케이스에
  집중하세요. 기존 테스트가 모듈당 2~3개 케이스로 간결한 점을 참고합니다.
- **불필요한 mocking 금지**: 순수 로직은 모킹 없이 직접 호출해 검증합니다. 모킹이
  꼭 필요한 경우(console, 외부 I/O)만 `vi.spyOn`/`vi.fn`을 사용합니다.

## 실행 명령 참고
- `npm test` — 전체 테스트 1회 실행 (CI 동일).
- 단일 파일만 빠르게 보고 싶으면 `npx vitest run tests/<파일>.test.ts`.
