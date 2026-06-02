#!/usr/bin/env node
/**
 * TDD Guard — PreToolUse hook (combined)
 *
 * 테스트가 없는 소스 파일에 "새 함수/모듈"을 추가하려 하면 차단하고,
 * 어떤 테스트 파일을 먼저 만들어야 하는지 안내한다.
 *
 * 두 구현(tdd-guard.js / tdd-guard.sh)의 장점을 합쳤다:
 *   - (.js) "새 export 추가 시에만" 차단 → 리팩터링·버그픽스는 통과 (과차단 최소화)
 *   - (.js) tests/ 루트까지 재귀 탐색 → 위치 무관하게 테스트 인식
 *   - (.sh) Codex apply_patch 의 다중 파일 변경 파싱 (command 필드)
 *   - (.sh) delete 액션은 무시 → 파일 삭제는 검사 없이 통과
 *   - 크로스플랫폼: Node 단독 (bash/python/git/sed 불필요)
 *
 * 차단하지 않는 경우(통과):
 *   - 대상 소스 파일이 아님 (테스트/타입선언/설정/페이지 등)
 *   - 변경 액션이 파일 삭제(delete)
 *   - 대응하는 테스트 파일이 이미 존재
 *   - 새 export(함수/클래스/화살표함수)를 추가하지 않는 변경 (리팩터링·버그픽스 등)
 *
 * 입력: stdin 으로 PreToolUse 훅 JSON
 * 출력: 통과 시 exit 0 (무출력), 차단 시 permissionDecision="deny" JSON
 */

const fs = require("node:fs");
const path = require("node:path");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/** 통과(허용)하고 종료 — PreToolUse 는 무출력 + exit 0 이면 그대로 진행 */
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

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

/** 이 파일에 TDD 를 강제할지 판단 */
function isGuardedSource(relPath) {
  const p = toPosix(relPath);
  // 테스트·타입선언·설정·next 내부 파일은 대상 아님
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(p)) return false;
  if (/\.d\.ts$/.test(p)) return false;
  if (/(^|\/)(node_modules|\.next|tests?|__tests__)\//.test(p)) return false;
  // Next.js 페이지/레이아웃 류는 유닛테스트 대상에서 제외(노이즈 방지)
  if (
    /(^|\/)(page|layout|loading|error|not-found|template|default)\.(tsx?|jsx?)$/.test(
      p,
    )
  ) {
    return false;
  }
  if (/\.config\.(ts|js|mjs|cts|mts)$/.test(p)) return false;
  // 비즈니스 로직 / 컴포넌트 / API 라우트만 강제
  return /^(lib|components|app)\/.*\.(ts|tsx)$/.test(p);
}

