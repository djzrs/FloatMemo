import { check } from '@tauri-apps/plugin-updater'
import { isDesktop } from './desktop'

/**
 * 应用自更新（仅桌面端）。
 *
 * - 检查更新：访问 tauri.conf.json 里配置的 endpoints（GitHub Releases latest.json）
 * - 有新版本：下载 NSIS 安装包并静默安装（installMode: passive，带进度条小窗）
 * - 安装完成后调用 relaunch() 重启应用
 */

export type UpdateCheckResult =
  | { status: 'up-to-date' }
  | { status: 'available'; version: string; body: string | null }
  | { status: 'error'; message: string }

/** 检查是否有新版本，不自动下载。返回结果供 UI 展示。 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!isDesktop) return { status: 'error', message: '浏览器预览不支持检查更新' }

  try {
    const update = await check()
    if (!update) return { status: 'up-to-date' }
    return { status: 'available', version: update.version, body: update.body ?? null }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

/** 下载并安装更新；安装完成后自动重启应用。 */
export async function downloadAndInstallUpdate(
  onProgress?: (downloaded: number, total: number) => void,
): Promise<void> {
  const update = await check()
  if (!update) return

  let downloaded = 0
  let total = 0

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        total = event.data.contentLength ?? 0
        onProgress?.(0, total)
        break
      case 'Progress':
        downloaded += event.data.chunkLength
        onProgress?.(downloaded, total)
        break
    }
  })

  // Windows 上安装器启动后应用会自动退出，无需手动重启
}