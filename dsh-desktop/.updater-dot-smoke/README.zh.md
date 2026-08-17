# DSH Desktop

[English](README.md) | 中文

第一阶段桌面外壳面向本地 DeepSeek Harness 检出目录。Electron 进程会在 `127.0.0.1` 的系统分配端口启动已构建的 DSH CLI，并在隔离的渲染器中显示现有 Web UI。

## 从检出目录运行

父目录 `DeepSeek Harness` 必须已经完成 `pnpm run build`，且 `PATH` 中的 `node` 必须满足 DSH 的 Node.js 版本要求。

```powershell
corepack pnpm --dir "D:\DeepSeek Harness\dsh-desktop" install
corepack pnpm --dir "D:\DeepSeek Harness\dsh-desktop" start
```

如果 pnpm 在首次安装时报告跳过构建脚本，请批准两个本地桌面依赖一次，然后再次安装：

```powershell
corepack pnpm --dir "D:\DeepSeek Harness\dsh-desktop" approve-builds electron esbuild
corepack pnpm --dir "D:\DeepSeek Harness\dsh-desktop" install
```

`DSH_ENGINE_DIR` 可选地将桌面外壳指向另一个已构建的 DeepSeek Harness 检出目录。`DSH_NODE_EXECUTABLE` 可选地指定引擎使用的 Node.js 可执行文件。启动器会把 DSH 用户数据保存在 Electron 的每用户应用数据目录中，且不会向嵌入的 Web UI 暴露 Node.js API。

## 创建便携 Windows 应用

先构建父检出目录，再创建自包含的 Windows x64 文件夹：

```powershell
cd "D:\DeepSeek Harness\dsh-desktop"
npm run package:win
```

打开 `release\DSH Desktop-win32-x64\DSH Desktop.exe`。该文件夹包含 Electron、Node.js 和生产 DSH 依赖闭包；移动时请保持其中内容完整。便携应用不需要源码检出目录或系统 Node.js 安装。

## 创建 Windows 安装程序

先构建便携文件夹，再创建 NSIS 安装程序：

```powershell
cd "D:\DeepSeek Harness\dsh-desktop"
npm run package:installer
```

安装程序写入 `release-installer\DSH Desktop-Setup-<version>.exe`。默认提供当前用户安装、桌面和开始菜单快捷方式以及卸载功能。该本地命令有意不配置更新源。

## 发布 GitHub 更新

使用由你控制的 GitHub 仓库发布桌面版本。不要把更新器指向上游 DeepSeek Harness 仓库：其发布物不承诺采用本客户端的安装程序格式。

一次性本地发布时，将 `DSH_DESKTOP_UPDATE_REPOSITORY` 设为 `owner/repository`，将 `GH_TOKEN` 设为可创建发布的令牌，然后运行：

```powershell
$env:DSH_DESKTOP_UPDATE_REPOSITORY = "owner/repository"
$env:GH_TOKEN = "github-token"
npm run release:github
```

常规发布时，把本项目放入该 GitHub 仓库并推送 `dsh-desktop-v*` 标签。`Release DSH Desktop` 工作流会构建安装程序、发布它并上传更新元数据。已安装的构建会在启动时检查该更新源；用户需要分别确认下载和重启。除非另行配置经过身份验证的私有发布访问，否则请保持发布仓库公开。

## 桌面范围

- 启动和停止本地 DSH Web 引擎。
- 使用系统分配的回环端口，而非端口 3080。
- 显示引擎启动失败，并允许重试。
- 强制 Electron 渲染器隔离：启用 sandbox 和 context isolation，禁用 Node integration。
- 为 Windows x64 生成 NSIS 安装程序。
- 检查已配置的 GitHub Releases 更新源，并仅在用户确认后安装。
- 不提供代码签名或私有发布身份验证。
