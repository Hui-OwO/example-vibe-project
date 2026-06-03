---
name: commit-message
description: >-
  Write a high-quality git commit message by analyzing staged changes, then
  create the commit. The subject line follows Conventional Commits in English
  (e.g. `feat(auth): ...`) and, when the change warrants it, a Korean body
  explains what changed and why. Use this skill whenever the user asks to
  commit, wants help writing a commit message, says things like "커밋해줘",
  "커밋 메시지 써줘", "이거 커밋", "commit this", or has uncommitted changes
  they want recorded — even if they don't mention "Conventional Commits"
  explicitly. Prefer this skill over an ad-hoc `git commit` so the message
  stays consistent.
---

# Commit Message Writer

Turn the current working-tree changes into one or more well-formed commits. A
good commit message saves a future reader (often the author, months later) from
re-deriving _why_ a change was made. The diff already shows _what_ changed — the
message exists to capture intent, context, and consequences.

## Output contract

- **Subject line**: English, Conventional Commits format. This is what shows up
  in `git log --oneline`, GitHub, and tooling, so a predictable English format
  keeps the history scannable and machine-parseable.
- **Body** (only in Full mode — see below): Korean. The body is where you
  explain reasoning to teammates, so it uses the team's working language.
- **No `Co-Authored-By` trailer.** The message should read as if a human wrote
  it.

## Lite vs Full — pick the mode that fits the change

Not every commit needs a body. Forcing a paragraph onto a one-line typo fix just
adds noise a reader has to skim past. So decide up front which mode the change
calls for. Don't ask the user — infer it from the diff. The user can always
override ("간단하게" / "lite" → Lite; "자세히" / "본문도 써줘" → Full).

**Lite mode — subject line only.** Use when the subject already tells the whole
story and a reader would have no follow-up question:

- typo / comment / formatting / whitespace changes
- version bumps, dependency bumps
- pure renames or file moves
- a single, obvious one-line change

**Full mode — subject + Korean body (+ footer when needed).** Use when a reader
would reasonably ask "why was this done?" or "what's the impact?":

- bug fixes where the root cause or symptom is worth recording
- new features or behavior changes
- changes spanning multiple files or concerns
- anything with non-obvious motivation, trade-offs, or follow-up
- **any breaking change** (always Full — see below)

When you're on the fence, let diff size and subtlety decide: tiny and
self-evident → Lite; substantive or surprising → Full. A short, honest body
beats a padded one — if you can't say something the diff doesn't already show,
stay Lite.

## Workflow

### 1. Gather context

Run these together to understand the change before writing anything:

```bash
git status
git diff --staged        # what's actually going to be committed
git diff                 # unstaged changes (for the staging decision below)
git log --oneline -10    # match the repo's existing style and scope habits
```

Read the actual diff. Don't guess intent from filenames — open the hunks and
understand what the code now does differently. The quality of the message (and
your Lite/Full decision) is bounded by how well you understood the change.

### 2. Decide what to stage

- **If something is already staged**, commit exactly that. The user staged it
  deliberately; respect that boundary.
- **If nothing is staged**, do not silently `git add` everything. Show the user
  the `git status` summary and ask what they want to commit — all changes, or a
  specific subset. Staging is a decision about commit scope, and that's the
  user's call.

### 3. Consider splitting

If the staged changes mix unrelated concerns (e.g. a bug fix _and_ an unrelated
refactor _and_ a dependency bump), point this out and suggest splitting into
separate commits. Atomic commits are easier to review, revert, and bisect. Don't
be dogmatic — closely related changes belong together. Only raise it when the
changes genuinely tell two different stories.

### 4. Write the message

**Subject** (English, Conventional Commits):

```
<type>(<scope>): <imperative summary>
```

- `type` — one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`.
- `scope` — **optional, and used sparingly. Omit it by default.** Add a scope
  only when the repo's `git log` already uses scopes, or when it genuinely
  disambiguates which area changed in a large codebase. A scope tacked onto
  every commit just becomes noise — most commits read fine as `fix: ...`.
- summary — imperative mood ("add", not "added" / "adds"), lowercase start, no
  trailing period, aim for ≤ 50 characters.

**Body** (Full mode only; Korean), separated from the subject by one blank line:

- Write it as a **summary of the change and its reason**, not as a command.
  Describe what changed and why it was needed. End sentences in a descriptive
  form (예: "...하도록 수정", "...추가", "...로 변경했다"). Avoid an
  imperative/instructional tone about your own change (예: "...하라",
  "...할 것", "...해야 한다") — that reads like you're ordering the reader
  around. (The one exception is a `BREAKING CHANGE:` footer, which _is_
  instructing the reader how to migrate — imperative is fine there.)
- Explain the _why_, not a line-by-line restatement of the diff.
- Wrap lines at ~72 characters. Use `-` bullets when there are several distinct
  points.

### 5. Handle breaking changes

A breaking change is one that forces callers/users to change something to keep
working — e.g. a changed or removed public function signature, a renamed export,
a different API response shape, a config/env variable that's now required, or a
removed feature. Watch for these in the diff; they're easy to miss and expensive
to discover later.

When you spot one:

- Mark the subject with `!` after the type/scope: `feat(api)!: ...` or
  `refactor!: ...`. The `!` is the scannable signal in `git log`.
- Add a `BREAKING CHANGE: <설명>` footer (Korean) describing **what breaks and
  how to migrate**. Migration instructions may be imperative — here you really
  are telling the reader what to do.
- Breaking changes always use Full mode, even if the diff is small.

### 6. Confirm, then commit

Show the full proposed message to the user and get a quick confirmation before
committing — they may want to tweak wording. Then create the commit.

Pass the message via a temp file with `-F` rather than stacking `-m` flags.
Multi-line bodies and non-ASCII characters survive intact this way, which
matters on Windows/PowerShell where quoting is fragile. (A Lite, subject-only
commit can use `git commit -m "..."` directly.)

```bash
git commit -F <path-to-temp-message-file>
```

After committing, confirm success by showing the resulting `git log --oneline -1`
(or `-2` if you split).

## Examples

**Example 1 — Lite** (the subject says everything; no body, no scope):

```
docs: fix broken setup link in README
```

**Example 2 — Lite** (trivial mechanical change):

```
chore: bump version to 1.3.0
```

**Example 3 — Full** (a bug fix whose cause is worth recording; no scope needed):

```
fix: treat discount rate as a percentage

rate는 10처럼 퍼센트 값으로 전달되는데, 기존 코드는 100으로
나누지 않고 그대로 곱해 할인액이 과도하게 계산되던 문제.
rate를 100으로 나누도록 수정.
```

**Example 4 — Full with breaking change** (note the `!` and the migration footer):

```
feat(config)!: load settings from config/env.ts only

process.env 직접 접근을 제거하고 모든 환경 변수를 단일
진입점으로 통일. 시작 시점에 누락된 변수를 검증할 수 있게 됨.

BREAKING CHANGE: process.env를 직접 읽던 코드는 모두
config/env.ts를 거치도록 변경해야 한다.
```

## What good looks like

- The mode matches the change: trivial commits are one clean line; substantive
  ones carry a body that explains the why.
- The subject parses as Conventional Commits, stays in English, and uses a scope
  only when it earns its place.
- The Korean body reads as a summary of the change, not a command.
- Breaking changes are flagged with `!` and a migration footer — never silent.
- No `console.log`-style filler, no `Co-Authored-By` trailer, no invented issue
  numbers.
