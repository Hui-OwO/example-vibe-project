# extract-approach-plugin

> learning law: after every non-trivial solved problem, run the extract-approach skill
> before moving on. a solution without its learnings note is unfinished work.

비자명한 문제를 해결한 뒤 그 접근법을 `learnings/<date>-<slug>.md` 학습 노트로 추출하는
스킬과, 노트 없이 세션을 끝내려 하면 1회 리마인드하는 Stop 훅을 담은 플러그인.

## 구성

| 파일 | 역할 |
|------|------|
| `plugins/extract-approach/skills/extract-approach/SKILL.md` | 노트 형식 정의: problem 한 줄 / approach 분해 단계 / judgment calls(일부러 안 한 것과 이유) / reusable rule. 한 페이지 이내, 약한 모델이 처음 읽어도 따라올 수 있게 |
| `plugins/extract-approach/hooks/learning-law.js` | Stop 훅 — transcript에서 편집 ≥2회 + 실패 신호(is_error/FAIL/AssertionError 등) ≥1회인데 learnings/ Write가 없으면 1회 block해 리마인드 |
| `plugins/extract-approach/hooks/hooks.json` | Stop 이벤트에 훅 등록 |

## 과차단 방지 설계

- `stop_hook_active`면 무조건 통과 → 리마인드는 세션당 1회, 무한 루프 없음
- "자명한 작업이었다"고 한 줄로 밝히고 그대로 종료하는 것도 허용
- 조회만 한 세션(편집 <2), 한 번에 성공한 작업(실패 신호 0)은 발동하지 않음

## 설치 (로컬 마켓플레이스)

`~/.claude/settings.json`:

```json
"extraKnownMarketplaces": {
  "extract-approach-marketplace": {
    "source": { "source": "directory", "path": "<이 폴더 절대경로>" }
  }
},
"enabledPlugins": { "extract-approach@extract-approach-marketplace": true }
```

훅은 강제 백업이고, 1차 방아쇠는 글로벌 `~/.claude/CLAUDE.md`의 learning law 지시다
(플러그인은 상시 컨텍스트를 주입할 수 없으므로 law 문구 자체는 CLAUDE.md에 산다).

## 훅 수동 테스트

```bash
echo '{"stop_hook_active":false,"transcript_path":"<jsonl 경로>"}' \
  | node plugins/extract-approach/hooks/learning-law.js
# 무출력 = 통과, {"decision":"block",...} = 리마인드
```
