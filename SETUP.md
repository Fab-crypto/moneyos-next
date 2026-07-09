# MoneyOS — scaffold setup

This is source code only (no `package.json`, `node_modules`, or config you
already have) — it's meant to be merged into your existing `moneyos-next`
project, not run standalone.

## 1. Copy files in

Copy everything in this folder into the root of your local `moneyos-next`
project, merging with what's already there:

```
app/                     → replaces app/layout.tsx, app/globals.css, adds route groups
components/              → new
features/                → new
lib/                     → new
types/                   → new
package.additions.json   → reference only, see step 2 — do not copy as-is
```

If your existing `app/page.tsx` still has the default Next.js starter
content, delete it — the new home page lives at `app/(marketing)/page.tsx`
(route groups like `(marketing)` don't appear in the URL, so this still
serves `/`).

## 2. Install the added dependencies

This scaffold does **not** include a full `package.json` — merging one in
would clobber your existing scripts, Next.js/React/TypeScript versions, etc.
Instead, `package.additions.json` lists just the new packages this scaffold
needs. Add them to the `"dependencies"` object in your real `package.json`,
then run:

```bash
npm install
```

Or skip the manual edit and just run:

```bash
npm install clsx tailwind-merge class-variance-authority lucide-react
```

Everything else (Next.js, React, TypeScript, Tailwind) you already have.

## 3. Confirm Tailwind v4 setup

This scaffold uses **Tailwind v4's CSS-first config** (`@theme` block
directly in `app/globals.css` — no `tailwind.config.ts` needed). If
`create-next-app` set you up with Tailwind v4 (the Next.js 16 default),
this just works. If you're on Tailwind v3 instead, let me know and I'll
convert the tokens into `tailwind.config.ts` format.

## 4. Run it

```bash
npm run dev
```

Visit `/` for the marketing page, `/dashboard` for the app shell.

## 5. Commit and push

```bash
git add .
git commit -m "Add design system, marketing page, and dashboard shell"
git push
```

Vercel will redeploy automatically.

## What's intentionally not here yet

- **Auth** — no login, no session, no protected routes. The `(app)` route
  group is open for now.
- **Database** — all data comes from `lib/mock-data.ts`. When we wire up
  Supabase, that file gets replaced by real queries with the *same shapes*
  (`Account`, `Transaction`, `Budget`), so the components won't need to change.
- **Plaid** — no bank connections yet.
- **Transactions/Budgets/Accounts pages** — only the dashboard is built out.
  The sidebar links to them but they don't have pages yet.

## Design system reference

- Colors, fonts, and radii are defined as CSS variables in the `@theme`
  block of `app/globals.css`.
- Primitives live in `components/ui/` (Button, Card, Badge, ProgressBar).
- Every dollar amount uses `font-mono` with `.tabular` for aligned digits —
  keep this convention for any new money values you add.
