use std::sync::Mutex;

pub mod mysql;
pub use mysql as mysql_backend;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, ShortcutState};

const BALL: &str = "ball";

/// 悬浮球窗口边长（球体 54 + 阴影留白）
const BALL_WIN: f64 = 74.0;
/// 球体半径（54 / 2）
const BALL_RADIUS: f64 = 27.0;
/// 圆形裁剪在球体之外额外留出的余量（容纳光晕与投影）
const REGION_PAD: f64 = 13.0;
/// 磁吸感应距离：球心离边缘多近才吸附（否则停在原地）
const SNAP_ZONE: f64 = 56.0;
/// 展开为速记条时的窗口尺寸（输入条 + 颜色行）
const QUICK_W: f64 = 520.0;
const QUICK_H: f64 = 180.0;
/// 展开为右键菜单时的窗口尺寸（菜单 228 + 球 74 + 间距）
const MENU_W: f64 = 320.0;
const MENU_H: f64 = 372.0;
/// 展开为便签面板时的窗口尺寸
const PANEL_W: f64 = 1080.0;
const PANEL_H: f64 = 720.0;
/// 贴纸模式：钉在桌面上的便签卡片尺寸
const STICKER_W: f64 = 340.0;
const STICKER_H: f64 = 260.0;

/// SQLite 数据库名（插件会放到应用数据目录）
const DB_URL: &str = "sqlite:floatmemo.db";

const SQL_CREATE_NOTES: &str = "
CREATE TABLE IF NOT EXISTS notes (
  id          TEXT    PRIMARY KEY NOT NULL,
  title       TEXT    NOT NULL,
  content     TEXT    NOT NULL,
  color       TEXT    NOT NULL,
  tags        TEXT    NOT NULL DEFAULT '[]',
  pinned      INTEGER NOT NULL DEFAULT 0,
  archived    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);";

const SQL_INDEX_NOTES: &str =
    "CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes (updated_at DESC);";

const SQL_ADD_REMIND_AT: &str =
    "ALTER TABLE notes ADD COLUMN remind_at INTEGER;";

/// 悬浮球停靠的边
#[derive(Clone, Copy, PartialEq, Eq)]
enum Edge {
    Left,
    Right,
    Top,
    Bottom,
}

/// 最近的边：决定半隐藏方向与展开方向
static EDGE: Mutex<Edge> = Mutex::new(Edge::Right);
/// 沿边方向的坐标（上下边记 x，左右边记 y）
static ALONG: Mutex<Option<i32>> = Mutex::new(None);
/// 是否吸附在边上；false = 停在屏幕任意位置
static DOCKED: Mutex<bool> = Mutex::new(true);
/// 未吸附时的自由位置
static POS: Mutex<Option<PhysicalPosition<i32>>> = Mutex::new(None);

fn edge() -> Edge {
    EDGE.lock().map(|g| *g).unwrap_or(Edge::Right)
}

fn set_edge(e: Edge) {
    if let Ok(mut g) = EDGE.lock() {
        *g = e
    }
}

fn along() -> Option<i32> {
    ALONG.lock().ok().and_then(|g| *g)
}

fn set_along(v: Option<i32>) {
    if let Ok(mut g) = ALONG.lock() {
        *g = v
    }
}

fn docked() -> bool {
    DOCKED.lock().map(|g| *g).unwrap_or(true)
}

fn set_docked(v: bool) {
    if let Ok(mut g) = DOCKED.lock() {
        *g = v
    }
}

fn free_pos() -> Option<PhysicalPosition<i32>> {
    POS.lock().ok().and_then(|g| *g)
}

fn set_free_pos(v: Option<PhysicalPosition<i32>>) {
    if let Ok(mut g) = POS.lock() {
        *g = v
    }
}

/// 显示器物理矩形
struct Rect {
    x: i32,
    y: i32,
    w: i32,
    h: i32,
}

fn screen_rect(window: &WebviewWindow) -> Option<Rect> {
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten())?;
    let p = monitor.position();
    let s = monitor.size();
    Some(Rect {
        x: p.x,
        y: p.y,
        w: s.width as i32,
        h: s.height as i32,
    })
}

fn scale_of(window: &WebviewWindow) -> f64 {
    window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten())
        .map(|m| m.scale_factor())
        .unwrap_or(1.0)
}

fn monitor_of(window: &WebviewWindow) -> Option<(f64, f64)> {
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten())?;
    let scale = monitor.scale_factor();
    let size = monitor.size().to_logical::<f64>(scale);
    Some((size.width, size.height))
}

