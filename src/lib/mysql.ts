import { invoke } from '@tauri-apps/api/core'
import type { MysqlConfig } from '../stores/settings'
import type { Note } from '../data/notes'
import { isDesktop } from './desktop'

/**
 * MySQL 备份：桌面端直连 MySQL 服务器，把全部便签写进指定表。
 * 浏览器预览没有后端，直接返回失败提示。
 */

export type MysqlBackupResult = {
  table: string
  written: number
  total: number
}

export type MysqlBackupStatus = {
  lastBackupAt: number | null
  lastBackupCount: number | null
  lastBackupHost: string | null
}

/** 测试连接：能连上返回库中已有的便签条数 */
export async function mysqlPing(config: MysqlConfig): Promise<number> {
  if (!isDesktop) throw new Error('浏览器预览不支持 MySQL 备份')
  return (await invoke('mysql_ping', { config })) as number
}

/** 立即备份：把全部便签 upsert 进 MySQL，并清理远端已删除的旧行 */
export async function mysqlBackup(
  config: MysqlConfig,
  notes: Note[],
): Promise<MysqlBackupResult> {
  if (!isDesktop) throw new Error('浏览器预览不支持 MySQL 备份')
  const rows = notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    color: n.color,
    tags: n.tags,
    pinned: n.pinned,
    archived: n.archived,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }))
  return (await invoke('mysql_backup', { config, notes: rows })) as MysqlBackupResult
}

/** 最近一次备份状态 */
export async function mysqlBackupStatus(): Promise<MysqlBackupStatus | null> {
  if (!isDesktop) return null
  return (await invoke('mysql_backup_status')) as MysqlBackupStatus | null
}
