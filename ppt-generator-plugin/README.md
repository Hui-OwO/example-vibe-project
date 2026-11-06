# ppt-generator 플러그인

`.claude/skills/ppt-generator` 스킬을 플러그인으로 패키징한 것입니다. 발표용
PPT(.pptx) 슬라이드를 처음부터 설계·작성합니다. 주제·청중·발표 시간·톤을 먼저
확인하고 목차를 설계한 뒤, 각 슬라이드의 제목·핵심 메시지·본문·발표자 노트를
작성하고 번들 스크립트로 .pptx 파일까지 출력합니다.

## 구조

```
ppt-generator-plugin/
  .claude-plugin/
    marketplace.json              # 로컬 마켓플레이스 정의 (플러그인 1개 등록)
  plugins/
    ppt-generator/
      .claude-plugin/
        plugin.json               # 플러그인 매니페스트
      skills/
        ppt-generator/
          SKILL.md                # 스킬 본문
          scripts/
            build_pptx.py         # JSON → .pptx 결정적 변환기 (python-pptx)
            sample_deck.json      # 입력 형식 예시
```

## 의존성

`.pptx` 생성은 `python-pptx`를 사용합니다. 설치되어 있지 않으면 `build_pptx.py`가
실행 시 자동으로 `pip install python-pptx`를 시도합니다. 설치가 막힌 환경이면
수동으로 설치하세요.

```bash
pip install python-pptx
```

## 설치

Claude Code에서 로컬 경로를 마켓플레이스로 추가한 뒤 설치합니다.

```bash
# 1) 마켓플레이스 등록 (이 디렉터리의 경로)
/plugin marketplace add ./ppt-generator-plugin

# 2) 플러그인 설치
/plugin install ppt-generator@ppt-generator-marketplace
```

설치 후 `/plugin` 메뉴에서 활성화 여부를 확인할 수 있습니다. 스킬은 사용자가
"PPT 만들어줘", "발표자료 작성해줘", "슬라이드 만들어줘" 같은 맥락에서 자동으로
트리거됩니다.

## 비고

- 스킬 개발용 평가 산출물은 `.claude/skills/ppt-generator-workspace/`에 보관하며,
  `.gitignore`의 `.claude/skills/*-workspace/` 규칙으로 Git에는 포함되지 않습니다.
