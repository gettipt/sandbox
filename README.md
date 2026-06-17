# Sandbox Workspace

This folder is a `pnpm` monorepo used for sandboxed artifacts and supporting packages. It provides a full-stack Lightning 402 payment demo environment.

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

The sandbox provides a full-stack dev environment with a backend API and frontend client:

- **Server** (`@workspace/server`): Express + Drizzle backend serving `/api/*` endpoints.
- **Client** (`@workspace/client`): React/Vite frontend that consumes the API and integrates Lightning payment flows.
- **Shared libs**: `@workspace/api-spec` (OpenAPI contract), `@workspace/api-zod` (validation schemas), `@workspace/db` (database schema).

Project-level standardized commands:

- Server (`@workspace/server`): `dev`, `typecheck`, `build`, `preview`.
- Client (`@workspace/client`): `dev`, `typecheck`, `build`, `preview`.
- Shared libs (`@workspace/api-zod`, `@workspace/db`): `typecheck`, `build`.

## Running the Applications Locally

### Start the server first (proxies to upstream Replit deployment)

```bash
pnpm --filter @workspace/server run dev
```

The server will run on `http://localhost:5000`.

### Client (requires server running)

In a new terminal (after server is running):

```bash
pnpm --filter @workspace/client run dev
```

Vite will print the local URL. The app includes two experiments:

- `/vod` (Video On-Demand) - Requires the API server running
- `/sdk-demo` (SDK Payment Playground)

## Helpful package-level commands

```bash
pnpm --filter @workspace/api-spec run codegen
```

- `codegen`: regenerate API hooks and schemas from OpenAPI

## Troubleshooting

- If install fails with "Use pnpm instead", run with `pnpm` only (not npm/yarn).
- If API `dev` fails in PowerShell/CMD, run it in Git Bash/WSL or run `build` then `start` separately:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```
