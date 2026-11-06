#!/usr/bin/env bash
# 레포를 가리지 않고 나와 관련된 PR을 세 묶음으로 수집한다 (JSON Lines, 최신순).
#   AUTHORED_OPEN   : 내가 연 열린 PR
#   REVIEW_REQUESTED: 내 리뷰를 기다리는 열린 PR
#   MERGED_RECENT   : 최근 1일 내 머지된 내 PR
# 종료코드: 0 정상(0개 포함) · 3 gh 미설치 · 4 인증필요 · 5 수집실패.
# diff/리뷰 상세는 pr-summary.sh가 담당.
set -uo pipefail

fx="${BRIEFING_FIXTURES:-$(dirname "$0")/fixtures}"
if [ "${BRIEFING_DEMO:-0}" = "1" ]; then
  cat "$fx/prs.txt"
  exit 0
fi

. "$(dirname "$0")/_lib.sh"
require gh
require_gh_auth

# 어제 날짜 (GNU date = Git Bash/Linux, BSD date = macOS 폴백)
since=$(date -d '1 day ago' +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)

# 제어문자 제거(한 줄/마크다운 구조 보호) + 최신 업데이트순 정렬. gh 내장 jq 사용(외부 jq 불필요).
jqf='[ .[] | {repo:(.repository.nameWithOwner // .repository.name), num:.number,
      title:((.title // "") | gsub("[\u0000-\u001f]"; " ")), author:(.author.login // "?"),
      draft:.isDraft, updated:.updatedAt, created:.createdAt, url} ]
     | sort_by(.updated) | reverse | .[]'

# 세 묶음은 쿼리가 조금씩 달라(열림/머지) 각각 호출한다.
echo "### AUTHORED_OPEN"
gh search prs --author=@me --state=open --limit 20 --sort updated --order desc \
  --json number,title,url,repository,isDraft,updatedAt,createdAt,author \
  --jq "$jqf" || fail_collect "gh search prs 실패 (AUTHORED_OPEN)"

echo "### REVIEW_REQUESTED"
gh search prs --review-requested=@me --state=open --limit 20 --sort updated --order desc \
  --json number,title,url,repository,isDraft,updatedAt,createdAt,author \
  --jq "$jqf" || fail_collect "gh search prs 실패 (REVIEW_REQUESTED)"

echo "### MERGED_RECENT"
gh search prs --author=@me --merged --merged-at=">=$since" --limit 20 --sort updated --order desc \
  --json number,title,url,repository,isDraft,updatedAt,createdAt,author \
  --jq "$jqf" || fail_collect "gh search prs 실패 (MERGED_RECENT)"
