# FloatMemo · 浮笺

> **中文** · [English](./README.en.md) · [开发路线图](./docs/ROADMAP.md)

Windows 桌面悬浮便签。Tauri 2 + Rust + React 19，前端 Vite 7 + Tailwind CSS 4，数据存 SQLite。

[![CI](https://github.com/djzrs/FloatMemo/actions/workflows/ci.yml/badge.svg)](https://github.com/djzrs/FloatMemo/actions/workflows/ci.yml)

一个常驻屏幕的悬浮球：单击速记、右键菜单、展开成完整便签面板。所有界面共用同一个 webview，靠窗口尺寸切换形态。

## 功能

- **悬浮球**：拖动定位，靠近屏幕边缘才磁吸（可在设置里关闭），静置 3 秒半隐藏，只露 6px；位置持久化，重启后还原
- **速记条**：单击球或 `Ctrl+Shift+N`，输入即存，失焦自动收起
- **右键菜单**：速记 / 打开面板 / 设置 / 退出
- **便签面板**：`Ctrl+Shift+M` 或托盘打开；增删改、置顶、归档、回收站、搜索筛选排序、网格/列表视图
- **全文搜索**：SQLite FTS5 全文检索，多关键词 AND 匹配，标题/正文/标签一起搜
- **Markdown 编辑**：编辑 / 分栏 / 预览三态切换（`Ctrl+Shift+P`），实时渲染 GFM（表格、任务列表、删除线）
- **提醒**：给便签设定时间，到点弹系统通知；重启不重复提醒
- **贴纸模式**：把便签「钉」在桌面上——无边框置顶小窗，可拖动摆放、可点击穿透
- **设置中心**：默认颜色、卡片密度、动画、球透明度、半隐藏、自动吸附边缘、快捷键自定义、开机自启、JSON + Markdown 导入导出
- **数据落盘**：SQLite（`tauri-plugin-sql`），改动 500ms 防抖写入，退出前强制刷盘
- **MySQL 备份**：设置页填连接信息后可直连 MySQL 服务器，把全部便签备份到指定表（自动建库建表，同步删除远端已删除的行）；支持 TLS（适配 TiDB Cloud 强制加密）
- **托盘常驻**：托盘可唤起/隐藏/退出；全局快捷键 `Ctrl+Shift+N` / `Ctrl+Shift+M` 可自定义
- **单实例**：防多开，第二个实例会唤醒已有窗口
- **自动更新**：设置页「检查更新」，从 GitHub Releases 拉取新版本并静默安装

## 开发

```bash
npm install
npm run dev          # 浏览器预览（数据走 localStorage）
npm run desktop      # Tauri 桌面开发模式
npm run test         # 前端单元测试（Vitest）
npm run typecheck    # 前端类型检查
```

Rust 侧门禁（需 Rust 工具链）：

```bash
cd src-tauri
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test            # MySQL 集成测试需要本地 MySQL（见 tests/mysql_backup.rs 环境变量）
```

## 构建

```bash
npm run desktop:build
```

产物：

- `src-tauri/target/release/floatmemo.exe` —— 免安装版，前端资源已嵌入
- `src-tauri/target/release/bundle/nsis/FloatMemo_0.2.1_x64-setup.exe` —— 安装包
- `latest.json` + `*.sig` —— 自动更新清单与签名（需配置签名密钥才会生成）

> 自更新签名：首次打包前生成密钥 `npm run tauri signer generate -- -w ~/.tauri/floatmemo.key`，
> 公钥写入 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`；构建时设置环境变量
> `TAURI_SIGNING_PRIVATE_KEY`（私钥路径或内容）与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（如有密码）。
> 私钥请妥善保存，丢失后将无法再发布更新。

## 技术要点

- **单 webview 架构**：球 / 速记条 / 右键菜单 / 便签面板 / 贴纸是同一窗口的五种形态。第二个 webview 在部分 Windows 环境下会停在 `about:blank`，变成一层看不见却挡点击的透明玻璃，因此坚持单窗口。
- **真圆形窗口**：Rust 侧 `SetWindowRgn` + `CreateEllipticRgn` 裁成圆形，方形透明区不再绘制也不吃点击。
- **自算位移拖动**：`startDragging()` 在部分环境不生效，改为前端算 `screenX/Y` 增量、调 `move_ball_by` 移动窗口。
- **FTS5 全文搜索**：`notes_fts` 虚拟表惰性创建；引擎不支持时自动降级为内存过滤，不阻塞主流程。
- **提醒调度**：前端定时器每 10 秒扫描，已通知记录持久化，重启不重复轰炸。
- **贴纸点击穿透**：`set_ignore_cursor_events` 整窗穿透，穿透后从托盘「退出贴纸」恢复。

## 开源与加速

- 项目采用 **MIT License**，见 [LICENSE](./LICENSE)。
- 国内访问 GitHub 时，可用 [gh-proxy](https://gh-proxy.org/) 加速克隆与下载 Release 资产（仅支持读取操作，push 请直连或使用代理）：
  ```bash
  git clone https://gh-proxy.org/https://github.com/djzrs/FloatMemo.git
  ```
- 桌面端 `tauri build` 打包时需要从 GitHub 下载 NSIS 等工具，如遇 TLS 中断，可先用 gh-proxy 手动下载 `nsis-3.13.zip` 放到 `%LOCALAPPDATA%\tauri\NSIS\`。

## 目录

```
src/            React 前端
  components/   BallWindow（形态切换）、Ball、QuickNote、Panel、SettingsView、StickerNote
  lib/          desktop.ts（Tauri 命令封装）、db.ts（SQLite 读写 + FTS5）、reminders.ts（提醒）、mysql.ts（MySQL 备份）
  stores/       notes.ts（便签）、settings.ts（设置）
src-tauri/      Rust 窗口管理、托盘、快捷键、圆形裁剪、SQL 迁移、贴纸、MySQL 备份
```