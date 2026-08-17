# Agent Note: Win32 directory picker UTF-16 paths

Status: implemented

English | [中文](2026-08-17-win32-directory-picker-utf16-paths.zh.md)

## Problem

The Win32 folder picker reads the UTF-16 result returned by `IFileOpenDialog`. A pathname can contain a UTF-16LE code unit whose first byte is zero, causing byte-wise terminator detection to truncate the selected directory before the workspace registry validates it.

## Decision

`readUtf16()` stops only at a complete UTF-16LE NUL code unit. The binding test covers a selected path containing `开` (`U+5F00`), whose UTF-16LE encoding begins with a zero byte.

## Alternatives considered

**Reject non-ASCII workspace paths.** Windows supplies filesystem paths as UTF-16 and the picker is expected to preserve the selected directory, so a character restriction would discard valid user paths.

**Use an ANSI conversion.** An ANSI conversion would depend on the host code page and cannot preserve every Windows pathname.

## Consequences

Windows workspace selection accepts directory names containing UTF-16 characters with a zero low byte. The raw UTF-16 scan remains bounded by the existing 32 KiB native buffer.