fn along_value(v: Option<i32>, min: i32, max: i32) -> i32 {
    let hi = max.max(min);
    match v {
        Some(x) => x.clamp(min, hi),
        None => (min + hi) / 2,
    }
}

/// 球窗贴在某条边上的窗口坐标（hidden = 半隐藏，只露出 6px）
/// 球体在窗口内占 10..64（逻辑），所以贴右时窗口左边 = 右边缘 - 76。
fn slot(window: &WebviewWindow, e: Edge, hidden: bool, along: Option<i32>) -> Option<PhysicalPosition<i32>> {
    let r = screen_rect(window)?;
    let s = scale_of(window);
    let px = |v: f64| (v * s).round() as i32;
    let span = px(BALL_WIN);
    // 半隐藏时球体只剩 6px 在屏幕内
    let peek = px(6.0);
    let out = px(58.0);
    let inset = px(16.0);
    let (x, y) = match e {
        Edge::Left => (
            r.x - if hidden { out } else { 0 },
            along_value(along, r.y, r.y + r.h - span),
        ),
        Edge::Right => (
            r.x + r.w - if hidden { inset } else { px(76.0) },
            along_value(along, r.y, r.y + r.h - span),
        ),
        Edge::Top => (
            along_value(along, r.x, r.x + r.w - px(76.0)),
            r.y - if hidden { out } else { 0 },
        ),
        Edge::Bottom => (
            along_value(along, r.x, r.x + r.w - px(76.0)),
            r.y + r.h - if hidden { inset } else { px(74.0) },
        ),
    };
    let _ = peek;
    Some(PhysicalPosition::new(x, y))
}

/// 把球窗摆好：吸附态按边计算，自由态停在原处（自由位置没有边可藏）
fn place_ball(window: &WebviewWindow, hidden: bool) {
    if docked() {
        if let Some(pos) = slot(window, edge(), hidden, along()) {
            let _ = window.set_position(pos);
        }
    } else if let Some(pos) = free_pos() {
        if !hidden {
            let _ = window.set_position(pos);
        }
    }
}

/// 收起成悬浮球：恢复 74×74、回到停靠边并恢复置顶
fn reset_ball(window: &WebviewWindow) {
    let _ = window.set_size(tauri::LogicalSize::new(BALL_WIN, BALL_WIN));
    place_ball(window, false);
    let _ = window.set_always_on_top(true);
    set_ball_region(window);
}

/// 把球窗裁成圆形：只有球周围一圈可见可点，
/// 方形透明区域（含被 Windows 强制撑出的 136px 宽度）不再挡住下面的窗口。
#[cfg(windows)]
fn set_ball_region(window: &WebviewWindow) {
    use windows::Win32::Graphics::Gdi::{CreateEllipticRgn, SetWindowRgn};

    if let Ok(hwnd) = window.hwnd() {
        let s = scale_of(window);
        let px = |v: f64| (v * s).round() as i32;
        // 球心在窗口内 37 逻辑（球体 10..64），半径 = 球 27 + 13 的光晕/投影余量
        let c = px(BALL_WIN / 2.0);
        let r = px(BALL_RADIUS + REGION_PAD);
        unsafe {
            let rgn = CreateEllipticRgn(c - r, c - r, c + r, c + r);
            let _ = SetWindowRgn(hwnd, Some(rgn), true);
        }
    }
}

/// 展开成速记/菜单/面板时取消裁剪，恢复矩形窗口
#[cfg(windows)]
fn clear_window_region(window: &WebviewWindow) {
    use windows::Win32::Graphics::Gdi::SetWindowRgn;

    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            let _ = SetWindowRgn(hwnd, None, true);
        }
    }
}

#[cfg(not(windows))]
fn set_ball_region(_window: &WebviewWindow) {}

#[cfg(not(windows))]
fn clear_window_region(_window: &WebviewWindow) {}

fn nearest_edge(r: &Rect, cx: i32, cy: i32) -> Edge {
    let d = [
        (Edge::Left, (cx - r.x).abs()),
        (Edge::Right, (r.x + r.w - cx).abs()),
        (Edge::Top, (cy - r.y).abs()),
        (Edge::Bottom, (r.y + r.h - cy).abs()),
    ];
    d.into_iter()
        .min_by_key(|(_, dist)| *dist)
        .map(|(e, _)| e)
        .unwrap_or(Edge::Right)
}

