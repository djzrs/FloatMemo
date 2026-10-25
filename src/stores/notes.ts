import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { NoteColorKey } from '../data/colors'
import { createSeedNotes, type Note } from '../data/notes'

export type NoteDraft = {
  title: string
  content: string
  color: NoteColorKey
  tags?: string[]
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
