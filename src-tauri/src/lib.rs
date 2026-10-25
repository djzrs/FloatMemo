use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

const BALL: &str = "ball";

/// 悬浮球窗口边长（球体 54 + 阴影留白）
const BALL_WIN: f64 = 74.0;
/// 展开为速记条时的窗口尺寸（输入条 + 颜色行）
const QUICK_W: f64 = 520.0;
const QUICK_H: f64 = 180.0;
/// 展开为右键菜单时的窗口尺寸（菜单 228 + 球 74 + 间距）
const MENU_W: f64 = 320.0;
const MENU_H: f64 = 372.0;
/// 展开为便签面板时的窗口尺寸
const PANEL_W: f64 = 1080.0;
const PANEL_H: f64 = 720.0;

/// 显示器信息：缩放、逻辑尺寸、逻辑原点
struct Screen {
    scale: f64,
    width: f64,
    height: f64,
    x: f64,
    y: f64,
}

fn screen_of(window: &WebviewWindow) -> Option<Screen> {
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten())?;
    let scale = monitor.scale_factor();
    let size = monitor.size().to_logical::<f64>(scale);
    let origin = monitor.position().to_logical::<f64>(scale);
    Some(Screen {
        scale,
        width: size.width,
        height: size.height,
        x: origin.x,
        y: origin.y,
    })
}

/// 球窗在屏幕上的基准位置（球体 10..64，右缘留 12px）。
/// Windows 会给带边框样式的小窗强制 136px 最小宽度，球窗实际比 74 宽；
/// 所以球在窗口内靠左摆放，多出来的透明部分留在屏幕外。
fn ball_origin(window: &WebviewWindow) -> Option<PhysicalPosition<i32>> {
    let screen = screen_of(window)?;
    let x = screen.x + screen.width - 76.0;
    let y = screen.y + (screen.height - BALL_WIN) / 2.0;
    Some(tauri::LogicalPosition::new(x, y).to_physical::<i32>(screen.scale))
}

/// 把悬浮球放到主屏右侧、垂直居中
fn place_ball(window: &WebviewWindow) {
    if let Some(pos) = ball_origin(window) {
        let _ = window.set_position(pos);
    }
}

/// 收起成悬浮球：恢复 74×74、重新贴边并恢复置顶
fn reset_ball(window: &WebviewWindow) {
    let _ = window.set_size(tauri::LogicalSize::new(BALL_WIN, BALL_WIN));
    place_ball(window);
    let _ = window.set_always_on_top(true);
}

/// 把球窗就地扩到指定尺寸：窗口向左上生长，球体保持在右端原地不动。
/// 速记条/菜单/面板都与球共用同一个 webview —— 第二个 webview 在本机会停在
/// about:blank，变成一层看不见却挡点击的透明玻璃，所以坚持单窗口。
fn expand_to(app: &AppHandle, w: f64, h: f64) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    let origin = ball_origin(&ball).ok_or_else(|| "拿不到显示器".to_string())?;
    let scale = screen_of(&ball).map(|s| s.scale).unwrap_or(1.0);
    let size = tauri::LogicalSize::new(w, h).to_physical::<i32>(scale);
    let ball_size = tauri::LogicalSize::new(BALL_WIN, BALL_WIN).to_physical::<i32>(scale);
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

/// 展开便签面板：窗口居中放大到 1080×720
fn expand_panel(app: &AppHandle, page: &str) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL)
        .ok_or_else(|| "球窗不存在".to_string())?;
    let screen = screen_of(&ball).ok_or_else(|| "拿不到显示器".to_string())?;
    let size = tauri::LogicalSize::new(PANEL_W, PANEL_H).to_physical::<i32>(screen.scale);
    let x = screen.x + (screen.width - PANEL_W) / 2.0;
    let y = screen.y + (screen.height - PANEL_H) / 2.0;
    let pos = tauri::LogicalPosition::new(x, y).to_physical::<i32>(screen.scale);
    ball.set_size(PhysicalSize::new(size.width, size.height))
        .map_err(|e| e.to_string())?;
    ball.set_position(pos).map_err(|e| e.to_string())?;
    // 面板是主工作区，不该一直压在别的窗口上面
    let _ = ball.set_always_on_top(false);
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

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
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
            hide_window,
            set_autostart,
            autostart_enabled,
            quit_app
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
                        let _ = open_panel_page(app.clone(), "notes".into());
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
