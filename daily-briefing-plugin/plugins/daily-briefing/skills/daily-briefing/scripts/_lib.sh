#!/usr/bin/env bash
# 공통 헬퍼. 각 수집 스크립트가 도구 점검·실패 신호·민감정보 마스킹에 쓴다.
#
# 수집 스크립트의 종료코드 계약(오케스트레이터가 상태를 구분하는 기준):
#   0  정상 수집 (항목 0개도 포함)
#   3  의존 도구 미설치   → stdout 첫 줄 "SKIP: …"
#   4  인증 필요(gh)      → stdout 첫 줄 "AUTH: …"
#   5  수집 실패(네트워크·API·레포 미해석·파싱·fixture 없음) → 첫 줄 "FAIL: …"
# SKILL.md는 이 접두어/코드로 섹션을 "⚠️ …건너뜀"으로 표기하고 나머지는 진행한다.

# 도구별 설치 안내 한 줄. 플랫폼 공통으로 가장 흔한 경로만 짧게.
_install_hint() {
  case "$1" in
    gh)      echo "GitHub CLI — https://cli.github.com (brew install gh / winget install GitHub.cli), 설치 후 'gh auth login'" ;;
    gcalcli) echo "gcalcli — https://github.com/insanum/gcalcli (pipx install gcalcli / brew install gcalcli), 첫 실행 시 'gcalcli list'로 인증" ;;
    jq)      echo "jq — https://jqlang.github.io/jq (brew install jq / winget install jqlang.jq / apt install jq)" ;;
    *)       echo "$1" ;;
  esac
}

# 필요한 도구가 모두 있는지 확인. 없으면 안내 후 exit 3.
require() {
  local missing=() t
  for t in "$@"; do
    command -v "$t" >/dev/null 2>&1 || missing+=("$t")
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "SKIP: ${missing[*]} 미설치 — 이 섹션을 건너뜁니다."
    for t in "${missing[@]}"; do
      echo "  ↳ 설치: $(_install_hint "$t")"
    done
    exit 3
  fi
}

# gh 인증 상태 확인. 미인증(토큰 만료 포함)이면 안내 후 exit 4.
require_gh_auth() {
  if ! gh auth status >/dev/null 2>&1; then
    echo "AUTH: gh 인증 필요 — 이 섹션을 건너뜁니다."
    echo "  ↳ 'gh auth login' (토큰 만료 시 'gh auth refresh') 후 다시 시도"
    exit 4
  fi
}

# 수집 실패 공통 종료. 메시지와 함께 exit 5.
fail_collect() {
  echo "FAIL: ${1:-수집 실패} — 이 섹션을 건너뜁니다."
  exit 5
}

# 토큰·키·비밀번호 형태 문자열을 마스킹한다(stdin→stdout).
# CI 로그 등 신뢰할 수 없는 외부 출력을 모델/사용자에게 보이기 전에 통과시킨다.
mask_secrets() {
  sed -E \
    -e 's/gh[pousr]_[A-Za-z0-9]{20,}/***MASKED***/g' \
    -e 's/github_pat_[A-Za-z0-9_]{20,}/***MASKED***/g' \
    -e 's/(AKIA|ASIA)[A-Z0-9]{12,}/***MASKED***/g' \
    -e 's/(eyJ[A-Za-z0-9_-]{8,}\.){2}[A-Za-z0-9_-]{8,}/***MASKED-JWT***/g' \
    -e 's/(([Tt]oken|[Ss]ecret|[Pp]assword|[Aa]pi[-_]?[Kk]ey|[Bb]earer)["'"'"' :=]+)[A-Za-z0-9._\/+=-]{8,}/\1***MASKED***/g'
}
