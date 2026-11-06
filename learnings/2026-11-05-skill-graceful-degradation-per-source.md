# CLI 의존 스킬의 부분 동작(graceful degradation) 설계

**문제(한 줄):** `daily-briefing` 스킬이 도구 하나(`gh`/`gcalcli`/`jq`)만 빠져도 조용히 빈 결과를 내거나 전체가 멈췄다 — 빠진 도구가 담당하는 **그 섹션만** 건너뛰고 나머지는 정상 브리핑해야 한다.

## 접근

1. **도구를 소스에 매핑**: 📅캘린더=`gcalcli`, 🔀PR=`gh`+`jq`, 🔨CI=`gh`+`jq`. 각 수집 스크립트가 "자기 소스에 필요한 도구"만 알면 된다.
2. **공통 헬퍼 `scripts/_lib.sh`**: `require <도구>...`가 `command -v`로 점검해 누락 시 `SKIP: <도구> 미설치 …` + 설치 안내를 stdout에 찍고 **exit 3**. 설치 안내는 `_install_hint()` 한 곳에 모아 중복 제거.
3. **약속된 신호(contract)**: stdout 첫 줄 `SKIP:` + exit 3 = "이 섹션만 건너뜀". 오케스트레이터(SKILL.md)는 이 신호를 받으면 해당 섹션을 `⚠️ 도구 미설치 - 건너뜀`으로 표기하고 나머지 두 소스로 계속 진행.
4. **데모 블록을 require 앞에 유지**: `BRIEFING_DEMO=1`은 fixtures로 동작하므로 실도구가 필요 없다 → demo 분기가 먼저 `exit 0`, 그 뒤에 `. _lib.sh; require …`. 순서가 핵심.
5. **검증**: `require`를 직접 호출(통과/단일누락/혼합) + `bash -n` 문법검사 + 실제 end-to-end SKIP.

## 의도적으로 하지 않은 것 (judgment calls)

- **인증(auth) 점검은 각 스크립트에 안 넣음** — 사용자 요구는 `command -v`(설치 여부). gh 인증은 `check-deps.sh`의 `GH_AUTH:` 한 줄로만. 범위를 요구에 정확히 맞춤.
- **상단 일괄 게이트(check-deps) 하나로 막지 않음** — all-or-nothing 게이트는 "셋 중 하나 빠짐 → 전부 중단"이 돼 부분 동작과 배치됨. check-deps는 *선택적 미리보기*로 남기고, 진짜 분기는 소스별 스크립트가 쥐게 함.
- **exit code를 1이 아니라 3으로** — `set -uo pipefail`의 일반 실패(1)와 "도구 미설치로 의도적 건너뜀"을 구분하려는 신호. 다른 숫자여도 되지만 문서에 못 박음.
- **jq 바이너리 필요 여부를 스크립트별로 다르게** — `collect-prs/ci`는 파이프 `jq`가 필요해 `require gh jq`, `pr-summary/ci-fail-log`는 `gh --jq`(내장) 사용이라 `require gh`만.

## 재사용 규칙

여러 외부 도구에 의존하는 스킬은 **"상단 일괄 게이트" 대신 "소스별 자가 점검 + 약속된 SKIP 신호(비상용 exit code)"**로 설계하라 — 한 도구가 빠져도 그 섹션만 접고 나머지는 산출된다. 그리고 **"도구 없음" 경로를 테스트할 땐 지우지 말고 그 도구의 디렉터리만 PATH에서 빼라**: `PATH=$(echo "$PATH"|tr ':' '\n'|grep -vxF "$(dirname "$(command -v TOOL)")"|paste -sd:) cmd` — coreutils는 유지되고 해당 도구만 사라져 실제 미설치 상황을 비파괴적으로 재현한다.

관련: [[cli-dependent-skill-demo-mode]]
