# DSH Desktop

Phase 1 desktop shell for a local DeepSeek Harness checkout. The Electron process starts the already-built DSH CLI on `127.0.0.1` with an OS-assigned port and shows the existing Web UI inside an isolated renderer.

## Run from this checkout

The parent `DeepSeek Harness` directory must already have completed `pnpm run build`, and `node` on `PATH` must satisfy DSH's Node.js version requirement.

```powershell
corepack pnpm --dir "D:\DeepSeek Harness\dsh-desktop" install
corepack pnpm --dir "D:\DeepSeek Harness\dsh-desktop" start
```

If pnpm reports skipped build scripts on the first installation, approve the
two local desktop dependencies once and install again:

```powershell
corepack pnpm --dir "D:\DeepSeek Harness\dsh-desktop" approve-builds electron esbuild
corepack pnpm --dir "D:\DeepSeek Harness\dsh-desktop" install
```

`DSH_ENGINE_DIR` optionally points the desktop shell at another built DeepSeek Harness checkout. `DSH_NODE_EXECUTABLE` optionally names the Node.js executable used for the engine. The launcher stores DSH user data under Electron's per-user application-data directory and never exposes Node.js APIs to the embedded Web UI.

## Create a portable Windows app

Build the parent checkout first, then create a self-contained Windows x64 folder:

```powershell
cd "D:\DeepSeek Harness\dsh-desktop"
npm run package:win
```

Open `release\DSH Desktop-win32-x64\DSH Desktop.exe`. The folder contains Electron, Node.js, and the production DSH dependency closure; keep its contents together when moving it. The portable app does not require the source checkout or a system Node.js installation.

## Phase 1 scope

- Starts and stops a local DSH Web engine.
- Uses an OS-assigned loopback port rather than port 3080.
- Shows engine startup failures and allows a retry.
- Enforces Electron renderer isolation: sandbox on, context isolation on, Node integration off.

Code signing, encrypted credential storage, an installer, and the release updater belong to later milestones.
