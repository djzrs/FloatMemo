import Database from '@tauri-apps/plugin-sql'
import type { Note } from '../data/notes'
import { isDesktop } from './desktop'

/**
 * 桌面端便签落盘（SQLite）。浏览器预览不启用，继续用 localStorage。
 *
 * 同步策略：改动后整体 upsert + 删除多余行（先写后删，任何时刻都不会出现"表被清空"的窗口）。
 */

const DB_URL = 'sqlite:floatmemo.db'

type Row = {
  id: string
  title: string
  content: string
  color: string
  tags: string
  pinned: number
  archived: number
  created_at: number
  updated_at: number
}

let handle: Promise<Database> | null = null

function db(): Promise<Database> {
  if (!handle) handle = Database.load(DB_URL)
  return handle
}

export const dbAvailable = isDesktop

function toNote(row: Row): Note {
  let tags: string[] = []
  try {
    const parsed: unknown = JSON.parse(row.tags || '[]')
    if (Array.isArray(parsed)) tags = parsed.filter((t): t is string => typeof t === 'string')
  } catch {
    tags = []
  }
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color as Note['color'],
    tags,
    pinned: row.pinned === 1,
    archived: row.archived === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

/** 读取全部便签；非桌面端返回 null */
export async function loadNotes(): Promise<Note[] | null> {
  if (!isDesktop) return null
  const d = await db()
  const rows = await d.select<Row[]>('SELECT * FROM notes ORDER BY updated_at DESC')
  return rows.map(toNote)
}

const UPSERT = `
INSERT INTO notes (id, title, content, color, tags, pinned, archived, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  color = excluded.color,
  tags = excluded.tags,
  pinned = excluded.pinned,
  archived = excluded.archived,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at`

/** 整体写回：先 upsert 全部，再删除已经不存在的行 */
export async function saveNotes(notes: Note[]): Promise<void> {
  if (!isDesktop) return
  const d = await db()
  for (const n of notes) {
    await d.execute(UPSERT, [
      n.id,
      n.title,
      n.content,
      n.color,
      JSON.stringify(n.tags),
      n.pinned ? 1 : 0,
      n.archived ? 1 : 0,
      n.createdAt,
      n.updatedAt,
    ])
  }
  const ids = notes.map((n) => n.id)
  if (ids.length) {
    const holes = ids.map(() => '?').join(',')
    await d.execute(`DELETE FROM notes WHERE id NOT IN (${holes})`, ids)
  } else {
    await d.execute('DELETE FROM notes')
  }
}
