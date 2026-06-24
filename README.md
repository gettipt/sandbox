# Sandbox Workspace

This folder is a `pnpm` monorepo used for sandboxed artifacts and supporting packages. It provides a Lightning 402 payment demo environment.

## Prerequisites

- Node.js 24.x
- pnpm 10+
- A bash-like shell on Windows (Git Bash/WSL) is recommended

**Notes:**
- The workspace enforces `pnpm` via a preinstall check.
- Some scripts (for example the API server `dev` script) use shell syntax that works best in bash.
- This project was originally developed in Replit but can run entirely locally.

## Setup

From this folder:

```bash
cd sandbox
pnpm install
```

## Build Process

Run from `sandbox/`:

```bash
pnpm run typecheck
pnpm run build
```

- `typecheck`: validates shared libs and selected workspace packages.
- `build`: runs `typecheck` first, then runs package `build` scripts recursively.

## Architecture

The sandbox currently runs as a client-first app that calls the hosted MPP API directly:

- **Client** (`@workspace/client`): React/Vite frontend that calls `https://mppapi.replit.app/api` and integrates Lightning payment flows.
- **Server** (`@workspace/server`): Optional local proxy/service layer for local experiments.
- **Shared libs**: `@workspace/api-spec` (OpenAPI contract), `@workspace/api-zod` (validation schemas), `@workspace/db` (database schema).

Project-level standardized commands:

- Server (`@workspace/server`): `dev`, `typecheck`, `build`, `preview`.
- Client (`@workspace/client`): `dev`, `typecheck`, `build`, `preview`.
- Shared libs (`@workspace/api-zod`, `@workspace/db`): `typecheck`, `build`.

## Running the Application Locally

### Client

The client works standalone and calls the hosted API directly by default:

```bash
pnpm --filter @workspace/client run dev
```

Vite will print the local URL. The app includes two experiments:

- `/vod` (Video On-Demand)
- `/sdk-demo` (SDK Payment Playground)

Optional: override the API base URL for client builds/runs:

```bash
VITE_API_BASE_URL=https://mppapi.replit.app/api
```

### Optional local server

If you still want to run the local server package:

```bash
pnpm --filter @workspace/server run dev
```

The server runs on `http://localhost:5000`.

## Deploying To Vercel

This repo is configured for frontend-only deployment on Vercel.

1. Import the repository into Vercel.
2. Keep the project root at `sandbox/`.
3. Ensure the build command is `pnpm --filter @workspace/client run build`.
4. Ensure output directory is `artifacts/client/dist`.
5. Set `VITE_API_BASE_URL` only if you need a non-default API host.

The included `vercel.json` handles SPA rewrites so routes like `/vod` work on refresh.

## Helpful package-level commands

```bash
pnpm --filter @workspace/api-spec run codegen
```

- `codegen`: regenerate API hooks and schemas from OpenAPI

## Troubleshooting

- If install fails with "Use pnpm instead", run with `pnpm` only (not npm/yarn).
- If server `dev` fails in PowerShell/CMD, run it in Git Bash/WSL or run `build` then `start` separately:

```bash
pnpm --filter @workspace/server run build
pnpm --filter @workspace/server run start
```
