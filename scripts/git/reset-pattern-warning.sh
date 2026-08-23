#!/bin/sh
# ponytail: migrated from .git/hooks/pre-push (now managed by lefthook).
# Warns when the reflog shows a burst of `reset: moving to HEAD` entries,
# the pattern that correlates with destroyed uncommitted work (see
# .planning/solutions/workflow-issues/preventing-rogue-git-reset-2026-07-21.md).
RESET_COUNT=$(git reflog -20 | grep -c "reset: moving to HEAD" 2>/dev/null || echo "0")

if [ "$RESET_COUNT" -gt 3 ]; then
    echo ""
    echo "WARNING: Suspicious git reset pattern detected"
    echo "   Found $RESET_COUNT consecutive 'reset: moving to HEAD' in recent reflog"
    echo "   This pattern is associated with destroyed uncommitted work"
    echo ""
    echo "   Run: git reflog -20 | grep 'reset: moving to HEAD' to investigate"
    echo "   Push will proceed, but review your uncommitted changes first."
    echo "   Use 'git diff' and 'git diff --cached' to verify nothing was lost."
    echo ""
fi
