---
title: Preventing rogue git reset --hard from destroying uncommitted work
date: 2026-07-21
category: workflow-issues
module: development-environment
problem_type: workflow_issue
severity: high
tags: [git, reset, uncommitted-work, agent-safety, reflog]
---

# Preventing rogue git reset --hard from destroying uncommitted work

## Context

Agent sessions sometimes run `git reset --hard HEAD` repeatedly (observed: 6 consecutive resets at the same SHA). This destroys any uncommitted work silently — the reflog shows the same SHA before and after, so it looks harmless, but the working tree changes are gone.

**Symptom:** Features "disappear" after new plans start. The code was committed, but uncommitted enhancements or fixes were wiped by the reset.

## The Pattern

From `git reflog`:
```
e7d19b30 HEAD@{7}: reset: moving to HEAD
e7d19b30 HEAD@{8}: reset: moving to HEAD
e7d19b30 HEAD@{9}: reset: moving to HEAD
e7d19b30 HEAD@{10}: reset: moving to HEAD
e7d19b30 HEAD@{11}: reset: moving to HEAD
e7d19b30 HEAD@{12}: reset: moving to HEAD
```

All6 resets target the same SHA — the agent was trying to clean up before starting new work, but each reset destroyed the previous session's uncommitted changes.

## Root Cause

The executor workflow allows `git reset --hard` as a "cleanup" operation. It shouldn't. The undo workflow already uses `git revert` (NEVER git reset).

## Prevention

1. **Executor rule:** `git reset --hard` is explicitly prohibited in executor.md
2. **Git alias guard:** Add to `~/.gitconfig` or project `.gitconfig`:
   ```ini
   [alias]
       safe-reset = "!f() { echo 'WARNING: git reset --hard destroys uncommitted work. Use git revert instead.'; git reset --hard \"$@\"; }; f"
   ```
3. **Reflog check:** Before starting a new session, check for suspicious reset patterns:
   ```bash
   git reflog -10 | grep "reset: moving to HEAD" | wc -l
   # If >2, investigate before proceeding
   ```

## Recovery

If uncommitted work was destroyed by `git reset --hard`:
- **It's gone.** There is no recovery for hard-reset working tree changes.
- Check `git reflog` for the commit before the reset — the committed code is still there.
- Check `git stash list` — if the work was stashed before the reset, it can be recovered.

## When to Apply

- Before starting a new agent session on an active branch
- After encountering "features disappeared" reports
- When the reflog shows multiple consecutive `reset: moving to HEAD` entries

## Related

- See `git-corruption-recovery-via-fresh-clone-2026-07-20.md` for structural git corruption recovery
- The executor.md now explicitly prohibits `git reset --hard`
