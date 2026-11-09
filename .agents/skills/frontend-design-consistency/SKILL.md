---
name: frontend-design-consistency
description: Enforces a consistent visual and code-level design language across a frontend project (colors, typography, spacing, components, states, responsiveness). Use this skill whenever building, editing, or reviewing any UI — pages, components, forms, layouts, styling, themes — even if the user doesn't mention "consistency" or "design system". Also use when adding a new screen to an existing project, refactoring CSS/Tailwind, or when the UI looks "off", mismatched, or inconsistent.
---

# Frontend Design Consistency

Goal: every screen and component should look and behave like it came from the same hand. Consistency comes from **design tokens + reusable components + fixed patterns**, never from one-off styling.

## Core rules

1. **Never hard-code visual values.** No raw hex colors, pixel spacing, font sizes, radii, or shadows inside components. Always reference a token.
2. **Reuse before creating.** Before writing a new component, search the existing `components/ui/` folder. If something similar exists, extend it with a variant/prop instead of duplicating.
3. **One source of truth.** Tokens live in one place (CSS variables, `tailwind.config`, or a `theme` file). Change it there, and it updates everywhere.
4. **Match what exists.** When editing an existing project, read 2-3 existing components first and mirror their naming, structure, and styling approach. Do not introduce a second styling method (e.g. don't add styled-components to a Tailwind project).

## Step 1: Establish or locate the tokens

Check for an existing token file first (`tokens.css`, `theme.ts`, `tailwind.config.*`, `globals.css`). If none exists, create one before building UI.

Define at minimum:

| Category | Tokens |
|---|---|
| Color | `primary`, `secondary`, `accent`, `background`, `surface`, `text`, `text-muted`, `border`, plus `success`, `warning`, `danger`, `info` |
| Typography | font families (heading/body/mono), size scale (xs → 4xl), weights, line heights |
| Spacing | a single scale (e.g. 4px base: 4, 8, 12, 16, 24, 32, 48, 64) |
| Radius | `sm`, `md`, `lg`, `full` |
| Shadow | `sm`, `md`, `lg` |
| Breakpoints | `sm`, `md`, `lg`, `xl` |
| Motion | duration (fast/base/slow) and easing |

Example (CSS variables):

```css
:root {
  --color-primary: #2563eb;
  --color-surface: #ffffff;
  --color-text: #0f172a;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --radius-md: 0.5rem;
  --font-body: "Inter", system-ui, sans-serif;
}
```

Use semantic names (`--color-danger`) rather than literal ones (`--color-red`), so themes and dark mode are a token swap.

## Step 2: Component consistency

- Build a small set of **primitives** (Button, Input, Select, Card, Modal, Badge, Typography) and compose pages from them.
- Every component supports the same **variants** and **sizes** vocabulary: `variant="primary | secondary | ghost | danger"`, `size="sm | md | lg"`.
- Every interactive component implements **all states**: default, hover, focus-visible, active, disabled, loading, and error where relevant.
- Same job = same component everywhere. All primary actions use the same Button; all form fields use the same Input with the same label/help/error layout.

## Step 3: Layout and spacing

- Use the spacing scale only. No arbitrary values like `margin: 13px`.
- Use a consistent page container (max-width, horizontal padding) and consistent section vertical rhythm.
- Align to a grid; keep consistent gaps between cards, form fields, and sections.
- Keep icon set, icon size, and stroke weight uniform (one icon library only).

## Step 4: Typography hierarchy

- Define H1 → H6, body, caption, and label styles once. Use them via components or utility classes, not ad-hoc font sizes.
- One heading font and one body font at most (plus mono for code).
- Keep line length readable (roughly 45-75 characters for body text).

## Step 5: Accessibility baked in

- Text contrast at least 4.5:1 (3:1 for large text).
- Visible `:focus-visible` outline on every interactive element, styled consistently.
- Tap/click targets at least 44x44px on mobile.
- Semantic HTML first (`button`, `nav`, `label`), ARIA only when needed.
- Never rely on color alone to convey meaning.

## Step 6: Responsive behavior

- Mobile-first. Use the defined breakpoints only.
- Same component, same behavior across screens: e.g. the navbar collapses the same way on every page.
- Test at roughly 375px, 768px, 1024px, and 1440px.

## Naming and code conventions

- Components: `PascalCase` (`UserCard.tsx`). Files for styles/hooks/utils: follow the project's existing convention.
- CSS classes: pick one method (BEM, utility classes, or CSS Modules) and stick with it.
- Props: consistent names across components (`variant`, `size`, `disabled`, `isLoading`, `onClick`).
- Copy/text: consistent capitalization (e.g. Sentence case for buttons), consistent tone, and consistent date/number/currency formatting.

## Pre-delivery checklist

Before finishing any UI work, verify:

- [ ] No hard-coded colors, spacing, font sizes, or radii
- [ ] Reused existing components instead of duplicating
- [ ] All interactive states present (hover, focus, disabled, loading, error)
- [ ] Spacing and typography follow the scale
- [ ] Looks correct at mobile, tablet, desktop
- [ ] Contrast and focus visibility pass
- [ ] Matches the look of existing pages next to it
- [ ] Empty, loading, and error states designed (not just the happy path)

## Anti-patterns to avoid

- Copy-pasting a component and tweaking its styles instead of adding a variant
- "Just this once" inline styles or magic numbers
- Mixing icon libraries, button styles, or card styles between pages
- Inconsistent border radius or shadow depth between similar elements
- Designing only the happy path and leaving empty/error/loading states unstyled