/// 拖动中：按鼠标位移移动球窗（dx/dy 为 CSS 像素，内部换算成物理像素）
#[tauri::command]
fn move_ball_by(app: AppHandle, dx: f64, dy: f64) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    let s = scale_of(&ball);
    let pos = ball.outer_position().map_err(|e| e.to_string())?;
    let nx = pos.x + (dx * s).round() as i32;
    let ny = pos.y + (dy * s).round() as i32;
    // 留一点余量，允许球被拖到屏幕外一点点，但别整个消失
    let limit = if let Some(r) = screen_rect(&ball) {
        let span = (BALL_WIN * s).round() as i32;
        (
            nx.clamp(r.x - span, r.x + r.w - 8),
            ny.clamp(r.y - span, r.y + r.h - 8),
        )
    } else {
        (nx, ny)
    };
    ball.set_position(PhysicalPosition::new(limit.0, limit.1))
        .map_err(|e| e.to_string())
}

fn edge_distance(e: Edge, r: &Rect, cx: i32, cy: i32) -> i32 {
    match e {
        Edge::Left => cx - r.x,
        Edge::Right => r.x + r.w - cx,
        Edge::Top => cy - r.y,
        Edge::Bottom => r.y + r.h - cy,
    }
}

/// 拖动结束：靠近边缘才吸附（磁吸），否则停在松手的位置。
/// enabled=false 时完全不吸附，球可以停在屏幕任意位置。
#[tauri::command]
fn snap_ball(app: AppHandle, enabled: bool) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    let pos = ball.outer_position().map_err(|e| e.to_string())?;
    let r = screen_rect(&ball).ok_or_else(|| "拿不到显示器".to_string())?;
    let s = scale_of(&ball);
    let half = (BALL_WIN / 2.0 * s).round() as i32;
    let cx = pos.x + half;
    let cy = pos.y + half;
    let e = nearest_edge(&r, cx, cy);
    let along_v = match e {
        Edge::Left | Edge::Right => pos.y,
        Edge::Top | Edge::Bottom => pos.x,
    };
    set_edge(e);
    let near = edge_distance(e, &r, cx, cy) <= (SNAP_ZONE * s).round() as i32;
    if enabled && near {
        set_docked(true);
        set_along(Some(along_v));
        set_free_pos(None);
        place_ball(&ball, false);
    } else {
        set_docked(false);
        set_free_pos(Some(pos));
        let _ = ball.set_position(pos);
    }
    // 通知前端记住当前位置（自由态存下来，重启后还原）
    let pos = free_pos().map(|p| (p.x, p.y));
    let _ = app.emit("floatmemo://ball-pos", (docked(), pos));
    Ok(())
}

/// 启动时按设置还原球的位置与吸附状态（Rust 静态默认是贴边，需要前端把上次的值灌进来）
#[tauri::command]
fn restore_ball_position(
    app: AppHandle,
    x: Option<i32>,
    y: Option<i32>,
    dock: bool,
) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    set_docked(dock);
    set_free_pos(x.zip(y).map(|(x, y)| PhysicalPosition::new(x, y)));
    if let Some(pos) = free_pos() {
        let _ = ball.set_position(pos);
    } else if docked() {
        place_ball(&ball, false);
    }
    Ok(())
}

/// 半隐藏开关：静置时只露出一条边。返回是否真的生效（自由位置无处可藏）
#[tauri::command]
fn set_ball_hidden(app: AppHandle, hidden: bool) -> Result<bool, String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    if !docked() {
        return Ok(false)
    }
    place_ball(&ball, hidden);
    Ok(true)
}

