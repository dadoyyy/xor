---
name: folder-structure-architecture
description: Defines and enforces a clean, scalable folder structure for a monorepo with web, mobile (React Native/Expo, Play Store), backend, and agent apps plus shared packages. Use this skill whenever creating a new project, scaffolding a repo, adding a feature or file, deciding where code belongs, reorganizing messy folders, or reviewing project structure — even if the user only says "set up the project", "where should I put this", or "clean this up".
---

# Folder Structure & Architecture

Goal: any file should be easy to find, easy to place, and safe to delete. Structure should reveal **what the app does**, not just what technology it uses.

## Core principles

1. **Colocation.** Keep things that change together close together (a component, its styles, its tests, its hook).
2. **Feature-first over type-first.** As a project grows, group by feature/domain instead of dumping everything into global `components/`, `hooks/`, `utils/` folders.
3. **Clear layers, one-way dependencies.** Shared code can't import from features; features can't import from each other directly; `app/` can import from anything.
4. **Single responsibility per file.** One component, one hook, or one concern per file.
5. **Match the existing structure.** If the project already has a convention, follow it. Only propose restructuring when asked or when the structure is clearly broken.

## Project default: monorepo (web + mobile + backend + agent)

Use this as the top-level layout unless the project says otherwise.

```
project-root/
├── apps/
│   ├── web/                 # React / Next.js
│   │   └── src/features/
│   ├── mobile/              # React Native (Expo)
│   │   ├── src/features/
│   │   ├── android/         # Native Android config, signing, Gradle
│   │   ├── app.json
│   │   └── eas.json         # Build and Play Store submission config
│   ├── backend/
│   │   └── src/modules/
│   └── agent/
├── packages/
│   ├── shared-types/        # TypeScript types / API contracts
│   ├── shared-utils/        # Validation, formatters, constants
│   ├── api-client/          # Typed API calls used by web and mobile
│   ├── design-tokens/       # Colors, spacing, typography (both platforms)
│   └── config/              # Shared eslint, tsconfig
├── docs/
├── scripts/                 # Build and release helper scripts
├── .github/workflows/       # CI/CD (separate pipelines per app)
└── package.json             # Workspaces (pnpm / npm / Turborepo / Nx)
```

### Rules for this layout

- **Feature-based inside each app:** `web` and `mobile` use `src/features/`, `backend` uses `src/modules/`.
- **Share logic, not UI.** Types, validation, API client, and design tokens go in `packages/`. Screens and components stay inside their own app because web and mobile navigation/interaction differ.
- **Dependency direction:** `apps/*` may import from `packages/*`. `packages/*` must never import from `apps/*`. Apps never import from each other.
- **Backend is platform-agnostic.** One versioned API (`/api/v1/`) serves web and mobile, since old mobile app versions stay in use for months after a release.
- **Design tokens are shared** (`packages/design-tokens`) so web and mobile stay visually consistent (see the frontend-design-consistency skill).
- **Environments:** `.env.development`, `.env.staging`, `.env.production` per app; commit only `.env.example`.
- **Release hygiene (Play Store):** never commit keystores or secrets; automate `versionCode` increments in CI; build AAB; keep the privacy policy and store listing assets in `docs/store/`.
- **Package naming:** use a workspace scope, e.g. `@project/shared-types`, `@project/api-client`.

---

## Single-app structure (React / Vite / Next-style frontend)

Use this layout *inside* `apps/web/` (or `apps/mobile/`), or for a standalone frontend:

```
project-root/
├── public/                  # Static assets served as-is
├── src/
│   ├── app/                 # App shell: routing, providers, global layout, entry
│   │   ├── routes/
│   │   ├── providers/
│   │   └── App.tsx
│   │
│   ├── features/            # Feature modules (the heart of the app)
│   │   └── auth/
│   │       ├── components/  # UI used only by this feature
│   │       ├── hooks/
│   │       ├── services/    # API calls for this feature
│   │       ├── types.ts
│   │       ├── utils.ts
│   │       └── index.ts     # Public API of the feature (only export what others need)
│   │
│   ├── components/          # Shared, reusable UI
│   │   ├── ui/              # Primitives: Button, Input, Modal, Card
│   │   └── layout/          # Navbar, Sidebar, Footer, PageContainer
│   │
│   ├── hooks/               # Shared hooks (useDebounce, useMediaQuery)
│   ├── lib/                 # Third-party setup/wrappers (axios instance, firebase, queryClient)
│   ├── services/            # Shared API layer / base clients
│   ├── store/               # Global state (only truly global state)
│   ├── utils/               # Pure helper functions
│   ├── constants/           # App-wide constants, enums, config values
│   ├── types/               # Shared TypeScript types
│   ├── styles/              # Global CSS, tokens, theme, resets
│   └── assets/              # Images, icons, fonts imported by code
│
├── tests/                   # E2E / integration tests (unit tests live next to source)
├── .env.example             # Document env vars; never commit real .env
├── README.md
└── package.json
```

