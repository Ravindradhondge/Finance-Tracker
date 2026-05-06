# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── finance-tracker/    # React + Vite personal finance tracker
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Artifacts

### `artifacts/finance-tracker` — Personal Finance Tracker
- React + Vite frontend at `/` (previewPath)
- Pages: `/` (dashboard), `/transactions`, `/budgets`, `/reports`, `/categories`
- Uses `@workspace/api-client-react` for API hooks
- Auth: mobile number login via `POST /api/auth/login` — creates/finds user, stores `{ id, name, mobile }` in localStorage
- `x-user-id` header sent with every API request via `setDefaultHeaders` in `lib/api-client-react/src/custom-fetch.ts`
- Modern indigo/navy theme, Inter + Plus Jakarta Sans fonts, dark mode toggle
- Mobile-friendly: dark sidebar (desktop) + bottom nav (mobile)

### `artifacts/api-server` — Express API Server
- Auth route: `POST /api/auth/login` — `{ mobile, name }` → `{ id, mobile, name }`
- Data routes: `/api/transactions`, `/api/categories`, `/api/budgets`, `/api/summary/*`
- All data routes read `x-user-id` header via `_helpers.ts:getUserId()` and filter by userId
- Import route: `POST /api/import/phonepe/preview|confirm` — tags imported transactions with userId

## Database Schema

- `users` — mobile (unique), name, created_at
- `categories` — shared/global, color, icon, type (income/expense/both)
- `transactions` — user_id (FK→users), amount, type, description, date, category_id
- `budgets` — user_id (FK→users), category_id, month (YYYY-MM), amount; unique on (user_id, category_id, month)

## Auth Flow

1. Login page collects name + 10-digit Indian mobile number
2. `POST /api/auth/login` creates user if new, returns `{ id, name, mobile }`
3. `UserProvider` stores user in localStorage and calls `setDefaultHeaders({ "x-user-id": String(id) })`
4. All subsequent API calls carry the header; routes filter data by userId
5. Each user sees only their own transactions/budgets — full data isolation

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (use psql directly if interactive prompt blocks)

## Gotchas

- DB push for constraint changes may prompt interactively — run SQL directly via psql instead
- `setDefaultHeaders` must be called before any API requests — happens in `UserProvider` init and on login
- Existing transactions with `user_id = NULL` are not shown to any logged-in user (correct behavior)
