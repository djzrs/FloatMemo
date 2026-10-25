use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

const BALL: &str = "ball";
const QUICK: &str = "quick";
const PANEL: &str = "panel";

/// 悬浮球窗口边长（球体 54 + 阴影留白）
const BALL_WIN: f64 = 74.0;

fn ensure_window(app: &AppHandle, label: &str) -> tauri::Result<WebviewWindow> {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(window);
    }

    match label {
        QUICK => WebviewWindowBuilder::new(
            app,
            QUICK,
            WebviewUrl::App("index.html".into()),
        )
        .title("速记")
        .inner_size(520.0, 180.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .resizable(false)
        .center()
        .focused(true)
        .build(),
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

/// 把悬浮球放到主屏右侧、垂直居中。
/// Windows 会给带边框样式的小窗强制 136px 最小宽度，球窗实际比 74 宽；
/// 所以球在窗口内靠左摆放，多出来的透明部分留在屏幕外，避免挡住点击。
fn place_ball(window: &WebviewWindow) {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let size = monitor.size().to_logical::<f64>(scale);
        let origin = monitor.position().to_logical::<f64>(scale);
        // 球体在窗口内 10..64，右边缘留 12px
        let x = origin.x + size.width - 76.0;
        let y = origin.y + (size.height - BALL_WIN) / 2.0;
        let _ = window.set_position(tauri::LogicalPosition::new(x, y));
    }
}

#[tauri::command]
fn open_quick(app: AppHandle) -> Result<(), String> {
    ensure_window(&app, QUICK).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_panel(app: AppHandle) -> Result<(), String> {
    ensure_window(&app, PANEL).map(|_| ()).map_err(|e| e.to_string())
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_quick,
            open_panel,
            close_window,
            minimize_window,
            hide_window
        ])
        .setup(|app| {
            if let Some(ball) = app.get_webview_window(BALL) {
                place_ball(&ball);
                if let Some(quick) = app.get_webview_window(QUICK) {
                    sync_url(app.handle(), &quick);
                }
            }

            let quick = MenuItem::with_id(app, "quick", "速记…", true, None::<&str>)?;
            let panel = MenuItem::with_id(app, "panel", "打开便签面板", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "退出浮笺", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quick, &panel, &sep, &quit])?;

            TrayIconBuilder::with_id("floatmemo-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("浮笺 FloatMemo")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quick" => {
                        let _ = ensure_window(app, QUICK);
                    }
                    "panel" => {
                        let _ = ensure_window(app, PANEL);
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
