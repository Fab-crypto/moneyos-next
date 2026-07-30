#!/usr/bin/env bash
#
# verify-required-checks.sh
#
# Opens a throwaway PR against the default branch so you can read the EXACT
# status-check names GitHub reports — the strings you must paste into the
# ruleset JSON's `required_status_checks[].context` fields.
#
# Why: a required check whose context doesn't match a real check name stays
# pending forever and blocks every merge. Never guess these names — copy them
# from a live PR, which is what this script surfaces.
#
# Usage:
#   Run from inside a fresh clone of the target repo, checked out on the
#   default branch and up to date:
#
#     cd /path/to/moneyos-api      # or moneyos-ios
#     bash verify-required-checks.sh
#
#   If the GitHub CLI (`gh`) is installed and authenticated, the script also
#   opens the PR and prints the exact check names automatically. Without `gh`
#   it pushes the branch and prints a compare URL for you to open manually.
#
# Cleanup is printed at the end (and PR auto-closes when the branch is deleted).

set -euo pipefail

BRANCH="ci/verify-required-checks"
MARKER=".ci-verify-required-checks"

# --- sanity checks ---------------------------------------------------------
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "error: not inside a git repository" >&2; exit 1; }

if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is dirty — run this from a clean checkout" >&2
  exit 1
fi

DEFAULT_BRANCH="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

echo "Repo:           $(git config --get remote.origin.url)"
echo "Default branch: ${DEFAULT_BRANCH}"
echo

# --- create throwaway branch + trivial no-op change ------------------------
git fetch origin "${DEFAULT_BRANCH}" --quiet
git checkout -b "${BRANCH}" "origin/${DEFAULT_BRANCH}" 2>/dev/null \
  || git checkout -B "${BRANCH}" "origin/${DEFAULT_BRANCH}"

printf 'ci verification marker — safe to delete (%s)\n' "$(date -u +%FT%TZ)" > "${MARKER}"
git add "${MARKER}"
git commit -q -m "chore: verify required checks (throwaway, do not merge)"
git push -u origin "${BRANCH}" --force-with-lease

echo
echo "Pushed ${BRANCH}."
echo

# --- surface the exact check names -----------------------------------------
SLUG="$(git config --get remote.origin.url \
        | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "gh detected — opening PR and waiting for checks to register..."
  gh pr create --base "${DEFAULT_BRANCH}" --head "${BRANCH}" \
    --title "chore: verify required checks (throwaway)" \
    --body "Throwaway PR to read exact status-check names. Do not merge." \
    >/dev/null || true

  # Give GitHub a moment to spin up the check runs, then list their names.
  echo "Waiting ~30s for checks to appear..."
  sleep 30
  echo
  echo "=== EXACT check names (copy these verbatim into ruleset context) ==="
  gh pr checks "${BRANCH}" --json name --jq '.[].name' 2>/dev/null \
    | sort -u \
    || echo "(no checks yet — re-run: gh pr checks ${BRANCH} --json name --jq '.[].name')"
  echo "==================================================================="
else
  echo "gh not installed/authenticated — open the PR manually:"
  echo
  echo "  https://github.com/${SLUG}/compare/${DEFAULT_BRANCH}...${BRANCH}?expand=1"
  echo
  echo "Then read the check names off the PR's checks panel and paste them"
  echo "verbatim into the ruleset JSON's required_status_checks[].context."
fi

echo
echo "--- CLEANUP when done (also closes the PR) ---"
echo "  git checkout ${DEFAULT_BRANCH}"
echo "  git branch -D ${BRANCH}"
echo "  git push origin --delete ${BRANCH}"
