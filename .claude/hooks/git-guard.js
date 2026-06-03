#!/usr/bin/env node
/**
 * Git Guard — PreToolUse hook (matcher: Bash)
 *
 * Bash 로 실행하려는 명령에서 "되돌리기 어렵거나 히스토리/원격을 파괴하는"
 * 위험한 git 작업을 탐지해 차단하고, 안전한 대안을 안내한다.
 *
 * 차단 대상(기본):
 *   - git push --force / -f            (강제 푸시 → 원격 히스토리 덮어쓰기)
 *   - git push ... --delete / :branch  (원격 브랜치 삭제)
 *   - git reset --hard                 (워킹트리/인덱스 변경분 소실)
 *   - git clean -f / -fd / -fdx        (추적되지 않은 파일 영구 삭제)
 *   - git checkout/restore -- .        (로컬 변경 일괄 폐기)
 *   - git branch -D                    (머지 안 된 브랜치 강제 삭제)
 *   - git filter-branch                (히스토리 전면 재작성)
 *   - git reflog expire --all          (복구 안전망 제거)
 *   - rm -rf .git                      (저장소 자체 파괴)
 *
 * 통과:
 *   - git 이 아닌 명령
 *   - git push --force-with-lease      (안전한 강제 푸시는 허용)
 *   - 그 외 위험 패턴에 해당하지 않는 git 명령
 *
 * 입력: stdin 으로 PreToolUse 훅 JSON
 * 출력: 통과 시 exit 0(무출력), 차단 시 permissionDecision="deny" JSON
 */

const fs = require("node:fs");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/** 통과(허용)하고 종료 */
function pass() {
  process.exit(0);
}

/** 차단 — Claude 에게 사유를 전달 */
function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

/**
 * 위험 규칙 목록. test(cmd) 가 true 면 차단하고 hint 를 안내한다.
 * cmd 는 정규화된(공백 1칸) 명령 문자열.
 */
const RULES = [
  {
    id: "force-push",
    // --force / -f 강제 푸시. 단, --force-with-lease 는 제외.
    test: (c) =>
      /\bgit\s+push\b/.test(c) &&
      /(--force(?!-with-lease)\b|(?:^|\s)-[a-z]*f[a-z]*\b)/.test(c) &&
      !/--force-with-lease\b/.test(c),
    label: "git push --force (강제 푸시)",
    hint: "원격 히스토리를 덮어씁니다. 꼭 필요하면 --force-with-lease 를 사용하세요.",
  },
  {
    id: "delete-remote-branch",
    test: (c) =>
      /\bgit\s+push\b/.test(c) &&
      (/--delete\b/.test(c) || /\bpush\s+\S+\s+:/.test(c)),
    label: "git push --delete (원격 브랜치 삭제)",
    hint: "원격 브랜치가 삭제됩니다. 정말 필요한지 확인 후 직접 실행하세요.",
  },
  {
    id: "reset-hard",
    test: (c) => /\bgit\s+reset\b[^|;&]*--hard\b/.test(c),
    label: "git reset --hard (변경분 소실)",
    hint: "커밋되지 않은 변경이 모두 사라집니다. 'git stash' 로 백업하는 편이 안전합니다.",
  },
  {
    id: "clean-force",
    test: (c) => /\bgit\s+clean\b[^|;&]*-[a-z]*f/.test(c),
    label: "git clean -f (추적되지 않은 파일 영구 삭제)",
    hint: "먼저 'git clean -n' 으로 삭제 대상을 미리 확인하세요.",
  },
  {
    id: "checkout-discard-all",
    test: (c) =>
      /\bgit\s+(checkout|restore)\b[^|;&]*\s(--\s+)?\.(?:\s|$)/.test(c) &&
      /(--\s+\.|checkout\s+\.|restore\s+\.)/.test(c),
    label: "git checkout/restore -- . (로컬 변경 일괄 폐기)",
    hint: "디렉터리 전체의 변경이 폐기됩니다. 파일을 개별 지정하거나 'git stash' 를 쓰세요.",
  },
  {
    id: "branch-force-delete",
    test: (c) => /\bgit\s+branch\b[^|;&]*\s-D\b/.test(c),
    label: "git branch -D (머지 안 된 브랜치 강제 삭제)",
    hint: "머지되지 않은 작업이 사라질 수 있습니다. 안전하게는 'git branch -d' 를 사용하세요.",
  },
  {
    id: "filter-branch",
    test: (c) => /\bgit\s+filter-branch\b/.test(c),
    label: "git filter-branch (히스토리 전면 재작성)",
    hint: "전체 히스토리를 재작성합니다. git-filter-repo 등으로 신중히 진행하세요.",
  },
  {
    id: "reflog-expire",
    test: (c) => /\bgit\s+reflog\s+expire\b[^|;&]*--all\b/.test(c),
    label: "git reflog expire --all (복구 안전망 제거)",
    hint: "reflog 가 비워지면 잘못된 작업을 되돌리기 어려워집니다.",
  },
  {
    id: "remove-git-dir",
    test: (c) =>
      /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b[^|;&]*\.git\b/.test(c),
    label: "rm -rf .git (저장소 파괴)",
    hint: ".git 디렉터리가 삭제되면 모든 버전 기록이 사라집니다.",
  },
];

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    pass();
  }

  if ((payload.tool_name || "") !== "Bash") pass();

  const raw = (payload.tool_input && payload.tool_input.command) || "";
  if (!raw) pass();

  // 줄바꿈/연속 공백을 1칸으로 정규화해 패턴 매칭 안정화
  const cmd = raw.replace(/\s+/g, " ").trim();

  for (const rule of RULES) {
    if (rule.test(cmd)) {
      deny(
        [
          `🛑 위험한 Git 명령 차단: ${rule.label}`,
          ``,
          `명령: ${raw.trim()}`,
          ``,
          rule.hint,
          ``,
          `정말 실행해야 한다면 사용자가 직접 터미널에서 실행하도록 안내하세요.`,
        ].join("\n"),
      );
    }
  }

  pass();
}

main();