/// 把球窗就地扩到指定尺寸：以停靠边为锚点向内生长，球体不挪位置。
/// 速记条/菜单/面板都与球共用同一个 webview —— 第二个 webview 在本机会停在
/// about:blank，变成一层看不见却挡点击的透明玻璃，所以坚持单窗口。
fn expand_to(app: &AppHandle, w: f64, h: f64) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    let e = edge();
    let base = if docked() {
        slot(&ball, e, false, along())
    } else {
        free_pos()
    }
    .ok_or_else(|| "拿不到显示器".to_string())?;
    let s = scale_of(&ball);
    let size = tauri::LogicalSize::new(w, h).to_physical::<i32>(s);
    let span = (BALL_WIN * s).round() as i32;
    let (x, y) = match e {
        Edge::Right => (base.x + span - size.width, base.y - (size.height - span) / 2),
        Edge::Left => (base.x, base.y - (size.height - span) / 2),
        Edge::Top => (base.x - (size.width - span) / 2, base.y),
        Edge::Bottom => (base.x - (size.width - span) / 2, base.y + span - size.height),
    };
    // 别让展开后的窗口跑出屏幕
    let (x, y) = if let Some(r) = screen_rect(&ball) {
        (
            x.clamp(r.x, (r.x + r.w - size.width).max(r.x)),
            y.clamp(r.y, (r.y + r.h - size.height).max(r.y)),
        )
    } else {
        (x, y)
    };
    ball.set_size(PhysicalSize::new(size.width, size.height))
        .map_err(|err| err.to_string())?;
    ball.set_position(PhysicalPosition::new(x, y))
        .map_err(|err| err.to_string())?;
    clear_window_region(&ball);
    let _ = ball.show();
    let _ = ball.set_focus();
    Ok(())
}

/// 展开便签面板：窗口居中放大到 1080×720
fn expand_panel(app: &AppHandle, page: &str) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    let r = screen_rect(&ball).ok_or_else(|| "拿不到显示器".to_string())?;
    let s = scale_of(&ball);
    let (lw, lh) = monitor_of(&ball).unwrap_or((PANEL_W, PANEL_H));
    let size = tauri::LogicalSize::new(PANEL_W, PANEL_H).to_physical::<i32>(s);
    let pos = tauri::LogicalPosition::new((lw - PANEL_W) / 2.0, (lh - PANEL_H) / 2.0)
        .to_physical::<i32>(s);
    let x = r.x + (pos.x).clamp(0, (r.w - size.width).max(0));
    let y = r.y + (pos.y).clamp(0, (r.h - size.height).max(0));
    ball.set_size(PhysicalSize::new(size.width, size.height))
        .map_err(|err| err.to_string())?;
    ball.set_position(PhysicalPosition::new(x, y))
        .map_err(|err| err.to_string())?;
    // 面板是主工作区，不该一直压在别的窗口上面
    let _ = ball.set_always_on_top(false);
    clear_window_region(&ball);
    let _ = ball.show();
    let _ = ball.set_focus();
    let _ = app.emit("floatmemo://panel", page.to_string());
    Ok(())
}

/// 展开速记条
#[tauri::command]
fn expand_quick(app: AppHandle) -> Result<(), String> {
    expand_to(&app, QUICK_W, QUICK_H)?;
    let _ = app.emit("floatmemo://quick", ());
    Ok(())
}

/// 展开悬浮球右键菜单
#[tauri::command]
fn show_ball_menu(app: AppHandle) -> Result<(), String> {
    expand_to(&app, MENU_W, MENU_H)
}

/// 速记条/菜单/面板收回成悬浮球
#[tauri::command]
fn collapse_ball(app: AppHandle) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    reset_ball(&ball);
    let _ = ball.show();
    let _ = ball.set_focus();
    let _ = app.emit("floatmemo://ball", ());
    Ok(())
}

/// 打开便签面板（球窗放大形态），page: notes / pinned / trash / settings
#[tauri::command]
fn open_panel_page(app: AppHandle, page: String) -> Result<(), String> {
    expand_panel(&app, &page)
}

#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

