# Git Bash의 /tmp 경로는 Windows Node에 보이지 않는다

## the problem, in one line

Stop 훅(learning-law.js) 테스트에서 block이 나와야 할 시나리오가 조용히 통과했다 —
훅 버그가 아니라 `mktemp -d`가 준 `/tmp/...` 경로를 Windows Node의 `fs.existsSync`가
찾지 못해 방어적 pass()로 빠진 것.

## the approach

1. 4개 시나리오(block/통과/재정지/조회만)를 stdin JSON으로 넣어 훅을 직접 실행 → A가 무출력.
2. 훅 로직(정규식 카운트)을 의심하기 전에, 실패 지점을 이분: "판정이 틀렸나 vs 판정에
   도달하지 못했나". 훅에 방어적 pass()가 여럿 있으므로 후자 먼저 확인.
3. `transcript_path`가 `/tmp/xxx` — MSYS(Git Bash) 가상 경로. Windows 바이너리인 Node는
   이걸 실제 경로(C:\Users\...\AppData\Local\Temp\...)로 해석하지 못함 → existsSync false → pass.
4. `cygpath -m "$SCRATCH"`로 Windows 스타일(C:/...) 경로로 변환해 재실행 → 4/4 기대대로.

## the judgment calls

- **훅에서 경로 정규화를 하지 않았다**: 실전에서 Claude Code가 넘기는 transcript_path는
  이미 Windows 네이티브 경로다. 테스트 환경의 문제를 프로덕션 코드로 보상하면 안 된다.
- **방어적 pass()를 없애지 않았다**: 훅이 이상 상황에서 조용히 통과하는 것은 의도된 설계다
  (훅 오류로 사용자의 정상 종료를 막는 것이 더 나쁨). 대신 테스트 쪽을 고쳤다.

## the reusable rule

Git Bash에서 Windows 네이티브 실행파일(node, python 등)에 경로를 넘길 때는
`cygpath -m`으로 변환하라 — `/tmp`·`/c/...` 같은 MSYS 가상 경로는 그들에게 존재하지 않는다.
그리고 "조용히 통과"가 기본값인 코드를 테스트할 때는 로직보다 먼저 도달 여부를 의심하라.
