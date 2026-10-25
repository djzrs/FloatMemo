import { invoke } from '@tauri-apps/api/core'

/** 是否运行在 Tauri 桌面壳里（浏览器预览时为 false） */
export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export async function openQuick(): Promise<void> {
  if (!isDesktop) return
  await invoke('open_quick')
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
