---
title: Recovering from corrupted local git repo via fresh clone + side-branch merge
date: 2026-07-20
category: workflow-issues
module: development-environment
problem_type: workflow_issue
severity: critical
tags: [git, corruption, recovery, fsck, force-push, fresh-clone]
---

# Recovering from corrupted local git repo via fresh clone + side-branch merge

## Context

Long-running sessions that accumulate dozens of commits, frequent `git stash` operations, and multiple `git reset --hard` cycles can leave the local `.git/objects/` directory in an unrecoverable state: missing trees, empty blobs, broken refs. Symptom is `fatal: bad tree object <sha>` on every push, and `git fsck` reports empty files like `error: object file .git/objects/a3ece9... is empty`.

## Guidance

When `git gc`, `git repack`, `git stash pop` all error on the same bad objects, the corruption is structural — not a loose index. Three recovery paths exist, ordered by safety:

**1. Fresh clone in /tmp + side-branch merge (recommended)**
```bash
git clone git@github.com:org/repo.git /tmp/repo-fresh
# Apply work via files copy or patch
# Pushed work lives on origin already — clone gives you clean .git + full history
```

**2. Reset local to origin/main** (fast but may fail with same error)
```bash
git fetch origin
git reset --hard origin/main
```

**3. Replace repo entirely** (nuclear — destroys IDE bookmarks)
```bash
rm -rf /works/origin && git clone git@github.com:org/repo.git /works/origin
```

## Why This Matters

A corrupted local tree can hide a perfectly fine remote — losing the local repo doesn't lose any commits because every commit you care about is already pushed. The /tmp approach lets you validate the recovery in isolation (your dev tools, IDE state, and any uncommitted local customizations stay intact in the original dir).

## When to Apply

- `git push` fails with `bad tree object` and the SHA references a commit you made days ago
- `git fsck` shows empty object files matching `error: .git/objects/XX/... is empty`
- `git gc --prune=now` fails with the same `bad tree object` even after `git rm .git/index && git reset --mixed`

## Examples

```bash
# Diagnostic (run first to confirm it's structural)
git fsck --no-dangling 2>&1 | grep -E "missing|empty|broken" | head -10

# Recovery — get current user-unique files BEFORE destructive ops
mkdir -p /tmp/backup
cp -a config.yml assets docs package.json .gitignore /tmp/backup/

# Then: fresh clone, restore files, merge missing branches
git clone git@github.com:org/repo.git /tmp/repo-fresh
cd /tmp/repo-fresh
git merge --no-ff origin/feature-branch  # brings in lost work
cp -a /tmp/backup/* ./
git push origin main
```

## Related

- After recovery, audit which branches you need: `git fetch origin && git branch -r` — sometimes work was on a side branch that didn't make it into main
- Always preserve user-local files (config.yml, asset directories, dotfiles) before any `rm -rf` on the project dir