/** 추가되는 텍스트에 새 export(함수/클래스/화살표함수)가 있는지 */
function addsNewExport(text) {
  if (!text) return false;
  const patterns = [
    /export\s+(default\s+)?(async\s+)?function\b/, // export function / export default function
    /export\s+class\b/, // export class
    // export const fn = (..) => / async (..) => / x => / function(){}
    //   - (:.*?)?  : 선택적 타입 어노테이션. `: () => void` 처럼 =>를 포함해도 됨(.*? 비탐욕 + 백트래킹)
    //   - =(?!>)   : 화살표(=>)가 아닌 "대입 =" 만 매칭
    //   - 우변이 함수일 때만 매칭 → 함수가 아닌 상수(export const x = 5)·객체·호출결과는 통과
    /export\s+const\s+\w+\s*(:.*?)?=(?!>)\s*(async\s*)?(\(|function\b|\w+\s*=>)/,
  ];
  return patterns.some((re) => re.test(text));
}

/** relPath 의 basename 에 대응하는 테스트 파일이 프로젝트에 존재하는지 */
function hasTestFile(cwd, relPath) {
  const base = path.basename(relPath).replace(/\.(ts|tsx|js|jsx)$/, "");
  const wanted = new Set([
    `${base}.test.ts`,
    `${base}.test.tsx`,
    `${base}.spec.ts`,
    `${base}.spec.tsx`,
  ]);
  const roots = ["tests", "test", "lib", "components", "app", "src"]
    .map((d) => path.join(cwd, d))
    .filter((d) => fs.existsSync(d));

  const stack = [...roots];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (wanted.has(e.name)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 변경 대상 목록을 수집한다.
 * @returns {{action: "update"|"delete", filePath: string, text: string}[]}
 *
 * - Write/Edit/MultiEdit: 단일 file_path + 변경 텍스트
 * - apply_patch(command): 다중 파일. 패치 본문의 `+` 라인을 추가 텍스트로 추출.
 *   `*** Add/Update/Delete File:` 헤더와 `*** Move to:` 를 인식한다.
 */
function collectTargets(toolName, input) {
  const targets = [];

  // 1) 표준 도구: file_path 기반
  const directPath = input.file_path || input.path || input.filename;
  if (typeof directPath === "string" && directPath) {
    let text = "";
    if (toolName === "Write") text = input.content || "";
    else if (toolName === "Edit") text = input.new_string || "";
    else if (toolName === "MultiEdit") {
      text = (input.edits || []).map((e) => e.new_string || "").join("\n");
    }
    targets.push({ action: "update", filePath: directPath, text });
  }

  // 2) apply_patch (Codex 등): command/cmd 안의 패치 본문 파싱
  const command = input.command || input.cmd;
  if (typeof command === "string" && command) {
    let current = null; // { action, filePath, lines: [] }
    const flush = () => {
      if (current) {
        targets.push({
          action: current.action,
          filePath: current.filePath,
          text: current.lines.join("\n"),
        });
        current = null;
      }
    };

    for (const line of command.split(/\r?\n/)) {
      let m = /^\*\*\* (Add|Update|Delete) File: (.+)$/.exec(line);
      if (m) {
        flush();
        current = {
          action: m[1].toLowerCase() === "delete" ? "delete" : "update",
          filePath: m[2].trim(),
          lines: [],
        };
        continue;
      }
      m = /^\*\*\* Move to: (.+)$/.exec(line);
      if (m && current) {
        // 이동 후 경로 기준으로 검사 (여전히 update 취급)
        current.filePath = m[1].trim();
        continue;
      }
      // 패치 추가 라인(`+`)만 변경 텍스트로 모은다 (`+++` diff 헤더는 제외)
      if (
        current &&
        current.action !== "delete" &&
        line.startsWith("+") &&
        !line.startsWith("+++")
      ) {
        current.lines.push(line.slice(1));
      }
    }
    flush();
  }

  return targets;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    pass();
  }

  const toolName = payload.tool_name || "";
  const input = payload.tool_input || {};
  const cwd = payload.cwd || process.cwd();

  const targets = collectTargets(toolName, input);
  if (targets.length === 0) pass();

  for (const t of targets) {
    if (t.action === "delete") continue; // 파일 삭제는 검사 없이 통과

    const abs = path.isAbsolute(t.filePath)
      ? t.filePath
      : path.join(cwd, t.filePath);
    const rel = toPosix(path.relative(cwd, abs));

    if (!isGuardedSource(rel)) continue; // 가드 대상 소스가 아니면 통과
    if (!addsNewExport(t.text)) continue; // 새 함수/모듈 추가가 아니면 통과
    if (hasTestFile(cwd, rel)) continue; // 테스트가 이미 있으면 통과

    const base = path.basename(rel).replace(/\.(ts|tsx)$/, "");
    deny(
      [
        `🔴 TDD: '${rel}' 에 새 export 를 추가하려 하지만 대응하는 테스트가 없습니다.`,
        ``,
        `테스트를 먼저 작성하세요 (Red → Green → Refactor):`,
        `  • 권장 위치: tests/${base}.test.ts`,
        `  • Vitest 사용 — 'npm test' 로 실행`,
        ``,
        `이 프로젝트에는 유닛 테스트 작성 스킬(write-unit-tests)이 있습니다.`,
        `테스트를 먼저 만든 뒤 다시 이 구현을 진행하세요.`,
      ].join("\n"),
    );
  }

  pass(); // 모든 대상이 통과
}

main();
