import { invoke } from '@tauri-apps/api/core'

/**
 * 桌面壳与浏览器预览共用一套组件：
 * 桌面端直接调 Tauri 命令，浏览器端静默降级（expand/collapse 返回 false 表示未执行）。
 *
 * 桌面端只有一个窗口（球窗），速记条 / 右键菜单 / 便签面板都是它就地放大的形态，
 * 由 Rust 侧改窗口尺寸并发 floatmemo://* 事件，前端据此切换渲染。
 */

/** 是否运行在 Tauri 桌面壳里（浏览器预览时为 false） */
export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** 球窗就地展开成速记条 */
export async function expandQuick(): Promise<boolean> {
  if (!isDesktop) return false
  await invoke('expand_quick')
  return true
}

/** 拖动中：按鼠标位移移动球窗（dx/dy 单位为 CSS 像素） */
export async function moveBallBy(dx: number, dy: number): Promise<void> {
  if (!isDesktop) return
  await invoke('move_ball_by', { dx, dy })
}

/** 拖动结束：靠近边缘才吸附（enabled=false 时停在松手位置） */
export async function snapBall(enabled: boolean): Promise<void> {
  if (!isDesktop) return
  await invoke('snap_ball', { enabled })
}

/** 半隐藏：只露 6px；返回是否生效（自由位置无处可藏则返回 false） */
export async function setBallHidden(hidden: boolean): Promise<boolean> {
  if (!isDesktop) return false
  return (await invoke('set_ball_hidden', { hidden })) as boolean
}

/** 展开悬浮球右键菜单 */
export async function showBallMenu(): Promise<boolean> {
  if (!isDesktop) return false
  await invoke('show_ball_menu')
  return true
}

/** 速记条/菜单/面板收回成悬浮球 */
export async function collapseBall(): Promise<boolean> {
  if (!isDesktop) return false
  await invoke('collapse_ball')
  return true
}

/** 打开便签面板（球窗放大形态），page: notes / pinned / trash / settings */
export async function openPanelPage(page: string): Promise<boolean> {
  if (!isDesktop) return false
  await invoke('open_panel_page', { page })
  return true
}

/** 浏览器预览里直接从菜单打开面板（新标签） */
export function openPanelInBrowser(page: string): void {
  if (isDesktop) return
  window.open(`/?win=panel${page === 'notes' ? '' : `&page=${page}`}`, '_blank', 'noopener')
}

/** 设置开机自启（写系统启动项） */
export async function setAutoStart(enable: boolean): Promise<boolean> {
  if (!isDesktop) return false
  await invoke('set_autostart', { enable })
  return true
}

/** 读取系统里真实的自启状态 */
export async function autoStartEnabled(): Promise<boolean | null> {
  if (!isDesktop) return null
  return (await invoke('autostart_enabled')) as boolean
}

/** 隐藏当前窗口（面板最小化：藏起来，托盘可再唤起） */
export async function hideWindow(): Promise<void> {
  if (!isDesktop) return
  await invoke('hide_window')
}

/** 应用版本号：桌面端读打包元数据，浏览器预览退回构建时常量 */
export async function appVersion(): Promise<string> {
  if (!isDesktop) return FALLBACK_VERSION
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    return await getVersion()
  } catch {
    return FALLBACK_VERSION
  }
}

const FALLBACK_VERSION = '0.2.1'

export async function quitApp(): Promise<void> {
  if (!isDesktop) return
  await invoke('quit_app')
}

/**
 * 重新注册全局快捷键（用户在设置页改键后调用）。
 * 成功才应把新值写进设置；失败返回错误信息，前端据此回滚 UI。
 */
export async function registerShortcuts(
  quick: string,
  panel: string,
  search: string,
): Promise<void> {
  if (!isDesktop) return
  await invoke('register_shortcuts', { quick, panel, search })
}

/**
 * 启动时按设置还原球的位置与吸附状态。Rust 侧静态默认贴边，需要前端把上次存的值灌进来。
 * docked = 是否吸附（= 设置里的 snapToEdge 取反）。
 */
export async function restoreBallPosition(
  x: number | null,
  y: number | null,
  docked: boolean,
): Promise<void> {
  if (!isDesktop) return
  await invoke('restore_ball_position', { x, y, docked })
}