/// 开机自启开关（写 Windows 启动目录 / 注册表 Run 项）
#[tauri::command]
fn set_autostart(app: AppHandle, enable: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    if enable {
        manager.enable().map_err(|e| e.to_string())
    } else {
        manager.disable().map_err(|e| e.to_string())
    }
}
/// 读取系统里真实的自启状态（用户可能在系统设置里改过）
#[tauri::command]
fn autostart_enabled(app: AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

// ── 全局快捷键（可自定义）───────────────────────────────────────────

/// 重新注册全部全局快捷键。第二个实例不会走到这里（被单实例插件拦截）。
/// 失败时已自动 unregister_all 回滚，前端应仅在成功时才把新值写进设置。
#[tauri::command]
fn register_shortcuts(
    app: AppHandle,
    quick: String,
    panel: String,
    search: String,
) -> Result<(), String> {
    let gs = app.global_shortcut();
    gs.unregister_all().map_err(|e| e.to_string())?;

    // (label, combo, event, 面板是否带 page 载荷)
    let bindings: &[(&str, &str, &str, bool)] = &[
        ("唤起速记", &quick, "floatmemo://quick", false),
        ("打开面板", &panel, "floatmemo://panel", true),
        ("面板搜索", &search, "floatmemo://search", false),
    ];

    let mut errors: Vec<String> = Vec::new();
    for (label, combo, event, with_page) in bindings {
        let ev = event.to_string();
        let page = *with_page;
        let result = gs.on_shortcut(*combo, move |app, _s, e| {
            if e.state() != ShortcutState::Pressed {
                return
            }
            if page {
                let _ = app.emit(&ev, "notes");
            } else {
                let _ = app.emit(&ev, ());
            }
        });
        if let Err(err) = result {
            errors.push(format!("{}（{}）注册失败：{}", label, combo, err));
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        // 回滚：别留下"只注册了一半"的状态
        let _ = gs.unregister_all();
        Err(errors.join("；"))
    }
}

// ── 贴纸模式 ────────────────────────────────────────────────

/// 把球窗变成「贴纸」：无边框透明置顶小窗，显示指定便签。
/// 位置可传物理像素坐标（多显示器摆放），不传则放在当前屏幕中央。
#[tauri::command]
fn sticker_mode(
    app: AppHandle,
    note_id: String,
    x: Option<i32>,
    y: Option<i32>,
) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    let s = scale_of(&ball);
    let size = tauri::LogicalSize::new(STICKER_W, STICKER_H).to_physical::<i32>(s);
    let pos = match (x, y) {
        (Some(px), Some(py)) => PhysicalPosition::new(px, py),
        _ => {
            let r = screen_rect(&ball).ok_or_else(|| "拿不到显示器".to_string())?;
            let (mw, mh) = monitor_of(&ball).unwrap_or((STICKER_W, STICKER_H));
            let lp = tauri::LogicalPosition::new((mw - STICKER_W) / 2.0, (mh - STICKER_H) / 2.0)
                .to_physical::<i32>(s);
            PhysicalPosition::new(r.x + lp.x, r.y + lp.y)
        }
    };
    ball.set_size(PhysicalSize::new(size.width, size.height))
        .map_err(|err| err.to_string())?;
    ball.set_position(pos).map_err(|err| err.to_string())?;
    clear_window_region(&ball);
    // 贴纸是常驻置顶小窗，始终保持在最前
    let _ = ball.set_always_on_top(true);
    // 默认可交互；点击穿透由前端开关控制
    let _ = ball.set_ignore_cursor_events(false);
    let _ = ball.show();
    let _ = ball.set_focus();
    let _ = app.emit("floatmemo://sticker", note_id);
    Ok(())
}

/// 退出贴纸模式，恢复成悬浮球
#[tauri::command]
fn exit_sticker(app: AppHandle) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    reset_ball(&ball);
    let _ = ball.set_ignore_cursor_events(false);
    let _ = ball.show();
    let _ = ball.set_focus();
    let _ = app.emit("floatmemo://ball", ());
    Ok(())
}

/// 贴纸点击穿透开关：开启后鼠标事件穿透到下层窗口，贴纸只作展示
#[tauri::command]
fn set_sticker_click_through(app: AppHandle, enabled: bool) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    ball.set_ignore_cursor_events(enabled)
        .map_err(|err| err.to_string())
}

/// 贴纸拖动：按鼠标位移移动窗口（不吸附，可摆到任意位置）
#[tauri::command]
fn move_sticker_by(app: AppHandle, dx: f64, dy: f64) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    let s = scale_of(&ball);
    let pos = ball.outer_position().map_err(|e| e.to_string())?;
    let nx = pos.x + (dx * s).round() as i32;
    let ny = pos.y + (dy * s).round() as i32;
    // 别让贴纸整个跑出屏幕（至少留 40px 可抓）
    let limit = if let Some(r) = screen_rect(&ball) {
        let sw = (STICKER_W * s).round() as i32;
        let sh = (STICKER_H * s).round() as i32;
        (
            nx.clamp(r.x - sw + 40, r.x + r.w - 40),
            ny.clamp(r.y - sh + 40, r.y + r.h - 40),
        )
    } else {
        (nx, ny)
    };
    ball.set_position(PhysicalPosition::new(limit.0, limit.1))
        .map_err(|e| e.to_string())
}

// ── MySQL 备份 ────────────────────────────────────────────────

/// 最近一次备份的状态（进程内保存）
static LAST_BACKUP: Mutex<Option<mysql::BackupStatus>> = Mutex::new(None);

