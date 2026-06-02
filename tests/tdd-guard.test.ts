import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const script = path.join(
  repoRoot,
  "tdd-enforcer-plugin",
  "plugins",
  "tdd-enforcer",
  "hooks",
  "tdd-guard.js",
);

/** tdd-guard 훅을 실제 프로세스로 실행하고 차단 여부를 돌려준다 */
function runGuard(filePath: string, content: string) {
  const payload = {
    tool_name: "Write",
    cwd: repoRoot,
    tool_input: { file_path: filePath, content },
  };
  const res = spawnSync("node", [script], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    cwd: repoRoot,
  });
  const stdout = res.stdout.trim();
  const denied = stdout.includes('"permissionDecision":"deny"');
  return { denied, stdout };
}

// 대응 테스트가 존재하지 않도록 일부러 유니크한 베이스명을 쓴다.
const NO_TEST_SRC = "lib/__tdd_guard_fixture_no_test__.ts";

describe("tdd-guard 훅 — 새 export 탐지", () => {
  it("화살표 함수 + 타입 어노테이션(=> 포함) export 를 차단한다 (회귀)", () => {
    const { denied } = runGuard(
      NO_TEST_SRC,
      "export const fn: () => void = () => { /* noop */ };",
    );
    expect(denied).toBe(true);
  });

  it("타입 어노테이션 없는 일반 화살표 함수 export 도 차단한다", () => {
    const { denied } = runGuard(
      NO_TEST_SRC,
      "export const add = (a: number, b: number) => a + b;",
    );
    expect(denied).toBe(true);
  });

  it("타입 어노테이션이 붙은 '상수'(함수 아님) export 는 통과시킨다", () => {
    const { denied } = runGuard(NO_TEST_SRC, "export const MAX: number = 5;");
    expect(denied).toBe(false);
  });

  it("객체/호출 결과를 담은 const export 는 통과시킨다", () => {
    const { denied } = runGuard(
      NO_TEST_SRC,
      "export const client = createClient();",
    );
    expect(denied).toBe(false);
  });
});
