#!/usr/bin/env bash
# 실패한 CI run의 "실패한 스텝" 로그에서 마지막 200줄만 가져와 시크릿을 마스킹한다.
# 수천 줄 전체를 LLM에 넣지 않기 위함 — 에러 핵심만 남긴다.
# 사용: ci-fail-log.sh <run-id> [owner/repo]
# 종료코드: 0 정상 · 3 gh 미설치 · 4 인증필요 · 5 실패(로그 없음/조회 실패).
set -uo pipefail

run="${1:?usage: ci-fail-log.sh <run-id> [owner/repo]}"
repo="${2:-}"

fx="${BRIEFING_FIXTURES:-$(dirname "$0")/fixtures}"
. "$(dirname "$0")/_lib.sh"

if [ "${BRIEFING_DEMO:-0}" = "1" ]; then
  f="$fx/ci-fail-$run.log"
  [ -f "$f" ] || f="$fx/ci-fail.log"
  [ -f "$f" ] || fail_collect "데모 fixture에 run $run 로그 없음"
  mask_secrets < "$f"
  exit 0
fi

require gh
require_gh_auth

if [ -n "$repo" ]; then
  log=$(gh run view "$run" --repo "$repo" --log-failed 2>/dev/null) || fail_collect "run $run 로그 조회 실패 ($repo)"
else
  log=$(gh run view "$run" --log-failed 2>/dev/null) || fail_collect "run $run 로그 조회 실패"
fi
[ -n "$log" ] || fail_collect "run $run 의 실패 로그가 비어 있음"
printf '%s\n' "$log" | tail -n 200 | mask_secrets
