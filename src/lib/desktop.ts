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

/** 拖动结束后吸附到最近的屏幕边缘 */
export async function snapBall(): Promise<void> {
  if (!isDesktop) return
  await invoke('snap_ball')
}

/** 半隐藏：只露出约 10px 的一条边；false 滑回完整显示 */
export async function setBallHidden(hidden: boolean): Promise<void> {
  if (!isDesktop) return
  await invoke('set_ball_hidden', { hidden })
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

export async function quitApp(): Promise<void> {
  if (!isDesktop) return
  await invoke('quit_app')
}
