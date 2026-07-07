# CLAUDE.md — <Example-Vibe-Project>

마지막 업데이트: 2026-07-07

---

## 1. 절대 규칙

- `console.log`를 production 코드에 두지 마라. 로깅은 `lib/logger.ts`만 사용
  (기존 코드의 `console.log` 혼재는 강의용 의도적 약점 — README 참조. 새로 추가하지만 마라)
- 강제 푸시 금지 — `git push --force`는 `.claude/settings.json` deny 목록과 `git-guard` 훅이 차단한다

---

## 2. 명령어 치트시트

```bash
# 빌드 / 개발 서버
npm run dev
npm run build

# 테스트
npm test                    # 전체 (vitest run)
npm run test:watch          # watch 모드
npm test path/to/file       # 단일 파일

# Lint / 타입체크
npm run lint
npm run typecheck
npm run format
```

---

## 3. 아키텍처 한눈에

```
example-vibe-project/
  app/         # Next.js App Router (agent-loop, memory-hierarchy, API routes)
  components/  # UI 및 시각화 React 컴포넌트
  lib/         # 데이터, API, 로깅 등 공통 비즈니스 로직
  tests/       # Vitest 기반 테스트 코드
```

**핵심 모듈 3~5개**:

- `app/agent-loop/` — Agent Loop 시각화 페이지.
- `app/memory-hierarchy/` — Memory Hierarchy 시각화 페이지.
- `lib/concepts.ts` — 핵심 개념 데이터 정의
- `lib/logger.ts` — 공통 로깅 유틸

---

## 4. 컨벤션

### 네이밍

- 파일: `kebab-case.ts`
- 컴포넌트: `PascalCase.tsx`
- hook: `useXxx.ts`
- 테스트: `<원본>.test.ts`

### 테스트

- 단위 테스트는 mocking OK
- 모든 테스트는 `tests/` 아래, 절대 `app/`, `components/`, `lib/` 안에는 두지 않는다.

### 에러 처리

- API 라우트는 `lib/errors.ts`의 `AppError` 던지기
- catch 블록에서 무의미한 `console.log` 금지 — `logger.error`만

---

## 5. 지금 진행 중 (TODO)

- 실습 후보 작업 목록은 `IDEAS.md`가 단일 출처 — 여기에 중복 기재하지 않는다.
