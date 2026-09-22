---
description: Generate a changelog from commits since a given tag/ref
argument-hint: [since_tag]
allowed-tools: Bash(git log:*), Bash(git tag:*), Bash(git describe:*)
---

## Context

- Requested starting point: `$1`
- Resolved tag (falls back to last tag if `$1` omitted): !`git describe --tags --abbrev=0 2>/dev/null || echo "no tags found"`
- Available tags (most recent 10): !`git tag --sort=-creatordate | head -10`
- Commits since `$1`: !`git log $1..HEAD --pretty=format:"%h|%an|%s" 2>/dev/null || echo "invalid ref: $1"`

## Task

Using the commit list above, produce a changelog in this format:

```
## [Unreleased] — since $1

### Added
- ...

### Fixed
- ...

### Changed
- ...

### Breaking
- ...
```

Rules:
1. If `$1` is empty or invalid, ask the user to supply a valid tag/ref before proceeding — do not guess.
2. Group commits by conventional-commit prefix (`feat`→Added, `fix`→Fixed, `refactor`/`chore`/`perf`→Changed, `BREAKING CHANGE`/`!`→Breaking). Commits with no recognizable prefix go under a `### Other` section.
3. Rewrite each commit subject into a user-facing sentence (not raw commit text) — drop ticket numbers unless the user wants them kept.
4. Collapse duplicate/near-duplicate entries (e.g. a feature commit + its follow-up fix commit) into one line where sensible.
5. Omit merge commits and pure formatting/lint-only commits.