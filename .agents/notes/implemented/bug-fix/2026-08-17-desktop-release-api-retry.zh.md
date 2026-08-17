# Agent Note: 桌面端发布 API 重试

Status: implemented

[English](2026-08-17-desktop-release-api-retry.md) | 中文

## Problem

Windows 安装包构建完成后，GitHub Release API 可能返回临时 503，导致版本标签没有已发布的安装包，并需要人工重跑工作流。

## Decision

桌面端发布工作流最多重试三次打包和发布命令。每次重试前的等待时间比上一次更长，然后重新构建并发布。

## Alternatives considered

**从本地电脑发布。** 本地发布依赖发布机器的凭据，并会放弃可复现的 GitHub Actions 发布路径。

**仅重试 API 上传。** Electron Builder 负责创建 Release 和上传资源的完整顺序，重试其完整发布命令可保留其状态处理。

## Consequences

GitHub API 故障期间，一次发布工作流可能耗时更长，但临时失败不再要求操作者重新打开 GitHub Actions 并手动重跑任务。
