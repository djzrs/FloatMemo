import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { NoteColorKey } from '../data/colors'
import { createSeedNotes, type Note } from '../data/notes'
import { isDesktop } from '../lib/desktop'
import { loadNotes, saveNotes } from '../lib/db'

export type NoteDraft = {
  title: string
  content: string
  color: NoteColorKey
  tags?: string[]
  /** 提醒时间（毫秒时间戳）。undefined=未提供；null=清除提醒 */
  remindAt?: number | null
}

export const TAG_MAX_LENGTH = 12
export const TAG_MAX_COUNT = 8

/** 规整标签：去 #、去空白、去重、限量 */
export function normalizeTags(tags: string[]): string[] {
  const out: string[] = []
  tags.forEach((raw) => {
    const tag = raw.replace(/^#+/, '').trim().slice(0, TAG_MAX_LENGTH)
    if (tag && !out.includes(tag) && out.length < TAG_MAX_COUNT) out.push(tag)
  })
  return out
}

type NotesState = {
  notes: Note[]
  addNote: (draft: NoteDraft) => Note
  updateNote: (id: string, draft: Partial<NoteDraft>) => void
  togglePin: (id: string) => void
  archiveNote: (id: string) => void
  restoreNote: (id: string) => void
  deleteForever: (id: string) => void
  clearTrash: () => void
  /** 导入：按 id 去重，返回实际新增条数 */
  importNotes: (incoming: Note[]) => number
}

const TITLE_MAX = 24

/** 没有标题时，用正文首行兜底 */
export function deriveTitle(content: string): string {
  const firstLine =
    content
      .split('\n')
      .map((line) => line.replace(/^#{1,6}\s*/, '').trim())
      .find(Boolean) ?? ''
  const title = firstLine.slice(0, TITLE_MAX)
  return firstLine.length > TITLE_MAX ? `${title}…` : title || '无标题便签'
}

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: createSeedNotes(),

      addNote: (draft) => {
        const now = Date.now()
        const content = draft.content.trim()
        const note: Note = {
          id: uid(),
          title: draft.title.trim() || deriveTitle(content),
          content,
          color: draft.color,
          pinned: false,
          archived: false,
          tags: normalizeTags(draft.tags ?? []),
          createdAt: now,
          updatedAt: now,
          remindAt: draft.remindAt ?? undefined,
        }
        set({ notes: [note, ...get().notes] })
        return note
      },

      updateNote: (id, draft) => {
        const now = Date.now()
        set({
          notes: get().notes.map((note) => {
            if (note.id !== id) return note
            const content = draft.content ?? note.content
            const rawTitle = draft.title ?? note.title
            return {
              ...note,
              ...draft,
              content,
              title: rawTitle.trim() || deriveTitle(content),
              tags: draft.tags ? normalizeTags(draft.tags) : note.tags,
              // undefined=未提供（保持原值）；number=设置；null=清除
              remindAt:
                draft.remindAt !== undefined ? draft.remindAt ?? undefined : note.remindAt,
              updatedAt: now,
            }
          }),
        })
      },

      togglePin: (id) => {
        set({
          notes: get().notes.map((note) =>
            note.id === id ? { ...note, pinned: !note.pinned } : note,
          ),
        })
      },

      archiveNote: (id) => {
        const now = Date.now()
        set({
          notes: get().notes.map((note) =>
            note.id === id ? { ...note, archived: true, pinned: false, updatedAt: now } : note,
          ),
        })
      },

      restoreNote: (id) => {
        const now = Date.now()
        set({
          notes: get().notes.map((note) =>
            note.id === id ? { ...note, archived: false, updatedAt: now } : note,
          ),
        })
      },

      deleteForever: (id) => {
        set({ notes: get().notes.filter((note) => note.id !== id) })
      },

      clearTrash: () => {
        set({ notes: get().notes.filter((note) => !note.archived) })
      },

      importNotes: (incoming) => {
        const existing = new Set(get().notes.map((note) => note.id))
        const fresh: Note[] = []
        incoming.forEach((note) => {
          if (existing.has(note.id)) return
          existing.add(note.id)
          fresh.push(note)
        })
        if (fresh.length) set({ notes: [...fresh, ...get().notes] })
        return fresh.length
      },
    }),
    {
      name: 'floatmemo.notes',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // 只持久化数据，动作函数不进存储
      partialize: (state) => ({ notes: state.notes }),
    },
  ),
)

/** 注意：过滤请直接在组件里基于 notes 计算，不要写成返回新数组的 selector */
export const notesStorageKey = 'floatmemo.notes'

/* ---------- 桌面端 SQLite 落盘 ---------- */

let syncTimer: ReturnType<typeof setTimeout> | undefined
let syncing: Promise<void> | null = null

/** 改动后防抖写库（500ms），避免连续输入时刷太多 SQL */
function scheduleSync(notes: Note[]) {
  if (!isDesktop) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncing = saveNotes(notes).catch(() => undefined)
  }, 500)
}

/** 立即把当前便签写库（退出前 / 切页面时调用） */
export function flushNotes(): Promise<void> {
  if (!isDesktop) return Promise.resolve()
  clearTimeout(syncTimer)
  syncing = saveNotes(useNotesStore.getState().notes).catch(() => undefined)
  return syncing
}

/**
 * 启动同步：
 * - 库里有数据 → 以库为准（localStorage 只是浏览器预览的兜底）
 * - 库是空的 → 把当前（示例或 localStorage 里的）便签写进库，完成首次落盘
 */
export async function initNotes(): Promise<void> {
  if (!isDesktop) return
  const rows = await loadNotes().catch(() => null)
  if (rows === null) return
  if (rows.length) {
    useNotesStore.setState({ notes: rows })
  } else {
    await saveNotes(useNotesStore.getState().notes).catch(() => undefined)
  }
  useNotesStore.subscribe((state, prev) => {
    if (state.notes !== prev.notes) scheduleSync(state.notes)
  })
}
