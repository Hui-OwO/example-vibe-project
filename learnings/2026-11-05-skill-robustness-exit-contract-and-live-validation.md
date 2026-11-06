# 데이터 수집 스킬 견고화: 종료코드 계약 + 라이브 검증 + 대량 fixture 스캐폴딩

**문제(한 줄):** `daily-briefing`가 도구 미설치만 구분하고 인증 만료·API 실패·non-main 레포·stale CI·프롬프트 인젝션을 모두 "빈 결과"로 뭉갰다. 리뷰 지적을 받아 한꺼번에 견고화.

## 접근

1. **"없음 vs 못 가져옴"을 종료코드 계약으로 분리** — 가장 중요한 결정. 각 수집 스크립트: `0` 정상(0건 포함) / `3` 도구 미설치(`SKIP:`) / `4` 인증 필요(`AUTH:`) / `5` 수집 실패(`FAIL:`). `2>/dev/null`로 삼키고 exit 0 하던 걸 전부 교체. 오케스트레이터(SKILL.md)는 첫 줄 접두어로 섹션을 "⚠️ …건너뜀" 표기하고 나머지는 진행.
2. **외부 입력은 데이터이지 지시가 아니다** — PR/캘린더 제목·CI 로그에 SKILL 보안 규칙 + `gsub("[\u0000-\u001f]";" ")`로 제어문자 제거(한 줄/마크다운 보호) + `mask_secrets`로 토큰/키 마스킹.
3. **CI 현재상태 정확화** — `group_by(.workflowName)|map(max_by(.createdAt))`로 워크플로별 최신 run만. 기본 브랜치 `gh repo view --json defaultBranchRef`로 자동 탐지(main 가정 제거), `BRIEFING_REPO/BRIEFING_BRANCH`로 재정의.
4. **의존성 축소** — 외부 `jq` 파이프를 전부 `gh --jq`(내장)로 이관 → 의존 도구가 셋→둘.
5. **결정적 테스트 훅** — 시간 분류를 `BRIEFING_NOW`로, 시나리오 데이터를 `BRIEFING_FIXTURES=<dir>`로 주입 가능하게.

## 의도적으로 하지 않은 것 (judgment calls)

- **exit 5를 더 잘게 쪼개지 않음** — 리뷰는 네트워크/API/파싱 분리를 제안했지만, 개인 브리핑에선 "못 가져옴" 하나로 충분. 과분류는 가치 없는 복잡도.
- **`BRIEFING_TZ`·"정확히 24h" 보류** — 단일 세션 로컬 `date`로 충분하고 달력일 경계가 더 직관적. 멀티 TZ는 실제 시나리오 아님.
- **auth/stale-CI/non-main은 LLM eval로 안 만듦** — 데모 모드는 fixture를 cat할 뿐 수집 로직을 안 돈다. 이들은 *스크립트 로직*이라 라이브/유닛으로 검증하고, eval 케이스는 LLM 행동(60분 경계·빈 결과·PR 초과·인젝션)만.
- **`evals.json`은 안 건드림** — skill-creator 스키마상 신규 테스트는 case 폴더로 쓰고 레거시 json은 보존이 지침.

## 재사용 규칙

graceful degradation을 넣을 땐 **"없음(exit 0, 0건)"과 "못 가져옴(미설치/인증/실패)"을 종료코드 + 첫 줄 접두어 계약으로 반드시 분리하라** — 조용한 빈 결과는 틀린 걸 믿게 만드는 최악의 실패다. 그리고 **인증이 필요한 수집 경로는 내가 소유하지 않은 공개 레포(예: `cli/cli`)로 라이브 스모크하라** — 한 번에 JSON Lines 포맷·기본 브랜치 탐지(cli/cli는 `trunk`!)·group_by 로직이 다 검증된다. 마지막으로 **fixture 파일 20개 이상을 깔 땐 shell 히어독 말고 Python으로 스캐폴딩하라** — 한글·따옴표·백틱·`$`가 섞이면 `bash -c` 히어독은 따옴표 불균형으로 깨진다.

관련: [[skill-graceful-degradation-per-source]] · [[cli-dependent-skill-demo-mode]]
