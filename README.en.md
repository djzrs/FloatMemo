# FloatMemo

> [中文](./README.md) · **English** · [Roadmap](./docs/ROADMAP.md)

A Windows desktop sticky-note app. Tauri 2 + Rust + React 19, built with Vite 7 + Tailwind CSS 4, data stored in SQLite.

[![CI](https://github.com/djzrs/FloatMemo/actions/workflows/ci.yml/badge.svg)](https://github.com/djzrs/FloatMemo/actions/workflows/ci.yml)

A small floating ball lives on the edge of your screen: click to jot a note, right-click for the menu, or expand it into a full notes panel. All surfaces share a single webview — the window just resizes between modes.

## Features

- **Floating ball**: drag to position, magnetic snap near screen edges (can be disabled), auto-hide to a 6px edge after 3s idle; position persists across restarts
- **Quick note**: click the ball or press `Ctrl+Shift+N`, type and it's saved; auto-collapses on blur
- **Context menu**: quick note / open panel / settings / quit
- **Notes panel**: `Ctrl+Shift+M` or from tray; CRUD, pin, archive, trash, search/filter/sort, grid & list views
- **Full-text search**: SQLite FTS5 across title, content and tags, multi-keyword AND matching
- **Markdown editing**: edit / split / preview modes (`Ctrl+Shift+P`), live GFM rendering (tables, task lists, strikethrough)
- **Reminders**: set a time on a note, get a system notification when it's due; no duplicate alerts after restart
- **Sticker mode**: "pin" a note to the desktop as a borderless always-on-top mini window — draggable, with click-through support
- **Settings**: default color, card density, animations, ball opacity, auto-hide, edge snap, customizable shortcuts, autostart, JSON + Markdown import/export
- **SQLite persistence**: `tauri-plugin-sql`, 500ms debounced writes, forced flush on exit
- **MySQL backup**: connect to a MySQL server and back up all notes to a table (auto-create DB/table, sync deletions); TLS supported (works with TiDB Cloud's mandatory encryption)
- **Tray resident**: show/hide/quit from tray; global shortcuts `Ctrl+Shift+N` / `Ctrl+Shift+M` customizable
- **Single instance**: prevents duplicate launches, second launch wakes the existing window
- **Auto-update**: "Check for updates" in Settings, pulls new versions from GitHub Releases and installs silently

## Development

```bash
npm install
npm run dev          # browser preview (data in localStorage)
npm run desktop      # Tauri desktop dev mode
npm run test         # frontend unit tests (Vitest)
npm run typecheck    # frontend type check
```

Rust-side gates (requires the Rust toolchain):

```bash
cd src-tauri
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test            # MySQL integration test needs a local MySQL (see env vars in tests/mysql_backup.rs)
```

## Build

```bash
npm run desktop:build
```

Artifacts:

- `src-tauri/target/release/floatmemo.exe` — portable build with embedded frontend
- `src-tauri/target/release/bundle/nsis/FloatMemo_0.2.1_x64-setup.exe` — installer
- `latest.json` + `*.sig` — auto-update manifest & signatures (generated only when signing keys are configured)

> Updater signing: before the first release, generate keys with
> `npm run tauri signer generate -- -w ~/.tauri/floatmemo.key`, write the public key into
> `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`; when building, set
> `TAURI_SIGNING_PRIVATE_KEY` (path or content) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (if any).
> Keep the private key safe — losing it means you can never ship another update.

## Technical highlights

- **Single-webview architecture**: ball / quick note / menu / panel / sticker are five modes of the same window. A second webview can stall at `about:blank` on some Windows setups — an invisible, click-blocking glass layer — so we stay single-window.
- **True circular window**: `SetWindowRgn` + `CreateEllipticRgn` crops the ball into a real circle, so the transparent square area neither renders nor blocks clicks.
- **Custom drag math**: `startDragging()` is unreliable in some environments; the frontend computes `screenX/Y` deltas and calls `move_ball_by` to move the window.
- **FTS5 search**: `notes_fts` virtual table is created lazily; falls back to in-memory filtering if the engine lacks FTS5.
- **Reminder scheduler**: a frontend timer scans every 10s; notified records are persisted so you never get duplicate alerts.
- **Sticker click-through**: `set_ignore_cursor_events` makes the whole window click-through; restore from the tray's "Exit sticker" item.

## Open source & acceleration

- Licensed under the **MIT License** — see [LICENSE](./LICENSE).
- In regions with slow GitHub access, [gh-proxy](https://gh-proxy.org/) can accelerate cloning and Release downloads (read-only; use a proxy for push):
  ```bash
  git clone https://gh-proxy.org/https://github.com/djzrs/FloatMemo.git
  ```
- `tauri build` downloads NSIS from GitHub; if TLS is interrupted, manually fetch `nsis-3.13.zip` via gh-proxy into `%LOCALAPPDATA%\tauri\NSIS\`.

## Structure

```
src/            React frontend
  components/   BallWindow (mode switching), Ball, QuickNote, Panel, SettingsView, StickerNote
  lib/          desktop.ts (Tauri command wrappers), db.ts (SQLite + FTS5), reminders.ts, mysql.ts
  stores/       notes.ts (notes), settings.ts (settings)
src-tauri/      Rust: window management, tray, shortcuts, circular cropping, SQL migrations, sticker, MySQL backup
```