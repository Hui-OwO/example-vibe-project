# commit-message 플러그인

기존 `~/.claude/skills/commit-message` 스킬을 플러그인으로 패키징한 것입니다.
스테이징된 변경을 분석해 Conventional Commits 제목(영어)과, 필요할 때만 한국어
본문을 붙인 고품질 커밋 메시지를 작성하고 커밋까지 생성합니다.

## 구조

```
commit-message-plugin/
  .claude-plugin/
    marketplace.json          # 로컬 마켓플레이스 정의 (플러그인 1개 등록)
  plugins/
    commit-message/
      .claude-plugin/
        plugin.json           # 플러그인 매니페스트
      skills/
        commit-message/
          SKILL.md            # 스킬 본문
```

## 설치

Claude Code에서 로컬 경로를 마켓플레이스로 추가한 뒤 설치합니다.

```bash
# 1) 마켓플레이스 등록 (이 디렉터리의 절대 경로)
/plugin marketplace add ./commit-message-plugin

# 2) 플러그인 설치
/plugin install commit-message@commit-message-marketplace
```

설치 후 `/plugin` 메뉴에서 활성화 여부를 확인할 수 있습니다. 스킬은 사용자가
"커밋해줘", "커밋 메시지 써줘" 같은 맥락에서 자동으로 트리거됩니다.

## 비고

- 스킬 개발용 `evals/` 디렉터리는 배포 패키지에서 제외했습니다. 원본은
  `~/.claude/skills/commit-message/evals/`에 그대로 남아 있습니다.
