import { NOTE_COLORS, type NoteColorKey } from '../data/colors'
import type { Note } from '../data/notes'
import { normalizeTags } from '../stores/notes'

export type BackupFile = {
  app: 'floatmemo'
  version: 1
  exportedAt: number
  notes: Note[]
}

const pad = (n: number) => String(n).padStart(2, '0')

function stamp(date = new Date()): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}`
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

export function downloadFile(name: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function buildBackup(notes: Note[]): BackupFile {
  return { app: 'floatmemo', version: 1, exportedAt: Date.now(), notes }
}

export function exportJson(notes: Note[]): void {
  downloadFile(
    `floatmemo-${stamp()}.json`,
    JSON.stringify(buildBackup(notes), null, 2),
    'application/json;charset=utf-8',
  )
}

/** 导出为单文件 Markdown：标题按二级标题、保留标签与时间 */
export function buildMarkdown(notes: Note[]): string {
  const head = [
    '# 浮笺便签导出',
    '',
    `> 导出于 ${formatTime(Date.now())} · 共 ${notes.length} 条`,
    '',
    '---',
    '',
  ]

  const body = notes.flatMap((note) => {
    const lines = [`## ${note.title}${note.archived ? '（回收站）' : ''}`, '']
    const meta: string[] = []
    if (note.tags.length) meta.push(note.tags.map((t) => `#${t}`).join(' '))
    meta.push(`更新于 ${formatTime(note.updatedAt)}`)
    lines.push(`*${meta.join(' · ')}*`, '')
    if (note.content.trim()) lines.push(note.content.trim(), '')
    lines.push('---', '')
    return lines
  })

  return [...head, ...body].join('\n')
}

export function exportMarkdown(notes: Note[]): void {
  downloadFile(`floatmemo-${stamp()}.md`, buildMarkdown(notes), 'text/markdown;charset=utf-8')
}

/** 解析备份文件：兼容 { notes: [] } 与直接是数组两种格式 */
export function parseBackup(text: string): Note[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('不是合法的 JSON 文件')
  }

  const raw = Array.isArray(data) ? data : (data as { notes?: unknown } | null)?.notes
  if (!Array.isArray(raw)) throw new Error('文件里没有找到便签数据')

  const notes: Note[] = []
  const seen = new Set<string>()

  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const o = item as Record<string, unknown>
    const content = typeof o.content === 'string' ? o.content : ''
    const rawTitle = typeof o.title === 'string' ? o.title : ''
    if (!content.trim() && !rawTitle.trim()) return

    const fallbackId = `import-${Date.now().toString(36)}-${index}`
    let id = typeof o.id === 'string' && o.id ? o.id : fallbackId
    if (seen.has(id)) id = `${id}-${index}`
    seen.add(id)

    const color =
      typeof o.color === 'string' && o.color in NOTE_COLORS ? (o.color as NoteColorKey) : 'yellow'
    const createdAt = typeof o.createdAt === 'number' ? o.createdAt : Date.now()
    const updatedAt = typeof o.updatedAt === 'number' ? o.updatedAt : createdAt

    notes.push({
      id,
      title: rawTitle.trim() || content.trim().split('\n')[0].slice(0, 24) || '导入的便签',
      content,
      color,
      pinned: Boolean(o.pinned),
      archived: Boolean(o.archived),
      tags: Array.isArray(o.tags)
        ? normalizeTags(o.tags.filter((t): t is string => typeof t === 'string'))
        : [],
      createdAt,
      updatedAt,
    })
  })

  if (!notes.length) throw new Error('没有解析到可导入的便签')
  return notes
}
