# write-unit-tests 플러그인

기존 `.claude/skills/write-unit-tests` 스킬을 플러그인으로 패키징한 것입니다.
Next.js + TypeScript(Vitest) 프로젝트에서 기존 테스트 컨벤션을 그대로 따르는 유닛
테스트를 작성하고, `npm test`로 실행해 통과까지 확인합니다.

## 구조

```
unit-test-writer-plugin/
  .claude-plugin/
    marketplace.json          # 로컬 마켓플레이스 정의 (플러그인 1개 등록)
  plugins/
    write-unit-tests/
      .claude-plugin/
        plugin.json           # 플러그인 매니페스트
      skills/
        write-unit-tests/
          SKILL.md            # 스킬 본문
          references/         # 유형별 패턴 (lib / react / api / mocking)
```

## 설치

Claude Code에서 로컬 경로를 마켓플레이스로 추가한 뒤 설치합니다.

```bash
# 1) 마켓플레이스 등록 (이 디렉터리의 절대 경로)
/plugin marketplace add ./unit-test-writer-plugin

# 2) 플러그인 설치
/plugin install write-unit-tests@unit-test-writer-marketplace
```

설치 후 `/plugin` 메뉴에서 활성화 여부를 확인할 수 있습니다. 스킬은 사용자가
테스트 작성을 요청하는 맥락에서 자동으로 트리거됩니다.

## 비고

- 스킬 개발용 `evals/` 디렉터리는 배포 패키지에서 제외했습니다. 원본은
  `.claude/skills/write-unit-tests/evals/`에 그대로 남아 있습니다.
