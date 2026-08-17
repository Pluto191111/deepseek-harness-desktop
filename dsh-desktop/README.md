# Deepsee HARNESS

English | [中文](README.zh.md)

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

Open `release\win-unpacked\Deepsee HARNESS.exe`. The folder contains Electron, Node.js, and the production DSH dependency closure; keep its contents together when moving it. The portable app does not require the source checkout or a system Node.js installation.

## Create a Windows installer

Create an NSIS installer:

```powershell
cd "D:\DeepSeek Harness\dsh-desktop"
npm run package:installer
```

The installer is written to `release\Deepsee HARNESS-Setup-<version>.exe`. It offers a per-user installation by default, desktop and Start menu shortcuts, and uninstallation. This local command intentionally has no update feed.

## Publish GitHub updates

Use a GitHub repository you control for the desktop releases. Do not point the updater at the upstream DeepSeek Harness repository: its releases do not promise this client's installer format.

For a one-time local release, set `DSH_DESKTOP_UPDATE_REPOSITORY` to `owner/repository` and set `GH_TOKEN` to a token that can create releases, then run:

```powershell
$env:DSH_DESKTOP_UPDATE_REPOSITORY = "owner/repository"
$env:GH_TOKEN = "github-token"
npm run release:github
```

For regular releases, put this project in that GitHub repository and push a `v*` tag. The `Release Deepsee HARNESS` workflow builds the installer, publishes it, and uploads the update metadata. Installed builds check this feed at startup; the user approves both download and restart. Keep the release repository public unless you separately configure authenticated private-release access.

## Desktop scope

- Starts and stops a local DSH Web engine.
- Uses an OS-assigned loopback port rather than port 3080.
- Shows engine startup failures and allows a retry.
- Enforces Electron renderer isolation: sandbox on, context isolation on, Node integration off.

- Produces an NSIS installer for Windows x64.
- Checks a configured GitHub Releases feed and installs only after user confirmation.
- Does not provide code signing or private-release authentication.
