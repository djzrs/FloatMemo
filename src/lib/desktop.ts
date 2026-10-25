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

/** 速记条收回成悬浮球 */
export async function collapseBall(): Promise<boolean> {
  if (!isDesktop) return false
  await invoke('collapse_ball')
  return true
}

export async function openPanel(): Promise<void> {
  if (!isDesktop) return
  await invoke('open_panel')
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
