# xor Architecture Overview

This repository is structured as a feature-first monorepo following the `folder-structure-architecture` and `frontend-design-consistency` skills.

## Dependency Direction

- `apps/*` (`web`, `mobile`, `backend`, `agent`) may import from `packages/*` (`@xor/shared-types`, `@xor/shared-utils`, `@xor/api-client`, `@xor/design-tokens`, `@xor/config`).
- `packages/*` must **never** import from `apps/*`.
- Apps never import directly from each other.
- Inside `apps/web/src/`:
  - `app/` (routing layer) composes `features/*` via their public `index.ts` entry points.
  - `features/*` never import from other features.
  - Shared `components/`, `hooks/`, `lib/`, `services/`, `utils/`, `constants/`, and `types/` never import from `features/*`.

