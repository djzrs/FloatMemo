# FloatMemo 开发路线图（任务清单）

> 本文件是项目的**开发任务清单**，随开发进度持续更新。
> 状态图例：✅ 已完成 · 🔄 进行中 · ⬜ 未开始

## 总览

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 1 | 球窗展开速记（单 webview 方案） | ✅ | 已合并 master |
| 2 | 清理 lib.rs 临时调试代码 | ✅ | 已合并 master |
| 3 | 失焦自动收起速记条 | ✅ | 已合并 master |
| 4 | 单实例防多开 | ✅ | 已合并 master |
| 5 | 快捷键可自定义 | ✅ | 已合并 master |
| 6 | 球位置持久化（自由态） | ✅ | 已合并 master |
| 7 | SQLite FTS5 全文搜索 | 🔄 | 代码完成，待 GUI 验证 |
| 8 | Markdown 编辑与实时预览 | ✅ | 已合并 master |
| 9 | 提醒功能（到点通知） | ✅ | 已合并 master |
| 10 | 贴纸模式 | ✅ | 已合并 master |
| 11 | LICENSE (MIT) | ✅ | 已合并 master |
| 12 | README 中英双语 + gh-proxy 注明 | ✅ | 已合并 master |
| 13 | Issue / PR 模板 + Discussions | ✅ | 已合并 master |
| 14 | CI 门禁（fmt/clippy/test/Vitest） | ✅ | 已合并 master |
| 15 | tauri-plugin-updater 自更新 | ✅ | 已合并 master |
| 16 | 性能实测并写入 README | ⬜ | 下一步 |

## 未完成任务详情

### #7 SQLite FTS5 全文搜索（🔄 进行中）

**状态**：代码已完成并提交，仅剩 **GUI 端到端验证**。

**已实现**：
- `src/lib/db.ts`：`ensureFts()` 惰性创建 `notes_fts` 虚拟表；`ftsAvailable` 标志，引擎不支持时自动降级为内存过滤。
- 搜索逻辑：多关键词 AND 匹配，标题/正文/标签一起搜。

**待验证步骤**（需要桌面端运行）：
1. 让当前运行的 floatmemo 实例从托盘**优雅退出**（不要强杀，否则 WebView2 profile 会损坏）。
2. 若 WebView2 profile 已损坏（前端 JS 不执行），删除 `%LOCALAPPDATA%\app.floatmemo.desktop\EBWebView` 后重新启动。
3. 打开便签面板（`Ctrl+Shift+M`），在搜索框输入关键词，确认能搜到对应便签。
4. 验证多关键词（如「交互 待办」）能同时匹配。
5. 如一切正常，将 #7 标记完成。

---

### #16 性能实测并写入 README（⬜ 未开始）

**目标**：测量应用的实际资源占用，写入 README。

**建议测量项**：
- 空闲时内存占用（悬浮球贴边状态）
- 展开面板/速记条时的内存增量
- 启动耗时（冷启动/热启动）
- 1000 条便签下的搜索响应时间
- 提醒调度器的轮询开销验证（每 10 秒扫描，应无持续 CPU 占用）

**写入位置**：README.md / README.en.md 新增「性能」小节，附测量环境（Windows 版本、硬件）。

---

## 已完成任务索引（对应提交）

| 任务 | 功能分支 | 提交 | 合并提交 |
|------|---------|------|---------|
| #1-2 球窗速记/清理 | feat/tauri-shell | `2857968` | `1b81eb6` 前序 |
| #3-7 MVP 补全 | feat/mvp-3-7 | `5673196` | `1b81eb6` |
| #8 Markdown | feat/markdown-preview | `5abf10a` | `a33933d` |
| #9 提醒 | feat/reminders | `dc89cd0` | `e6e3efd` |
| #10 贴纸 | feat/sticker-mode | `1048d92` | `b932ffc` |
| #11-13 开源基建 | feat/ci-gates | `833a35a` | `e11a66e` |
| #14 CI 门禁 | feat/ci-gates | `a46c691` | `e11a66e` |
| #15 自更新 | feat/auto-update | `22d00b7` | `4be6ce5` |

## 开发环境注意事项（换机必读）

### 网络与 GitHub 推送
本机（Windows + 代理环境）HTTPS 推送 GitHub 会报 `CRYPT_E_NO_REVOCATION_CHECK`，**推送/拉取时加前缀**：

```bash
GIT_SSL_NO_VERIFY=true git push origin master
GIT_SSL_NO_VERIFY=true git pull origin master
```

- GitHub API 查询用 `curl -sk`（跳过证书验证）+ 代理。
- gh-proxy 只支持读取（clone/release/raw），**不支持 push**。
- 新机器请配置自己的 git 凭据（PAT 或 SSH）。

### npm 镜像源
```bash
NPM_CONFIG_REGISTRY=https://registry.npmmirror.com npm install <pkg>
```
（`--registry=` 参数在这台机器上会被忽略，要用环境变量）

### Rust 构建坑
- **ring 编译偶发卡死**：现象是 `cl.exe` 子进程 CPU≈0、线程 Suspended。别等待，终止后直接重试 `cargo build --release` 即可。
- release 构建约 3-5 分钟（LTO + codegen-units=1）。

### 自更新签名
- 私钥在 `~/.tauri/floatmemo.key`（**绝不入库**）。
- 公钥已写入 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`。
- 发布时需设置环境变量 `TAURI_SIGNING_PRIVATE_KEY`（GitHub Actions 用 Secrets 同名变量）。
- `latest.json` 由 GitHub 的 tauri-action 发布时自动生成。

### 单窗口架构铁律
所有界面（球/速记/菜单/面板/贴纸）共用 `label=ball` 窗口，**严禁新增 webview**（第二个 webview 在本机会停在 `about:blank` 变成透明挡点击层）。

## 版本记录

| 版本 | 内容 |
|------|------|
| 0.1.0 | 悬浮球 + 速记条 + 面板 MVP |
| 0.2.0 | SQLite 落盘、FTS5、Markdown、提醒、贴纸 |
| 0.2.1 | 开源基建、CI 门禁、自动更新 |

---
*最后更新：2026-10-27*