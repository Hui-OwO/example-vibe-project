---
name: run-changed-tests
description: >
  변경된 파일과 연관된 테스트만 골라서 실행합니다. 사용자가 "방금 바꾼 거 테스트
  돌려줘", "변경된 것만 테스트", "내가 수정한 부분 관련 테스트만", "영향받는 테스트
  돌려봐", "PR 올리기 전에 관련 테스트 확인", "전체 말고 바뀐 것만 돌려" 같이 *전체
  스위트가 아니라 변경분에 한정해* 테스트를 실행해달라는 맥락이면 명시적으로 "연관
  테스트"라고 말하지 않아도 반드시 이 스킬을 사용하세요. Vitest·Jest·pytest 프로젝트
  모두에서 동작하며 러너를 자동 감지합니다. 단, 테스트를 새로 작성/보완해달라는 요청
  (→ 유닛 테스트 작성 스킬)이나, 명시적으로 전체 테스트를 다 돌려달라는 요청
  (예: "npm test 전부 돌려줘")은 이 스킬의 범위가 아닙니다.
---

# 변경분 연관 테스트만 실행하기

목표는 **전체 스위트를 돌리는 낭비 없이**, 사용자가 방금 건드린 코드가 깨뜨릴 수 있는
테스트만 빠르게 돌려 피드백을 주는 것이다. 핵심 어려움은 두 가지다: (1) "변경된 파일"을
정확히 집어내는 것과 (2) 그 파일에 _연관된_ 테스트를 찾는 것. 두 작업 모두 러너마다,
상황마다 미묘하게 다르므로 번들된 스크립트가 결정적인 부분을 대신 처리한다.

## 워크플로

### 1. 헬퍼 스크립트로 변경분과 실행 명령을 파악한다

먼저 이 스크립트를 실행한다 (저장소 루트가 아니어도 알아서 루트를 찾는다):

```bash
python "<이 스킬 경로>/scripts/changed_tests.py"
```

> Python이 없으면 `python3`로 재시도하고, 그래도 없으면 아래 "스크립트 없이" 절을 따른다.

스크립트는 다음을 출력한다:

- `RUNNER` — 감지된 러너 (`vitest` / `jest` / `pytest` / `unknown`)
- `CHANGE_MODE` — 무엇을 기준으로 변경을 봤는지. **자동 판단**이다: 워킹 트리(아직
  커밋 안 한 staged+unstaged+untracked)에 변경이 있으면 그걸, 없으면 베이스 브랜치
  (upstream → `origin/main` → `main` …) 대비 diff를 본다.
- `CHANGED FILES` / `CHANGED TEST FILES` — 변경된 파일과 그중 테스트 파일
- `RELATED_STATUS` — `delegated`(러너가 import 그래프로 판단) / `found`(이름 규칙으로
  찾음) / `none`(연관 테스트 후보 없음)
- `SUGGESTED_COMMAND` — 바로 실행할 명령

기준을 사용자가 지정했다면(예: "main 대비", "지금 작업 중인 것만") 플래그를 준다:
`--base origin/main` 또는 `--working-tree`.

### 2. RELATED_STATUS에 따라 행동한다

- **`delegated` 또는 `found`** → `SUGGESTED_COMMAND`를 실행한다. 이게 정상 경로다.
  - Vitest는 `vitest related <files>`로 _그 소스를 import하는_ 테스트만 돌린다.
    alias(`@/...`)나 재export도 import 그래프로 정확히 추적하니 직접 파일을 매핑하려
    들지 마라.
  - Jest는 `jest --findRelatedTests <files>`가 같은 역할을 한다.
  - pytest는 내장 연관 탐색이 없어, 스크립트가 `test_<name>.py` / `<name>_test.py`
    이름 규칙으로 후보를 찾는다.

  **중요 — `delegated`의 0건 처리:** vitest/jest는 실제로 돌려봐야 연관 테스트가
  몇 개인지 안다. 명령 출력이 `No test files found`(vitest)거나 매칭 0건이면, 변경된
  소스에 테스트가 없다는 뜻이다. 이때 _전체 스위트로 폴백하지 말고_ 아래 `none`과
  **똑같이** 사용자에게 확인을 요청하라. "0개 통과"라고만 보고하고 끝내지도 마라 —
  사용자는 "관련 테스트를 돌렸다"고 오해할 수 있다.

- **`none`** (연관 테스트를 못 찾음) → **전체 스위트를 마음대로 돌리지 마라.** 사용자가
  원한 건 "변경분만"이다. 대신 상황을 알리고 어떻게 할지 물어라. 예:

  > "변경된 `lib/foo.ts`에 연결된 테스트를 찾지 못했어요. (a) 전체 테스트를 돌릴까요,
  > (b) 특정 테스트 파일을 지정해 주시겠어요, 아니면 (c) 새 테스트를 작성할까요?"

  연관 테스트가 없다는 것 자체가 "이 코드엔 테스트가 없다"는 유용한 신호이므로 그대로
  전달하라.

### 3. 결과를 간결히 보고한다

어떤 기준(`CHANGE_MODE`)으로 어떤 테스트를 돌렸는지 한 줄로 밝히고, 결과(통과/실패)를
요약한다. 실패가 있으면 실패한 테스트와 원인을 짚되, 변경분과의 연관성을 함께 설명하면
사용자가 회귀인지 바로 판단할 수 있다.

## Vitest 빠른 참고 (이 프로젝트)

이 저장소는 Vitest 3 + `@/` alias(루트 기준)를 쓴다. 변경된 소스가 `lib/concepts.ts`라면
`npx vitest related --run lib/concepts.ts`로 `@/lib/concepts`를 import하는 테스트가 자동으로
잡힌다. `--run`은 watch 모드로 빠지지 않고 1회 실행 후 종료하게 한다.

연관 테스트가 _기대보다 훨씬 많이_ 잡히면(예: 한 파일을 고쳤는데 수십 개 실행), vitest가
git과 무관하게 디스크 전체에서 `*.test.ts`를 스캔하다 빌드 산출물·worktree·백업 같은 잔재
디렉터리의 중복 테스트까지 끌어온 것이다. `--exclude '**/<해당 디렉터리>/**'`로 임시 차단하고,
근본적으로는 프로젝트 `vitest.config`의 `test.exclude`를 손보라고 알려라.

## 스크립트 없이 (Python 부재 시 폴백)

1. 변경 파일: 워킹 트리에 변경이 있으면 `git status --porcelain`, 없으면
   `git diff --name-only $(git merge-base HEAD origin/main)`.
2. 러너: `package.json`에 vitest/jest 의존성이 있으면 그걸, `pytest.ini`/`conftest.py`/
   `pyproject.toml`의 pytest 신호가 있으면 pytest.
3. 실행:
   - vitest: `npx vitest related --run <변경 파일들>`
   - jest: `npx jest --findRelatedTests <변경 파일들>`
   - pytest: 변경된 `test_*.py`는 직접, 변경된 소스는 `test_<name>.py`로 매핑해 실행
4. 연관 테스트를 못 찾으면 전체를 돌리지 말고 2단계처럼 사용자에게 물어라.
