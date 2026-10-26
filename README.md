# FloatMemo · 浮笺

Windows 桌面悬浮便签。Tauri 2 + Rust + React 19，前端 Vite 7 + Tailwind CSS 4，数据存 SQLite。

一个常驻屏幕的悬浮球：单击速记、右键菜单、展开成完整便签面板。所有界面共用同一个 webview，靠窗口尺寸切换形态。

## 功能

- **悬浮球**：拖动定位，靠近屏幕边缘才磁吸（可在设置里关闭），静置 3 秒半隐藏，只露 6px
- **速记条**：单击球或 `Ctrl+Shift+N`，输入即存
- **右键菜单**：速记 / 打开面板 / 设置 / 退出
- **便签面板**：`Ctrl+Shift+M` 或托盘打开；增删改、置顶、归档、回收站、搜索筛选排序、网格/列表视图
- **设置中心**：默认颜色、卡片密度、动画、球透明度、半隐藏、自动吸附边缘、开机自启、JSON + Markdown 导入导出
- **数据落盘**：SQLite（`tauri-plugin-sql`），改动 500ms 防抖写入，退出前强制刷盘
- **MySQL 备份**：设置页填连接信息后可直连 MySQL 服务器，把全部便签备份到指定表（自动建库建表，同步删除远端已删除的行）
- **托盘常驻**：托盘可唤起/隐藏/退出；全局快捷键 `Ctrl+Shift+N` / `Ctrl+Shift+M`

## 开发

```bash
npm install
npm run dev          # 浏览器预览（数据走 localStorage）
npm run desktop      # Tauri 桌面开发模式
```

## 构建

```bash
npm run desktop:build
```

产物：

- `src-tauri/target/release/floatmemo.exe` —— 免安装版，前端资源已嵌入
- `src-tauri/target/release/bundle/nsis/FloatMemo_0.1.0_x64-setup.exe` —— 安装包

## 技术要点

- **单 webview 架构**：球 / 速记条 / 右键菜单 / 便签面板是同一窗口的四种形态。第二个 webview 在部分 Windows 环境下会停在 `about:blank`，变成一层看不见却挡点击的透明玻璃，因此坚持单窗口。
- **真圆形窗口**：Rust 侧 `SetWindowRgn` + `CreateEllipticRgn` 裁成圆形，方形透明区不再绘制也不吃点击。
- **自算位移拖动**：`startDragging()` 在部分环境不生效，改为前端算 `screenX/Y` 增量、调 `move_ball_by` 移动窗口。

## 目录

```
src/            React 前端
  components/   BallWindow（形态切换）、Ball、QuickNote、Panel、SettingsView
  lib/          desktop.ts（Tauri 命令封装）、db.ts（SQLite 读写）、mysql.ts（MySQL 备份）
  stores/       notes.ts（便签）、settings.ts（设置）
src-tauri/      Rust 窗口管理、托盘、快捷键、圆形裁剪、SQL 迁移、MySQL 备份
```
