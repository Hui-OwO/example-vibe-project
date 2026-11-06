# summarize-pr-diff 플러그인

`.claude/skills/summarize-pr-diff` 스킬을 플러그인으로 패키징한 것입니다. PR diff를 읽고 리뷰어가 빠르게 파악할 수 있도록 한국어로 간결하게 요약합니다.

## 구조

```
summarize-pr-diff-plugin/
  .claude-plugin/
    marketplace.json              # 로컬 마켓플레이스 정의 (플러그인 1개 등록)
  plugins/
    summarize-pr-diff/
      .claude-plugin/
        plugin.json               # 플러그인 매니페스트
      skills/
        summarize-pr-diff/
          SKILL.md                # 스킬 본문
          evals/evals.json        # 트리거/동작 평가 케이스
```

## 의존성

PR 번호·URL로 요약할 때는 `gh`(인증)가 필요합니다. 로컬 브랜치 diff는 `git`만으로 동작합니다.

## 설치

Claude Code에서 로컬 경로를 마켓플레이스로 추가한 뒤 설치합니다.

```bash
# 1) 마켓플레이스 등록 (이 디렉터리의 경로)
/plugin marketplace add ./summarize-pr-diff-plugin

# 2) 플러그인 설치
/plugin install summarize-pr-diff@summarize-pr-diff-marketplace
```

설치 후 `/plugin` 메뉴에서 활성화 여부를 확인할 수 있습니다.
