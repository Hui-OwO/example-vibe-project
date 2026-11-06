# run-changed-tests 플러그인

`.claude/skills/run-changed-tests` 스킬을 플러그인으로 패키징한 것입니다. 변경된 파일과 연관된 테스트만 골라 실행하며, Vitest·Jest·pytest 러너를 자동 감지합니다.

## 구조

```
run-changed-tests-plugin/
  .claude-plugin/
    marketplace.json              # 로컬 마켓플레이스 정의 (플러그인 1개 등록)
  plugins/
    run-changed-tests/
      .claude-plugin/
        plugin.json               # 플러그인 매니페스트
      skills/
        run-changed-tests/
          SKILL.md                # 스킬 본문
          scripts/
            changed_tests.py      # 변경 파일 → 연관 테스트 매핑
          evals/evals.json        # 트리거/동작 평가 케이스
```

## 의존성

`git`과 `python`(3.x)이 필요합니다.

## 설치

Claude Code에서 로컬 경로를 마켓플레이스로 추가한 뒤 설치합니다.

```bash
# 1) 마켓플레이스 등록 (이 디렉터리의 경로)
/plugin marketplace add ./run-changed-tests-plugin

# 2) 플러그인 설치
/plugin install run-changed-tests@run-changed-tests-marketplace
```

설치 후 `/plugin` 메뉴에서 활성화 여부를 확인할 수 있습니다.