/// 测试 MySQL 连接：能连上返回目标表里已有的便签条数
#[tauri::command]
fn mysql_ping(config: mysql::MysqlConfig) -> Result<usize, String> {
    mysql::ping(&config)
}

/// 把全部便签备份进 MySQL
#[tauri::command]
fn mysql_backup(
    config: mysql::MysqlConfig,
    notes: Vec<mysql::NoteRow>,
) -> Result<mysql::BackupResult, String> {
    let result = mysql::backup(&config, &notes)?;
    let status = mysql::BackupStatus {
        last_backup_at: Some(mysql::now_ms()),
        last_backup_count: Some(result.written),
        last_backup_host: Some(format!("{}:{}", config.host, config.port)),
    };
    if let Ok(mut g) = LAST_BACKUP.lock() {
        *g = Some(status);
    }
    Ok(result)
}

/// 读取最近一次备份状态
#[tauri::command]
fn mysql_backup_status() -> Option<mysql::BackupStatus> {
    LAST_BACKUP.lock().ok().and_then(|g| g.clone())
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    DB_URL,
                    vec![
                        Migration {
                            version: 1,
                            description: "创建便签表",
                            sql: SQL_CREATE_NOTES,
                            kind: MigrationKind::Up,
                        },
                        Migration {
                            version: 2,
                            description: "便签更新时间索引",
                            sql: SQL_INDEX_NOTES,
                            kind: MigrationKind::Up,
                        },
                        Migration {
                            version: 3,
                            description: "便签提醒时间",
                            sql: SQL_ADD_REMIND_AT,
                            kind: MigrationKind::Up,
                        },
                        // FTS5 迁移暂时移除——tauri-plugin-sql 的 SQLite 可能不支持 FTS5，
                        // 导致应用启动卡住。改用 db.ts 里惰性创建。
                    ],
                )
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        // 到点提醒：系统通知
        .plugin(tauri_plugin_notification::init())
        // 防多开：第二个实例启动时，唤醒并聚焦第一个窗口，而不是再开一个
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(ball) = app.get_webview_window(BALL) {
                let _ = ball.show();
                let _ = ball.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["Ctrl+Shift+N", "Ctrl+Shift+M"])
                .expect("注册全局快捷键失败")
                .with_handler(|app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return
                    }
                    if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyN) {
                        let _ = expand_quick(app.clone());
                    } else if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyM) {
                        let _ = open_panel_page(app.clone(), "notes".into());
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            expand_quick,
            show_ball_menu,
            collapse_ball,
            open_panel_page,
            move_ball_by,
            snap_ball,
            set_ball_hidden,
            hide_window,
            set_autostart,
            autostart_enabled,
            mysql_ping,
            mysql_backup,
            mysql_backup_status,
            quit_app,
            register_shortcuts,
            restore_ball_position,
            sticker_mode,
            exit_sticker,
            set_sticker_click_through,
            move_sticker_by
        ])
        .setup(|app| {
            if let Some(ball) = app.get_webview_window(BALL) {
                reset_ball(&ball);
            }

            let quick = MenuItem::with_id(app, "quick", "速记…", true, None::<&str>)?;
            let panel = MenuItem::with_id(app, "panel", "打开便签面板", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "设置…", true, None::<&str>)?;
            let exit_sticker_item =
                MenuItem::with_id(app, "exit_sticker_menu", "退出贴纸", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "退出浮笺", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&quick, &panel, &settings, &exit_sticker_item, &sep, &quit],
            )?;

            TrayIconBuilder::with_id("floatmemo-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("浮笺 FloatMemo")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quick" => {
                        let _ = expand_quick(app.clone());
                    }
                    "panel" => {
                        let _ = open_panel_page(app.clone(), "notes".into());
                    }
                    "settings" => {
                        let _ = open_panel_page(app.clone(), "settings".into());
                    }
                    "exit_sticker_menu" => {
                        // 穿透死锁时从托盘恢复交互（无操作也无害）
                        let _ = exit_sticker(app.clone());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(ball) = app.get_webview_window(BALL) {
                            if ball.is_visible().unwrap_or(false) {
                                let _ = ball.hide();
                            } else {
                                // 无论上次停在速记/菜单/面板，托盘唤起都回到悬浮球
                                reset_ball(&ball);
                                let _ = ball.show();
                                let _ = ball.set_focus();
                                let _ = app.emit("floatmemo://ball", ());
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("浮笺启动失败");
}
