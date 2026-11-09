# Design System & Mascot System Specification

## 1. No Emoji Policy
- **Strict Rule**: No emojis or pictographic Unicode symbols in UI copy, button labels, greetings, empty states, or badges.
- **Replacement**: Use Lucide SVG icons (`lucide-react`) or `<Mascot />` expressions.
- **Enforcement**: Run `node scripts/check-no-emoji.mjs`.

## 2. Mascot Backdrop System
All standalone corgi expressions appearing within cards, dialogs, empty states, and results use the reusable `<Mascot />` component (`apps/web/src/components/ui/Mascot.tsx`).

### Props & Features
- `name` / `mood`: Expression key matching `CORGI_ASSETS` (`"sleepy"`, `"proud"`, `"thinking"`, `"happy"`, `"excited"`, etc.).
- `size`: Preset (`"sm"` 46px/62px, `"md"` 64px/86px, `"lg"` 84px/114px) or number in pixels.
- `surface`: Optional explicit surface override (`"lilac" | "neutral" | "cream" | "yellow" | "white" | "white-alt" | "gradient"`). Defaults to contextual CSS variable `--current-mascot-bg`.
- `shape`: `"circle"` (default) or `"blob"`.
- Circular decorative backdrop: Aspect ratio 1, sized at 1.35x image width, optical alignment (`translate-y-[2px]`), borderless, shadowless.

### Surface-Aware Complementary Color Tokens
- `--mascot-bg-on-lilac`: `#FED770` (on `#EFE9FF` and `#F7F5FF`) — contrast ratio $\ge 1.15:1$ against surface, $\ge 10:1$ against corgi outline.
- `--mascot-bg-on-neutral`: `#FED770` (on `#F7F5FF`)
- `--mascot-bg-on-cream`: `#E4D9FF` (on `#FFFBF0`)
- `--mascot-bg-on-yellow`: `#E4D9FF` (on `#FFF1C2`)
- `--mascot-bg-on-white`: `#FED770` (on `#FFFFFF`)
- `--mascot-bg-on-white-alt`: `#EFE9FF`
- `--mascot-bg-on-gradient`: `rgba(255, 255, 255, 0.7)`

### Kept Exceptions (No Backdrop)
- Full-scene banner illustrations (e.g. `HomeBanner.tsx`)
- App Logo in sidebar / topbar (`logo-icon`, `logo-main`)
- Auth Hero mascot on login/signup (`hero-squad`, `signup-main`)
- Achievement medal badges (`streak-7`, `first-room`, etc.)

