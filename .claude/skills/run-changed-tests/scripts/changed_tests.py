#!/usr/bin/env python3
"""
변경된 파일을 찾아 어떤 테스트 러너로 어떤 연관 테스트를 돌려야 할지 판단해 준다.

이 스크립트는 "결정적인" 부분만 담당한다: git diff 해석, 러너 감지, 변경 파일을
테스트/소스로 분류, pytest의 이름 규칙 기반 매핑, 실행 명령 제안. 실제 연관성
판단(import 그래프 추적)은 vitest/jest의 내장 기능(`related` / `--findRelatedTests`)에
위임한다 — 그쪽이 alias·재export까지 정확히 처리하기 때문이다.

사용법:
    python changed_tests.py [--base REF] [--working-tree] [--json]

기본은 "자동" 모드: 워킹 트리(staged+unstaged+untracked)에 변경이 있으면 그걸,
없으면 베이스 브랜치 대비 diff를 대상으로 삼는다.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def run_git(args):
    try:
        out = subprocess.run(
            ["git"] + args,
            capture_output=True, text=True, check=True,
        )
        return out.stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def repo_root():
    root = run_git(["rev-parse", "--show-toplevel"]).strip()
    return Path(root) if root else Path.cwd()


def detect_base_ref():
    """베이스 브랜치 후보를 찾는다: upstream → origin/main → origin/master → main → master."""
    upstream = run_git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).strip()
    if upstream:
        return upstream
    for cand in ["origin/main", "origin/master", "main", "master"]:
        if run_git(["rev-parse", "--verify", "--quiet", cand]).strip():
            return cand
    return ""


def working_tree_changes():
    """staged + unstaged + untracked 파일 경로 목록."""
    files = set()
    porcelain = run_git(["status", "--porcelain", "--untracked-files=all"])
    for line in porcelain.splitlines():
        if not line.strip():
            continue
        # 형식: "XY path" 또는 "XY old -> new" (리네임)
        path = line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        files.add(path.strip().strip('"'))
    return files


def base_diff_changes(base):
    """베이스 브랜치와의 merge-base 대비 변경 파일."""
    if not base:
        return set()
    merge_base = run_git(["merge-base", "HEAD", base]).strip()
    ref = merge_base if merge_base else base
    out = run_git(["diff", "--name-only", ref])
    return {l.strip() for l in out.splitlines() if l.strip()}


def detect_runner(root):
    """vitest / jest / pytest / unknown 중 하나를 반환."""
    pkg = root / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text(encoding="utf-8"))
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
            if "vitest" in deps or list(root.glob("vitest.config.*")):
                return "vitest"
            if "jest" in deps or "jest" in data or list(root.glob("jest.config.*")):
                return "jest"
        except (json.JSONDecodeError, OSError):
            pass
    if list(root.glob("vitest.config.*")):
        return "vitest"
    if list(root.glob("jest.config.*")):
        return "jest"
    # pytest 신호
    py_signals = [
        root / "pytest.ini", root / "conftest.py",
        root / "pyproject.toml", root / "setup.cfg", root / "tox.ini",
    ]
    if any(p.exists() for p in py_signals):
        text = ""
        for p in [root / "pyproject.toml", root / "setup.cfg", root / "tox.ini"]:
            if p.exists():
                try:
                    text += p.read_text(encoding="utf-8")
                except OSError:
                    pass
        if "pytest" in text or (root / "pytest.ini").exists() or (root / "conftest.py").exists():
            return "pytest"
    return "unknown"


JS_TEST_RE = re.compile(r"\.(test|spec)\.[cm]?[jt]sx?$")
PY_TEST_RE = re.compile(r"(^test_.*\.py$)|(_test\.py$)")


def is_js_test(path):
    return bool(JS_TEST_RE.search(path))


def is_py_test(path):
    return bool(PY_TEST_RE.search(os.path.basename(path)))


def find_pytest_related(root, source_files):
    """변경된 .py 소스에 대응하는 test_<name>.py / <name>_test.py 를 이름 규칙으로 찾는다."""
    found = set()
    all_tests = list(root.rglob("test_*.py")) + list(root.rglob("*_test.py"))
    for src in source_files:
        stem = Path(src).stem
        for t in all_tests:
            tname = t.name
            if tname == f"test_{stem}.py" or tname == f"{stem}_test.py":
                found.add(str(t.relative_to(root)).replace("\\", "/"))
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", help="베이스 브랜치 ref (예: origin/main)")
    ap.add_argument("--working-tree", action="store_true", help="워킹 트리 변경만 강제 사용")
    ap.add_argument("--json", action="store_true", help="JSON으로 출력")
    args = ap.parse_args()

    root = repo_root()
    os.chdir(root)

    # --- 변경 기준 자동 판단 ---
    wt = working_tree_changes()
    if args.working_tree:
        mode, changed = "working-tree", wt
    elif args.base:
        mode, changed = f"base:{args.base}", base_diff_changes(args.base)
    elif wt:
        mode, changed = "working-tree", wt
    else:
        base = detect_base_ref()
        mode, changed = f"base:{base or '?'}", base_diff_changes(base)

    runner = detect_runner(root)

    # 존재하는 파일만 (삭제된 파일 제외)
    changed = sorted(f for f in changed if (root / f).exists())

    if runner in ("vitest", "jest"):
        code_files = [f for f in changed if re.search(r"\.[cm]?[jt]sx?$", f)]
        test_files = [f for f in code_files if is_js_test(f)]
        source_files = [f for f in code_files if not is_js_test(f)]
    elif runner == "pytest":
        py = [f for f in changed if f.endswith(".py")]
        test_files = [f for f in py if is_py_test(f)]
        source_files = [f for f in py if not is_py_test(f)]
    else:
        test_files, source_files = [], []

    # --- 실행 명령 / 연관 테스트 판단 ---
    related = []          # pytest에서 이름 규칙으로 찾은 연관 테스트
    related_status = ""   # found | none | delegated
    command = ""

    if runner == "vitest":
        targets = source_files + test_files
        if targets:
            command = "npx vitest related --run " + " ".join(targets)
            related_status = "delegated"  # 실제 매칭은 vitest가 판단 → 0건이면 사용자 확인
        else:
            related_status = "none"
    elif runner == "jest":
        targets = source_files + test_files
        if targets:
            command = "npx jest --findRelatedTests " + " ".join(targets)
            related_status = "delegated"
        else:
            related_status = "none"
    elif runner == "pytest":
        related = sorted(find_pytest_related(root, source_files))
        all_targets = sorted(set(test_files) | set(related))
        if all_targets:
            command = "python -m pytest " + " ".join(all_targets)
            related_status = "found"
        else:
            related_status = "none"

    result = {
        "runner": runner,
        "change_mode": mode,
        "changed_files": changed,
        "changed_test_files": test_files,
        "changed_source_files": source_files,
        "related_tests": related,
        "related_status": related_status,  # delegated: 러너가 판단 / found / none
        "suggested_command": command,
    }

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    print(f"RUNNER: {runner}")
    print(f"CHANGE_MODE: {mode}")
    print(f"CHANGED FILES ({len(changed)}):")
    for f in changed:
        print(f"  {f}")
    if test_files:
        print(f"CHANGED TEST FILES ({len(test_files)}):")
        for f in test_files:
            print(f"  {f}")
    if related:
        print(f"PYTEST RELATED (이름 규칙 매칭, {len(related)}):")
        for f in related:
            print(f"  {f}")
    print(f"RELATED_STATUS: {related_status}")
    print(f"SUGGESTED_COMMAND: {command or '(없음)'}")


if __name__ == "__main__":
    main()
