import { invoke } from '@tauri-apps/api/core'

/**
 * 桌面壳与浏览器预览共用一套组件：
 * 桌面端直接调 Tauri 命令，浏览器端静默降级（expand/collapse 返回 false 表示未执行）。
 */

/** 是否运行在 Tauri 桌面壳里（浏览器预览时为 false） */
export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** 球窗就地展开成速记条（球与速记共用同一个 webview） */
export async function expandQuick(): Promise<boolean> {
  if (!isDesktop) return false
  await invoke('expand_quick')
  return true
}

/** 展开悬浮球右键菜单 */
export async function showBallMenu(): Promise<boolean> {
  if (!isDesktop) return false
  await invoke('show_ball_menu')
  return true
}

/** 速记条/菜单收回成悬浮球 */
export async function collapseBall(): Promise<boolean> {
  if (!isDesktop) return false
  await invoke('collapse_ball')
  return true
}

export async function openPanel(): Promise<void> {
  if (!isDesktop) return
  await invoke('open_panel')
}

/** 打开面板并直接落到指定页（notes / pinned / trash / settings） */
export async function openPanelPage(page: string): Promise<void> {
  if (!isDesktop) return
  await invoke('open_panel_page', { page })
}

/** 面板窗取走要显示的页（取后清空） */
export async function takePanelPage(): Promise<string> {
  if (!isDesktop) return ''
  return (await invoke('take_panel_page')) as string
}

export async function quitApp(): Promise<void> {
  if (!isDesktop) return
  await invoke('quit_app')
}

export async function closeWindow(): Promise<void> {
  if (!isDesktop) return
  await invoke('close_window')
}

export async function minimizeWindow(): Promise<void> {
  if (!isDesktop) return
  await invoke('minimize_window')
}

export async function hideWindow(): Promise<void> {
  if (!isDesktop) return
  await invoke('hide_window')
}
