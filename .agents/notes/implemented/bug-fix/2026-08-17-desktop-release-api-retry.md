# Agent Note: Desktop release API retry

Status: implemented

English | [中文](2026-08-17-desktop-release-api-retry.zh.md)

## Problem

The GitHub Release API can return a transient 503 after the Windows installer has been built, leaving a version tag without a published installer and requiring a manual workflow retry.

## Decision

The desktop release workflow retries the package-and-publish command up to three times. Each retry waits longer than the previous one before rebuilding and publishing again.

## Alternatives considered

**Publish from a local computer.** Local publication would depend on the release machine's credentials and remove the reproducible GitHub Actions release path.

**Retry only the API upload.** Electron Builder owns the release creation and asset upload sequence, so retrying its complete publish command preserves its state handling.

## Consequences

One release workflow can take longer during a GitHub API outage, but a transient failure no longer requires an operator to reopen GitHub Actions and rerun the job.
