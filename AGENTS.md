<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design System Rules

### 1. No Emoji Rule
- **Strict Policy**: Never use emoji or pictographic Unicode symbols (e.g. 👋, 🔥, ✨, 🚀, 🎉, etc.) in UI labels, greetings, empty copy, badges, button text, toasts, errors, or metadata.
- **Alternatives**: Always use vector Lucide icons (e.g. `<Flame />`, `<Sparkles />`, `<Check />`) or the official `<Mascot />` component expressions.
- **Exception**: User-generated content (user chat messages, notes, titles entered by user) is exempt.
- **Enforcement**: Run `node scripts/check-no-emoji.mjs`.

### 2. Mascot Backdrop System
- Every corgi expression image rendered in cards, panels, and empty states MUST use the `<Mascot />` component with its circular complementary backdrop.
- Surface-aware tokens map automatically via `data-surface` attributes:
  - Lilac (`data-surface="lilac"`): `--mascot-bg-on-lilac` (#FED770)
  - Neutral (`data-surface="neutral"`): `--mascot-bg-on-neutral` (#FED770)
  - Cream (`data-surface="cream"`): `--mascot-bg-on-cream` (#E4D9FF)
  - Yellow (`data-surface="yellow"`): `--mascot-bg-on-yellow` (#E4D9FF)
  - White (`data-surface="white"`): `--mascot-bg-on-white` (#FED770)
- Kept exceptions (no backdrop): standing corgi in Home banner artwork, xor logo in sidebar / topbar, sign-up/login hero illustration, and medal badge artwork.

