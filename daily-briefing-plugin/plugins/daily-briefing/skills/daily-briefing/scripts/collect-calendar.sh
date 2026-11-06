#!/usr/bin/env bash
# 오늘(00:00~23:59) 일정을 압축 TSV로 출력한다. 컬럼: 시작시간<TAB>종료시간<TAB>제목
# 시작시간이 비어 있으면 종일 일정이다.
set -uo pipefail

if [ "${BRIEFING_DEMO:-0}" = "1" ]; then
  cat "$(dirname "$0")/fixtures/calendar.tsv"
  exit 0
fi

. "$(dirname "$0")/_lib.sh"
require gcalcli

# gcalcli의 TSV 기본 컬럼: start_date start_time end_date end_time title
# (버전에 따라 플래그가 다를 수 있으니 환경에 맞게 조정)
gcalcli --nocolor agenda "12am" "11:59pm" --tsv 2>/dev/null \
  | awk -F'\t' 'NF>=5 {print $2"\t"$4"\t"$5}'