## Simple variant (small projects, school projects, prototypes)

Use this until the project outgrows it:

```
src/
├── pages/          # One file/folder per route/screen
├── components/     # Reusable components
├── hooks/
├── services/       # API calls
├── utils/
├── styles/
├── assets/
└── App.jsx
```

Migrate to feature-first when a single folder passes roughly 10-15 files or features start tangling.

## Backend internals

Layered example for `apps/backend/` (use `modules/` per feature when the backend grows):

```
backend/src/
├── routes/        # URL → controller mapping
├── controllers/   # Request/response handling only
├── services/      # Business logic
├── repositories/  # Database access
├── models/        # Schemas/entities
├── middleware/    # Auth, validation, error handling
├── config/
└── utils/
```

Rule: controllers never talk to the database directly; services never touch HTTP objects.

## Where does this file go? (decision guide)

1. Used by **one feature only** → inside that feature's folder.
2. Used by **two or more features** → promote to shared (`components/`, `hooks/`, `utils/`).
3. A **generic UI primitive** (no business logic) → `components/ui/`.
4. A **page/route screen** → `app/routes/` or `pages/`, kept thin; it composes feature components.
5. Calls an **API** → `services/` (never fetch directly inside UI components).
6. **Third-party setup** → `lib/`.
7. Not sure → start inside the feature; promote only when a second consumer appears.

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Component files | `PascalCase` | `UserCard.tsx` |
| Hooks | `camelCase`, `use` prefix | `useAuth.ts` |
| Utils / services | `camelCase` | `formatDate.ts`, `authService.ts` |
| Folders | `kebab-case` or `camelCase` (pick one project-wide) | `user-profile/` |
| Constants | `UPPER_SNAKE_CASE` inside files | `MAX_UPLOAD_SIZE` |
| Types / interfaces | `PascalCase` | `UserProfile` |
| Tests | same name + `.test` | `UserCard.test.tsx` |

Avoid vague names: `helpers.js`, `misc.js`, `stuff/`, `common2/`, `newComponents/`.

## Import rules

- Use path aliases (`@/components/ui/Button`) instead of long `../../../` chains.
- Import from a feature's `index.ts`, never reach into its internals.
- No circular dependencies. If two modules need each other, extract the shared part.
- Order imports: external libs → aliased internal → relative → styles.

## Hygiene rules

- Delete dead code and unused files; don't comment them out and keep them.
- Don't let any folder exceed roughly 15 files without considering subfolders.
- Avoid deep nesting (more than 4 levels is a smell).
- Keep `index.ts` barrel files only at feature/package boundaries to avoid bundle and circularity problems.
- Keep secrets in `.env`, commit `.env.example`, and list `.env` in `.gitignore`.
- Document the structure in the README (a short tree plus one line per top-level folder).

## When asked to scaffold or reorganize

1. Ask or infer the stack (React, Next.js, Vue, etc.) and project size, then pick the matching layout above.
2. Show the proposed tree before creating many files.
3. When reorganizing, move files in logical batches and update imports; never leave the project in a broken state.
4. After finishing, output the final tree and note any decisions or assumptions.

## Pre-delivery checklist

- [ ] Every new file is in the folder the decision guide points to
- [ ] No cross-feature imports; shared code is in shared folders
- [ ] No API calls or business logic inside presentational components
- [ ] Names follow the conventions and are specific
- [ ] No orphan, duplicate, or dead files
- [ ] Imports use aliases and feature `index.ts` entry points
- [ ] `packages/*` never import from `apps/*`; apps never import each other
- [ ] No secrets or keystores committed
- [ ] README tree is up to date
