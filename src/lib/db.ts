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
let ftsReady: Promise<void> | null = null
/** 当前 SQLite 是否真的建好了 FTS5 虚拟表（引擎未启用 FTS5 时降级为内存过滤） */
let ftsAvailable = false

async function ensureFts(d: Database): Promise<void> {
  // 惰性创建 FTS5 虚拟表（不放在迁移里，避免插件的 SQLite 不支持时卡住启动）。
  // 失败不影响主流程——saveNotes / searchNotes 会根据 ftsAvailable 降级。
  try {
    await d.execute(
      `CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        note_id UNINDEXED,
        title,
        content,
        tags
      )`,
    )
    ftsAvailable = true
  } catch {
    ftsAvailable = false
  }
}

function db(): Promise<Database> {
  if (!handle) {
    handle = Database.load(DB_URL).then(async (d) => {
      ftsReady = ensureFts(d)
      return d
    })
  }
  return handle
}

/** 等待 FTS5 初始化完成（建表结果已写进 ftsAvailable） */
export async function ftsReadyPromise(): Promise<void> {
  if (ftsReady) await ftsReady
}

/** 当前 SQLite 是否支持 FTS5 全文搜索（供前端决定是否走全文检索） */
export function ftsSupported(): boolean {
  return ftsAvailable
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
  await ftsReadyPromise()
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
    // 同步 FTS5（INSERT OR REPLACE：有则替换无则插入）。
    // 只在 FTS5 可用时做，避免拖垮主保存流程。
    if (ftsAvailable) {
      try {
        await d.execute(
          'INSERT OR REPLACE INTO notes_fts(note_id, title, content, tags) VALUES (?, ?, ?, ?)',
          [n.id, n.title, n.content, JSON.stringify(n.tags)],
        )
      } catch {
        // FTS5 写入失败不阻塞便签本身保存
      }
    }
  }
  const ids = notes.map((n) => n.id)
  if (ids.length) {
    const holes = ids.map(() => '?').join(',')
    await d.execute(`DELETE FROM notes WHERE id NOT IN (${holes})`, ids)
    if (ftsAvailable) {
      try {
        await d.execute(`DELETE FROM notes_fts WHERE note_id NOT IN (${holes})`, ids)
      } catch {
        /* ignore */
      }
    }
  } else {
    await d.execute('DELETE FROM notes')
    if (ftsAvailable) {
      try {
        await d.execute('DELETE FROM notes_fts')
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * FTS5 全文搜索。query 会被清洗成安全的 FTS5 查询串（去掉特殊字符，
 * 多个词之间用 AND 连接），避免用户输入破坏语法。
 * - 非桌面端返回 null（走内存过滤）
 * - FTS5 不可用 / 查询失败时返回 loadNotes() 全部结果，前端回退到内存过滤
 */
export async function searchNotes(query: string): Promise<Note[] | null> {
  if (!isDesktop) return null
  const q = query.trim()
  if (!q) return loadNotes()
  const d = await db()
  await ftsReadyPromise()
  if (!ftsAvailable) return loadNotes()
  // 把每个词单独匹配，中间用 AND 连接；去掉 FTS5 特殊字符
  const ftsQuery = q
    .split(/\s+/)
    .map((w) => `"${w.replace(/"/g, '""')}"`)
    .join(' AND ')
  try {
    const rows = await d.select<Row[]>(`
      SELECT n.* FROM notes n
      JOIN notes_fts f ON n.id = f.note_id
      WHERE notes_fts MATCH ?
      ORDER BY n.updated_at DESC
    `, [ftsQuery])
    return rows.map(toNote)
  } catch {
    // FTS5 查询出错（语法 / 引擎异常）时退回全量，前端再做内存过滤
    return loadNotes()
  }
}
