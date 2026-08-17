# Agent Note: Win32 目录选择器 UTF-16 路径

Status: implemented

[English](2026-08-17-win32-directory-picker-utf16-paths.md) | 中文

## Problem

Win32 文件夹选择器读取 `IFileOpenDialog` 返回的 UTF-16 结果。路径可能含有 UTF-16LE 码元，其第一个字节为零，导致按字节检测终止符时截断已选择的目录，随后工作区注册表会拒绝该路径。

## Decision

`readUtf16()` 仅在完整 UTF-16LE NUL 码元处停止。绑定测试覆盖包含 `开`（`U+5F00`）的选中路径；该字符的 UTF-16LE 编码以零字节开始。

## Alternatives considered

**拒绝非 ASCII 工作区路径。** Windows 以 UTF-16 提供文件系统路径，选择器应保留已选择的目录；限制字符会拒绝合法的用户路径。

**使用 ANSI 转换。** ANSI 转换依赖主机代码页，无法保留每一个 Windows 路径。

## Consequences

Windows 工作区选择支持包含低字节为零的 UTF-16 字符的目录名。原始 UTF-16 扫描仍受现有 32 KiB 原生缓冲区限制。
