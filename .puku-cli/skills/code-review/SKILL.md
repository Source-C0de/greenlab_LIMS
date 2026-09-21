---
name: code-review
description: Automated code review of staged/unstaged changes or a full branch diff, with inline findings, auto-fixes for safe issues, and blocking on critical errors.
allowed-tools:
  - Bash(git:*)
  - Bash(npm:*)
  - Read
  - Edit
  - Grep
  - Glob
when_to_use: Use when the user wants to review code changes before committing or opening a PR in the GreenLabLIMS KSA repo. Trigger phrases: 'review my changes', 'code review', 'review this PR', 'check my diff', 'review before commit', 'run review'.
argument-hint: "[scope: staged|unstaged|branch] [base-branch]"
arguments:
  - scope: Which diff to review. Defaults to 'staged'.
  - base-branch: Branch to diff against when scope is 'branch'. Defaults to 'main'.
context: inline
---

# Code Review

Run an automated code review on recent changes in the GreenLabLIMS KSA repo. Catches bugs, style issues, security concerns, and missing test coverage. Auto-fixes safe issues and blocks on critical findings.

## Inputs
- `$scope`: One of `staged`, `unstaged`, or `branch`. Defaults to `staged`.
- `$base-branch`: Base branch when `$scope=branch`. Defaults to `main`.

## Goal
Produce a review report with categorized findings and, where safe, auto-applied fixes. Block the user before committing/merging when critical issues remain.

## Steps

### 1. Gather the diff
Determine what to review based on `$scope`:
- `staged`: `git diff --cached`
- `unstaged`: `git diff`
- `branch`: `git diff $base-branch...HEAD`

Capture the list of changed files with `git diff --name-only` (or `--cached --name-only` / against `$base-branch`) so later steps can scope their checks.

**Success criteria**: A non-empty diff (or explicit user confirmation that empty diff is intentional) and a list of changed file paths are available.

### 2. Run static + style checks
For each changed file, run the appropriate checks. Run these concurrently where independent:
- **Lint/format**: `npm run lint` if a script exists; otherwise skip with a note.
- **Type-check**: `npm run typecheck` or `npx tsc --noEmit` if TypeScript is detected.
- **Project conventions**: scan for GreenLabLIMS-specific patterns (bilingual component shape, role-gated routes, mock-data barrel exports) using Grep.

**Success criteria**: Lint, typecheck, and convention scans complete. Their outputs are summarized as a finding list.

### 3. Security & logic review
Invoke a sub-agent (`general-purpose`) to read the diff and changed files in full, then evaluate:
- Bugs and logic errors (null deref, off-by-one, async mistakes)
- Security issues (hardcoded secrets, unsanitized input, unsafe `dangerouslySetInnerHTML`, missing authz checks)
- Missing test coverage for new/changed behavior

**Artifacts**: Structured findings list with `{file, line, severity: critical|warn|info, category, message}`.

**Success criteria**: Sub-agent returns a categorized findings list. Severity and category are set for every finding.

### 4. Auto-fix safe issues
For findings with severity `info` or low-risk `warn` (formatting, unused imports, simple naming), apply the fix with Edit. Skip anything ambiguous or `critical`.

**Rules**:
- Never auto-fix logic changes.
- Never auto-fix security findings — surface them only.
- Show a one-line summary of every file edited.

**Success criteria**: All auto-fixable issues either fixed or explicitly skipped with a reason. A short log of edits is ready.

### 5. Emit inline report and block check
Output the full findings report grouped by file. Then:

- If any `critical` finding exists → block and ask the user how to proceed (fix now, defer, or override with justification).
- If only `warn`/`info` remain → summarize auto-fixes and continue.

**Success criteria**: Report is shown to the user, auto-fix log is included, and blocking decision is recorded.

### 6. [human] User decides next step
Pause for user input:
- If blocked: wait for the user to fix or override.
- If clear: ask whether to commit (`staged`/`unstaged`) or open a PR (`branch`). Offer to invoke `/commit` or `/review-pr` accordingly.

**Success criteria**: User gives an explicit go-ahead for the next action.
