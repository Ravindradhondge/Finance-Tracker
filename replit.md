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
- Pages: `/` (dashboard), `/transactions`, `/budgets`, `/categories`
- Uses `@workspace/api-client-react` for API hooks
- Warm cream + sage green theme, DM Sans + Playfair Display fonts
- Month navigation context via `src/hooks/use-month.tsx`

### `artifacts/api-server` — Express API Server
- Routes: `/api/transactions`, `/api/categories`, `/api/budgets`, `/api/summary/*`
- Summary routes: `/api/summary/monthly`, `/api/summary/categories`, `/api/summary/trends`, `/api/summary/recent`

## Database Schema

- `categories` — income/expense/both categories with color and icon
- `transactions` — individual income or expense entries with date, amount, description, category
- `budgets` — monthly per-category spending limits (unique on category_id + month)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.
- `pnpm --filter @workspace/db run push` — sync schema to DB
- `pnpm --filter @workspace/db run push-force` — force sync if conflicts

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Run codegen: `pnpm --filter @workspace/api-spec run codegen`
