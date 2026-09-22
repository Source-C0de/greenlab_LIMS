---
description: Summarize current git state — branch, staged/unstaged changes, recent commits
argument-hint: (none)
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*)
---
 
## Context
 
- Current branch: !`git branch --show-current`
- Status: !`git status --short`
- Staged diff stat: !`git diff --cached --stat`
- Unstaged diff stat: !`git diff --stat`
- Last 10 commits: !`git log --oneline -10`
## Task
 
Using the context above, produce a concise summary covering:
 
1. **Branch & state** — current branch, ahead/behind of upstream, clean or dirty
2. **What changed** — group modified/added/deleted files by area (api, components, tests, config, etc.)
3. **Risk flags** — any migration files, env/config files, or lockfiles touched (these need extra review)
4. **Suggested commit message** — a single conventional-commit-style line (`feat:`, `fix:`, `chore:`, etc.) that captures the diff
5. **Anything uncommitted that looks unintentional** — debug prints, commented-out code, `.env` files, large binary additions
Keep the summary under 200 words unless the diff is large enough to warrant more.