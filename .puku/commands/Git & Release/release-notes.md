---
description: Draft user-facing release notes for a specific version
argument-hint: [version]
allowed-tools: Bash(git log:*), Bash(git tag:*), Bash(cat:*)
---

## Context

- Target version: `$1`
- Previous version tag: !`git tag --sort=-creatordate | head -1`
- Commits since previous tag: !`git log $(git tag --sort=-creatordate | head -1)..HEAD --pretty=format:"%h|%s"`
- Existing CHANGELOG (if present): !`cat CHANGELOG.md 2>/dev/null | head -50 || echo "no CHANGELOG.md found"`

## Task

Draft release notes for version `$1` in this structure:

```
# $1 — <Release Title> (YYYY-MM-DD)

## Highlights
(2-4 bullets, plain-language, no jargon — what a non-engineer stakeholder or end user cares about)

## New Features
- ...

## Improvements
- ...

## Bug Fixes
- ...

## Breaking Changes / Migration Notes
(only if applicable — include exact steps needed to upgrade)

## Known Issues
(only if applicable)
```

Rules:
1. If `$1` is missing, stop and ask for the version number before drafting anything.
2. Audience is end users / stakeholders, not engineers — translate technical commits into outcomes ("Faster search results" not "Added Redis cache to search endpoint").
3. Internal-only changes (refactors, test additions, CI tweaks) are omitted from the user-facing notes entirely unless they fix a user-visible bug.
4. If breaking changes exist, the migration notes must be concrete and copy-pasteable (env vars to set, commands to run, config to update) — for LIMS-adjacent releases, explicitly flag anything affecting data integrity, audit trails, or access control.
5. Cross-check against the existing CHANGELOG.md so entries aren't duplicated.