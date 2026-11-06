#!/usr/bin/env bash
# 필수 CLI와 gh 인증 상태를 점검한다. 브리핑 시작 전에 돌려 빠진 도구를 알린다.
set -uo pipefail

# 데모 모드: 모든 수집 스크립트가 fixtures로 완전히 동작하므로, 사전 점검도
# 실제 경로와 동일한 OK 출력을 돌려준다(출력 포맷은 실데이터 경로와 동일).
if [ "${BRIEFING_DEMO:-0}" = "1" ]; then
  echo "OK"
  echo "GH_AUTH:ok"
  exit 0
fi

. "$(dirname "$0")/_lib.sh"

missing=""
for t in gh gcalcli; do
  command -v "$t" >/dev/null 2>&1 || missing="$missing $t"
done

if [ -n "$missing" ]; then
  echo "MISSING:$missing"
  for t in $missing; do
    echo "  ↳ 설치: $(_install_hint "$t")"
  done
else
  echo "OK"
fi

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "GH_AUTH:ok"
else
  echo "GH_AUTH:no"
fi
