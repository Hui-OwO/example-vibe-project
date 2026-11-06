#!/usr/bin/env bash
# 대상 레포 기본 브랜치의 CI 상태를 "워크플로별 최신 run"만 압축 JSON Lines로 출력한다.
# 과거 실패가 이후 성공으로 덮인 경우까지 빨간불로 잡는 오경보를 막는다.
#   BRIEFING_REPO   : 대상 레포(owner/repo). 없으면 현재 위치에서 자동 해석.
#   BRIEFING_BRANCH : 대상 브랜치. 없으면 레포 기본 브랜치 자동 탐지(main이 아닐 수 있음).
# 종료코드: 0 정상 · 3 gh 미설치 · 4 인증필요 · 5 수집실패(레포/브랜치 미해석, API 실패).
# status가 completed가 아니면(queued/in_progress) conclusion은 비고, 진행중으로 본다.
set -uo pipefail

fx="${BRIEFING_FIXTURES:-$(dirname "$0")/fixtures}"
if [ "${BRIEFING_DEMO:-0}" = "1" ]; then
  cat "$fx/ci.txt"
  exit 0
fi

. "$(dirname "$0")/_lib.sh"
require gh
require_gh_auth

repo="${BRIEFING_REPO:-}"
if [ -z "$repo" ]; then
  repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null) \
    || fail_collect "현재 위치에서 레포를 해석할 수 없음 (BRIEFING_REPO=owner/repo 로 지정 가능)"
fi

branch="${BRIEFING_BRANCH:-}"
if [ -z "$branch" ]; then
  branch=$(gh repo view "$repo" --json defaultBranchRef --jq .defaultBranchRef.name 2>/dev/null) \
    || fail_collect "기본 브랜치 조회 실패 ($repo)"
fi

gh run list --repo "$repo" --branch "$branch" --limit 40 \
  --json databaseId,displayTitle,status,conclusion,workflowName,createdAt,url \
  --jq 'group_by(.workflowName) | map(max_by(.createdAt)) | sort_by(.createdAt) | reverse
        | .[] | {id:.databaseId, wf:.workflowName, status, conclusion,
                 title:((.displayTitle // "") | gsub("[\u0000-\u001f]"; " ")),
                 at:.createdAt, url, branch:"'"$branch"'"}' \
  || fail_collect "gh run list 실패 ($repo@$branch)"
