# Branch-protection rulesets

Version-controlled GitHub **repository rulesets** and tooling that enforce
MoneyOS's merge gates across repositories. These files are the source of truth
for how `main` is protected; the live configuration lives in each repo's
GitHub **Settings → Rules → Rulesets** and is kept in sync with what's here.

```
ops/
└── rulesets/
    ├── README.md                    ← this file
    ├── moneyos-api-ruleset.json     ← ruleset for the moneyos-api repo (JS/TS)
    ├── moneyos-ios-ruleset.json     ← ruleset for the moneyos-ios repo (Swift)
    └── verify-required-checks.sh    ← surfaces exact check names before import
```

> **Note:** GitHub rulesets are configured **server-side per repository** — they
> are not read from these files automatically. This directory is the canonical
> record; importing/updating in the GitHub UI is a manual step (see
> [How to update safely](#how-to-update-safely)).

---

## What each ruleset protects

Both rulesets target the **default branch (`main`)** via `~DEFAULT_BRANCH` and
apply the same policy; they differ only in the CodeQL language check, because
the two repos are analyzed in different languages.

| File | Repo | CodeQL language | Rules enforced on `main` |
| --- | --- | --- | --- |
| `moneyos-api-ruleset.json` | `moneyos-api` | JavaScript/TypeScript | PR required · required status checks (strict) · block deletion · block force-push · no bypass |
| `moneyos-ios-ruleset.json` | `moneyos-ios` | **Swift** | same as above |

Each ruleset requires **three status checks** to pass before merge:

- `moneyos-api`: `CodeQL / Analyze (javascript-typescript) (dynamic)`
- `moneyos-ios`: `CodeQL / Analyze (swift) (dynamic)`
- both: `Code scanning results / CodeQL` (the CodeQL **umbrella** check)
- both: `semgrep-cloud-platform/scan`

Additional rules in every file:

- **`pull_request`** — changes must go through a PR (`required_approving_review_count: 0`,
  so a solo workflow doesn't deadlock; raise to `1`+ once a repo has other reviewers).
- **`required_status_checks`** with `strict_required_status_checks_policy: true` —
  the PR branch must be up to date with `main` before the checks count.
- **`deletion`** and **`non_fast_forward`** — `main` cannot be deleted or force-pushed.
- **`bypass_actors: []`** — no one (including admins) can bypass the rules.

## When it runs

The ruleset itself is **always in effect** on `main`; it is not "run" on a
schedule. The **status checks it requires** execute automatically:

- **On every pull request** targeting `main` — CodeQL (default setup) and semgrep
  run against the PR; the merge button stays blocked until all three are green.
- **On every push to `main`** — CodeQL re-analyzes the merged code.
- **Weekly scheduled scan of `main`** — CodeQL default setup runs a backstop
  analysis even with no activity.

So the gate is enforced at merge time, and `main` is continuously scanned
afterward. See [`SECURITY.md`](../../SECURITY.md) for the CodeQL scope rationale.

## Which branch protections depend on this

The live protection on each repo's `main` is exactly the imported copy of the
matching JSON file. Specifically, these rulesets are what make the following
**required** (a merge is blocked if any is missing, failing, or pending):

1. The per-language CodeQL analyze job (JS/TS for api, Swift for ios).
2. The `Code scanning results / CodeQL` umbrella check.
3. The `semgrep-cloud-platform/scan` check.

If a required check's name does not **exactly** match the check GitHub reports,
that check stays **pending forever** and blocks every merge. This is the primary
failure mode — see below.

## How to update safely

1. **Never guess check-run names.** Run the verifier from a clean clone of the
   target repo, on `main`:

   ```bash
   cd /path/to/moneyos-api        # or moneyos-ios
   bash ops/rulesets/verify-required-checks.sh
   ```

   It opens a throwaway PR and prints the **exact** status-check names to use in
   `required_status_checks[].context`. Correct the JSON if they differ.

2. **Confirm the CodeQL umbrella is green, not neutral, first.** In the target
   repo, `Settings → Code security → Code scanning → CodeQL analysis → Edit` and
   confirm the languages match the repo (JS/TS for api, **Swift** for ios). A
   stale/mismatched language makes `Code scanning results / CodeQL` report a
   `neutral` "configuration not found" status, which — if required — blocks all
   merges. Only require the umbrella check after you've seen it succeed on a PR.

3. **Edit the JSON here first, commit via PR, then import.** Keep this directory
   as the source of truth. After merging a change here, apply it in the UI:
   `Settings → Rules → Rulesets → (the "main-protection" ruleset) → Edit`, or
   re-import: `New ruleset → Import a ruleset → upload the JSON`.

4. **Verify after importing.** Open a throwaway PR (step 1 already does this) and
   confirm all three checks show **Required** and the merge button is blocked
   until they pass. Then delete the branch (the script prints cleanup commands;
   deleting the branch auto-closes the PR).

### Adding another repo

Copy the closest existing JSON, set the CodeQL language line to match the new
repo's analyzed language, run the verifier there to get exact check names,
commit here, then import. If MoneyOS later moves these repos under a GitHub
**organization**, a single **org-level ruleset** can enforce all repos at once
instead of importing per repo.
