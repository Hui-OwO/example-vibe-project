# loop-engineering 플러그인

어떤 신규 MVP·프로젝트에든 **루프 엔지니어링**을 한 줄로 설치하는 플러그인입니다.

> "에이전트에 프롬프트하지 말고, 에이전트에 프롬프트하는 루프를 설계하라"

- 원문 1: [루프 엔지니어링 — 에이전트를 프롬프트하는 시스템 설계하기](https://news.hada.io/topic?id=30336)
- 원문 2: [Fable 5 루프 설계하기 — Self-Correction Loop & Memory](https://news.hada.io/topic?id=30390)

## 무엇을 하나

| 구성 요소          | 이 플러그인의 구현                                                |
| ------------------ | ----------------------------------------------------------------- |
| 재귀적 목표        | `LOOP.md` — 목표 + 기계 검증 가능한 rubric + stop 조건            |
| 세션 간 메모리     | `.loop/memory.md` — Fail→Investigate→Verify→Distill, 최근 10개 캡 |
| 작성자·검증자 분리 | `loop-verifier` 에이전트 (판정 전용, 직접 재검증)                 |
| 자동화             | `/loop /loop-engineering 이어서` 로 self-pacing 반복              |
| 격리               | 위험 변경은 worktree에서 수행하도록 프로토콜에 내장               |

## 구조

```
loop-engineering-plugin/
  .claude-plugin/marketplace.json      # 로컬 마켓플레이스 정의
  plugins/loop-engineering/
    .claude-plugin/plugin.json         # 플러그인 매니페스트
    skills/loop-engineering/
      SKILL.md                         # 자기 라우팅: LOOP.md 없으면 설치, 있으면 반복
      templates/LOOP.md                # 목표 계약 템플릿
      templates/memory.md              # 메모리 템플릿
    agents/loop-verifier.md            # 독립 검증 에이전트
```

## 설치 (이식)

로컬 폴더 또는 git repo 어느 쪽이든 됩니다.

```bash
# 1) 마켓플레이스 등록 (로컬 경로 또는 GitHub repo)
/plugin marketplace add ./loop-engineering-plugin
#   또는: /plugin marketplace add <github-user>/loop-engineering-plugin

# 2) 플러그인 설치
/plugin install loop-engineering@loop-engineering-marketplace
```

## 사용법

```bash
# 새 프로젝트에서 — 루프 설치 (목표 인터뷰 → LOOP.md + .loop/memory.md 생성)
/loop-engineering MVP 목표: 회원가입~로그인 동작하는 API

# 수동으로 1 이터레이션
/loop-engineering 이어서

# 완전 자동 — 목표 달성 또는 stop 조건까지 self-pacing 반복
/loop /loop-engineering 이어서
```

## 설계 원칙 (성능·토큰 효율)

- **스킬 1개로 통합** — 평소엔 description 한 줄만 컨텍스트에 상주(lazy-load). MCP 서버 방식 대비 상시 토큰 비용 0에 가까움.
- **메모리 캡** — Attempts 최근 10개·항목당 2줄, 60줄 초과 시 규칙 승격 후 정리. 루프가 길어져도 컨텍스트가 부풀지 않음.
- **읽기 최소화** — 이터레이션당 LOOP.md + memory.md + 관련 파일만. 전체 탐색 금지.
- **기계 검증 강제** — rubric은 명령으로 판정 가능해야 하며, 검증 없는 루프는 시작 자체를 거부.

## 한계 (원문의 경고)

루프의 검증은 "주장"이지 "증명"이 아닙니다. 완료 시 사람 리뷰 요약이 출력되며,
최종 확인·코드 이해는 엔지니어의 몫입니다 (comprehension debt 방지).
