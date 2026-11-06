# 자작 스킬을 플러그인으로 이관해 WSL에서도 쓰기

## 문제 (한 줄)

Windows에서 만든 스킬이 WSL의 Claude에서 안 보인다 — 플러그인으로 만들었다고 생각했지만 실제로는 `~/.claude/skills`에 수동 복사된 사본이었다.

## 접근

1. **실제 로딩 경로부터 확인.** 스킬 목록에서 `plugin:` 접두사가 없으면 플러그인이 아니라 skills 폴더에서 읽힌 것이다. `~/.claude/skills`, `~/.claude/agents`, 레포 `.claude/skills`를 레포의 `*-plugin/`과 `diff -r`로 대조했다.
2. **WSL이 못 보는 이유를 구분.** WSL은 Linux 쪽 `~/.claude`를 따로 쓴다. 게다가 `main`이 push되지 않아 GitHub clone에도 플러그인이 없었다. 원인이 둘이었다.
3. **전수 조사.** `claude plugin list`(출력을 잘라 보지 말 것), `known_marketplaces.json`, `settings.json`의 `enabledPlugins`, 각 skills 폴더를 대조해 플러그인으로 등록된 것과 아닌 것을 표로 정리했다.
4. **이관.** 기존 플러그인과 같은 구조(`<name>-plugin/.claude-plugin/marketplace.json` + `plugins/<name>/{.claude-plugin/plugin.json, skills/<name>/}` + README)로 만들고 `claude plugin validate`로 검증했다.
5. **설치 → 사본 정리 → 커밋·push.** `claude plugin marketplace add <Windows 경로>` 다음에 `claude plugin install <n>@<n>-marketplace --scope user`. 사본은 `diff -r`로 동일한지 확인한 뒤 삭제하지 않고 scratchpad로 옮겼다.

## 판단 (일부러 하지 않은 것과 그 이유)

- **사본을 바로 삭제하지 않음.** 플러그인 설치가 성공한 것을 확인한 뒤에 백업 폴더로 옮겼다. 순서를 반대로 하면 그 사이에 스킬이 사라진다.
- **user 스킬은 복사(`cp`), 레포 스킬은 이동(`git mv`).** 레포 `.claude/skills`에 남겨 두면 그 프로젝트에서 프로젝트 스킬과 플러그인 스킬이 중복으로 잡힌다. `git mv`를 쓰면 이력도 유지된다.
- **`.gitattributes`에 `*.sh text eol=lf` 추가.** `autocrlf=true`인 Windows 체크아웃에서는 bash 스크립트가 CRLF가 되어 WSL에서 깨진다. WSL에서 쓰려는 목적 자체를 지키기 위한 최소한의 범위 확장이다.
- **관계없는 미커밋 변경은 커밋하지 않음.** 같은 플러그인 안의 `SKILL.md` 수정이라도 사용자가 요청한 범위가 아니다.
- **GitHub 원격 마켓플레이스로 바꾸지 않음.** marketplace.json이 레포 루트가 아니라 하위 폴더에 있다. 로컬 경로(`/mnt/c/...`)로 등록하는 편이 확실하다.

## 재사용 규칙 (한 줄)

"스킬이 다른 환경에 없다"는 말을 들으면 먼저 그 스킬이 **어디서 로딩되는지**(`plugin:` 접두사 여부와 실제 폴더)를 확인하라. 환경을 넘나들어야 하는 스킬은 레포에 커밋한 플러그인으로만 배포하고, 셸 스크립트는 LF로 고정하라.

## 덤: 셸 함정

bash에서 `"C:\\...\\$n-plugin"`처럼 쓰면 `\\$`가 `$`를 escape해서 변수가 확장되지 않는다. Windows 경로가 필요하면 `cygpath -w "$PWD/$n-plugin"`를 써라.
