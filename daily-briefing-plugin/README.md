# daily-briefing 플러그인

`~/.claude/skills/daily-briefing` 스킬을 플러그인으로 패키징한 것입니다. 캘린더 일정, 내 GitHub PR(리뷰 대기·내가 연 PR·최근 머지), 기본 브랜치 CI 상태를 모아 🔴 꼭 해야 할 일 / 🟡 오늘 중 / 🟢 나중에 로 분류한 콘솔 마크다운 브리핑을 만듭니다.

## 구조

```
daily-briefing-plugin/
  .claude-plugin/
    marketplace.json              # 로컬 마켓플레이스 정의 (플러그인 1개 등록)
  plugins/
    daily-briefing/
      .claude-plugin/
        plugin.json               # 플러그인 매니페스트
      skills/
        daily-briefing/
          SKILL.md                # 스킬 본문
          scripts/                # 수집 스크립트(bash) + 데모용 fixtures/
          evals/                  # claude plugin eval 케이스
```

## 의존성

`gh`(인증)·`gcalcli`(인증) CLI를 사용합니다. 일부만 있으면 가능한 소스만 수집하고,
둘 다 없거나 데모만 보려면 `BRIEFING_DEMO=1`로 번들 샘플 데이터를 씁니다.

## 설치

Claude Code에서 로컬 경로를 마켓플레이스로 추가한 뒤 설치합니다.

```bash
# 1) 마켓플레이스 등록 (이 디렉터리의 경로)
/plugin marketplace add ./daily-briefing-plugin

# 2) 플러그인 설치
/plugin install daily-briefing@daily-briefing-marketplace
```

설치 후 `/plugin` 메뉴에서 활성화 여부를 확인할 수 있습니다.
