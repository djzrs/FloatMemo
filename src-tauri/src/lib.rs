use std::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

const BALL: &str = "ball";
const PANEL: &str = "panel";

/// 悬浮球窗口边长（球体 54 + 阴影留白）
const BALL_WIN: f64 = 74.0;
/// 展开为速记条时的窗口尺寸（输入条 + 颜色行）
const QUICK_W: f64 = 520.0;
const QUICK_H: f64 = 180.0;
/// 展开为右键菜单时的窗口尺寸（菜单 228 + 球 74 + 间距）
const MENU_W: f64 = 320.0;
const MENU_H: f64 = 372.0;

/// 打开面板时要落到哪一页（notes/pinned/trash/settings），由面板窗取走后清空
static PANEL_PAGE: Mutex<String> = Mutex::new(String::new());

fn ensure_window(app: &AppHandle, label: &str) -> tauri::Result<WebviewWindow> {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(window);
    }

    match label {
        PANEL => WebviewWindowBuilder::new(
            app,
            PANEL,
            WebviewUrl::App("index.html".into()),
        )
        .title("浮笺")
        .inner_size(1080.0, 720.0)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .resizable(false)
        .center()
        .focused(true)
        .build(),
        _ => unreachable!("未知窗口: {label}"),
    }
    .map(|window| {
        // 运行时新建的 webview 可能停在 about:blank，这里对齐球窗已加载的地址
        sync_url(app, &window);
        window
    })
}

/// 把窗口导航到球窗当前地址（开发/生产都适用）
fn sync_url(app: &AppHandle, window: &WebviewWindow) {
    if let Some(ball) = app.get_webview_window(BALL) {
        if let Ok(url) = ball.url() {
            if url.scheme() != "about" {
                let _ = window.navigate(url);
            }
        }
    }
}

/// 球窗在屏幕上的基准位置（球体 10..64，右缘留 12px）。
/// Windows 会给带边框样式的小窗强制 136px 最小宽度，球窗实际比 74 宽；
/// 所以球在窗口内靠左摆放，多出来的透明部分留在屏幕外。
fn ball_origin(window: &WebviewWindow) -> Option<PhysicalPosition<i32>> {
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten())?;
    let scale = monitor.scale_factor();
    let size = monitor.size().to_logical::<f64>(scale);
    let origin = monitor.position().to_logical::<f64>(scale);
    let x = origin.x + size.width - 76.0;
    let y = origin.y + (size.height - BALL_WIN) / 2.0;
    Some(tauri::LogicalPosition::new(x, y).to_physical::<i32>(scale))
}

/// 把悬浮球放到主屏右侧、垂直居中
fn place_ball(window: &WebviewWindow) {
    if let Some(pos) = ball_origin(window) {
        let _ = window.set_position(pos);
    }
}

/// 把球窗就地扩到指定尺寸：窗口向左上生长，球体保持在右端原地不动。
/// 速记条/菜单与球共用同一个 webview，避免第二窗口 about:blank / 不绘制的问题。
fn expand_to(app: &AppHandle, w: f64, h: f64) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    let origin = ball_origin(&ball).ok_or_else(|| "拿不到显示器".to_string())?;
    let scale = ball
        .current_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0);
    let size = tauri::LogicalSize::new(w, h).to_physical::<i32>(scale);
    let ball_size = tauri::LogicalSize::new(BALL_WIN, BALL_WIN).to_physical::<i32>(scale);
    // 球体在新窗口里靠右（占据 w-64..w-10），让它的屏幕位置与收起时一致
    let x = origin.x + ball_size.width - size.width;
    let y = origin.y - (size.height - ball_size.height) / 2;
    ball.set_size(PhysicalSize::new(size.width, size.height))
        .map_err(|e| e.to_string())?;
    ball.set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    let _ = ball.show();
    let _ = ball.set_focus();
    Ok(())
}

/// 展开速记条
#[tauri::command]
fn expand_quick(app: AppHandle) -> Result<(), String> {
    expand_to(&app, QUICK_W, QUICK_H)
}

/// 展开悬浮球右键菜单
#[tauri::command]
fn show_ball_menu(app: AppHandle) -> Result<(), String> {
    expand_to(&app, MENU_W, MENU_H)
}

#[tauri::command]
fn open_panel(app: AppHandle) -> Result<(), String> {
    ensure_window(&app, PANEL).map(|_| ()).map_err(|e| e.to_string())
}

/// 打开面板并直接落到指定页（notes/pinned/trash/settings）
#[tauri::command]
fn open_panel_page(app: AppHandle, page: String) -> Result<(), String> {
    if let Ok(mut slot) = PANEL_PAGE.lock() {
        *slot = page;
    }
    ensure_window(&app, PANEL).map(|_| ()).map_err(|e| e.to_string())
}

/// 面板窗取走要显示的页（取走后清空）
#[tauri::command]
fn take_panel_page() -> String {
    PANEL_PAGE
        .lock()
        .map(|mut slot| std::mem::take(&mut *slot))
        .unwrap_or_default()
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0)
}

#[tauri::command]
fn close_window(window: WebviewWindow) {
    let _ = window.close();
}

#[tauri::command]
fn minimize_window(window: WebviewWindow) {
    let _ = window.minimize();
}

#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

/// 速记条收回成悬浮球（当前窗口即球窗）
#[tauri::command]
fn collapse_ball(window: WebviewWindow) {
    reset_ball(&window);
    let _ = window.show();
    let _ = window.set_focus();
}

/// 展开/收起速记条时把球窗重新贴边（尺寸变化会改变可见位置）
fn reset_ball(window: &WebviewWindow) {
    let _ = window.set_size(tauri::LogicalSize::new(BALL_WIN, BALL_WIN));
    place_ball(window);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            expand_quick,
            show_ball_menu,
            collapse_ball,
            open_panel,
            open_panel_page,
            take_panel_page,
            quit_app,
            close_window,
            minimize_window,
            hide_window
        ])
        .setup(|app| {
            if let Some(ball) = app.get_webview_window(BALL) {
                place_ball(&ball);
            }

            let quick = MenuItem::with_id(app, "quick", "速记…", true, None::<&str>)?;
            let panel = MenuItem::with_id(app, "panel", "打开便签面板", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "设置…", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "退出浮笺", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quick, &panel, &settings, &sep, &quit])?;

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
                        let _ = ensure_window(app, PANEL);
                    }
                    "settings" => {
                        let _ = open_panel_page(app.clone(), "settings".into());
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
                                reset_ball(&ball);
                                let _ = ball.show();
                                let _ = ball.set_focus();
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
