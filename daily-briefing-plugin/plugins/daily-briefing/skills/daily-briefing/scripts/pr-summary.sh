#!/usr/bin/env bash
# 한 PR의 변경 규모를 한 줄로 요약한다.
#   출력: <reviewDecision> · +추가 -삭제 · N files · 상위폴더(개수), ...
# 사용: pr-summary.sh <owner/repo> <number>
# 종료코드: 0 정상 · 3 gh 미설치 · 4 인증필요 · 5 실패(PR 없음/조회 실패).
set -uo pipefail

repo="${1:?usage: pr-summary.sh <owner/repo> <number>}"
num="${2:?usage: pr-summary.sh <owner/repo> <number>}"

fx="${BRIEFING_FIXTURES:-$(dirname "$0")/fixtures}"
if [ "${BRIEFING_DEMO:-0}" = "1" ]; then
  . "$(dirname "$0")/_lib.sh"
  out=$(awk -F'\t' -v n="$num" '$1==n {print $2}' "$fx/pr-summaries.txt")
  [ -n "$out" ] || fail_collect "데모 fixture에 PR #$num 요약 없음"
  printf '%s\n' "$out"
  exit 0
fi

. "$(dirname "$0")/_lib.sh"
require gh
require_gh_auth

gh pr view "$num" --repo "$repo" \
  --json additions,deletions,changedFiles,files,reviewDecision \
  --jq '(.reviewDecision // "NONE") + " · +\(.additions) -\(.deletions) · \(.changedFiles) files · " +
        ([.files[].path | split("/")[0]] | group_by(.) | map({d:.[0], n:length})
         | sort_by(-.n) | .[0:3] | map("\(.d)(\(.n))") | join(", "))' \
  || fail_collect "PR #$num 조회 실패 ($repo)"
