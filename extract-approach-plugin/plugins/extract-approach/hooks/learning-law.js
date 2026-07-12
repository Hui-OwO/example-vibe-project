#!/usr/bin/env node
/**
 * Learning Law — Stop hook
 *
 * "after every non-trivial solved problem, run the extract-approach skill
 *  before moving on. a solution without its learnings note is unfinished work."
 *
 * 세션이 끝나려 할 때 판정한다:
 *   비자명한 작업의 흔적(파일 편집 + 실패→재시도 신호)이 있는데
 *   learnings/ 노트를 쓰지 않았다면 → 딱 1회 block해서 노트 작성을 리마인드.
 *
 * 과차단 방지 설계:
 *   - stop_hook_active(이미 한 번 block됨)면 무조건 통과 → 무한 루프 없음.
 *     리마인드를 받고도 "자명한 작업이었다"고 판단해 그대로 멈추는 것도 허용된다.
 *   - 편집이 적거나(질문/조회 세션) 실패 신호가 없으면(한 번에 성공) 통과.
 *   - 이번 세션 transcript에 learnings/ 경로로의 Write가 있으면 통과.
 *
 * 입력: stdin으로 Stop 훅 JSON { transcript_path, stop_hook_active, ... }
 * 출력: 통과 시 exit 0 (무출력), 리마인드 시 {"decision":"block","reason":...}
 */

const fs = require("node:fs");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function pass() {
  process.exit(0);
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}

function countMatches(text, re) {
  return text.match(re)?.length ?? 0;
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    pass();
  }

  // 이미 이 훅이 한 번 block한 뒤의 재정지 → 통과 (1회 리마인드 원칙)
  if (input.stop_hook_active) pass();

  const transcriptPath = input.transcript_path;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) pass();

  let t;
  try {
    t = fs.readFileSync(transcriptPath, "utf8");
  } catch {
    pass();
  }

  // ① learnings 노트를 이미 썼나 — Write/Edit의 file_path에 learnings/ 포함
  //    (JSONL 이스케이프 \\ 와 / 둘 다 매칭)
  const noteWritten = /"file_path"\s*:\s*"[^"]*learnings[\\/]/i.test(t);
  if (noteWritten) pass();

  // ② 실제 작업이 있었나 — 파일 편집 도구 사용 횟수
  const edits =
    countMatches(t, /"name"\s*:\s*"Edit"/g) +
    countMatches(t, /"name"\s*:\s*"Write"/g) +
    countMatches(t, /"name"\s*:\s*"NotebookEdit"/g);

  // ③ 시행착오가 있었나 — 도구 에러 또는 테스트/빌드 실패 신호
  const struggles =
    countMatches(t, /"is_error"\s*:\s*true/g) +
    countMatches(t, /\b(FAIL|failed|AssertionError|Exit code [1-9])\b/g);

  // 비자명 판정: 편집 2회 이상 + 실패 신호 1회 이상일 때만 리마인드.
  // (조회만 한 세션, 오타 수정, 한 번에 성공한 작업은 여기서 걸러진다)
  if (edits >= 2 && struggles >= 1) {
    block(
      "learning law: 이 세션에는 시행착오의 흔적(편집 " +
        edits +
        "회, 실패 신호 " +
        struggles +
        "회)이 있는데 learnings/ 노트가 없습니다. " +
        "비자명한 문제를 해결했다면 extract-approach 스킬로 learnings/<date>-<slug>.md 노트를 " +
        "작성한 뒤 종료하세요 (problem 한 줄 / approach / judgment calls / reusable rule). " +
        "실제로는 자명한 작업뿐이었다면 그 판단을 한 줄로 밝히고 그대로 종료해도 됩니다 — " +
        "이 리마인드는 세션당 1회만 발동합니다.",
    );
  }

  pass();
}

main();
