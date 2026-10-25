import { Recycle, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NOTE_COLORS } from '../data/colors'
import { formatRelative } from '../lib/time'
import { useNotesStore } from '../stores/notes'

export function TrashView() {
  const notes = useNotesStore((s) => s.notes)
  const restoreNote = useNotesStore((s) => s.restoreNote)
  const deleteForever = useNotesStore((s) => s.deleteForever)
  const clearTrash = useNotesStore((s) => s.clearTrash)

  const archived = useMemo(
    () => notes.filter((n) => n.archived).sort((a, b) => b.updatedAt - a.updatedAt),
    [notes],
  )
  const [confirmClear, setConfirmClear] = useState(false)

  if (archived.length === 0) {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex flex-col items-center pb-12">
          <div className="relative mb-5 grid h-[76px] w-[76px] place-items-center rounded-full bg-white shadow-[0_10px_24px_-14px_rgba(15,45,45,0.4)] ring-1 ring-ink-100">
            <Recycle size={30} strokeWidth={1.6} className="text-ink-300" />
            <span className="absolute -right-1 -bottom-1 grid h-[26px] w-[26px] place-items-center rounded-full bg-brand-50 text-brand-600 ring-2 ring-white">
              <RotateCcw size={12} strokeWidth={2.4} />
            </span>
          </div>
          <h3 className="text-[14.5px] font-semibold text-ink-800">回收站是空的</h3>
          <p className="mt-1.5 max-w-[290px] text-center text-[11.5px] leading-[19px] text-ink-400">
            删除的便签会在这里保留 30 天，到期后自动清理，期间可以随时还原。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="scroll-thin h-full overflow-y-auto px-5 pt-4 pb-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[20px] leading-none font-semibold tracking-[-0.01em] text-ink-900">
            回收站
            <span className="rounded-full bg-ink-100 px-1.5 py-[2px] text-[10px] leading-none font-medium text-ink-400">
              {archived.length}
            </span>
          </h2>
          <p className="mt-1.5 text-[10.5px] text-ink-400">
            删除的便签会保留 30 天，期间可随时还原
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!confirmClear) {
              setConfirmClear(true)
              window.setTimeout(() => setConfirmClear(false), 3000)
              return
            }
            clearTrash()
            setConfirmClear(false)
          }}
          className={`h-[30px] rounded-[8px] border px-2.5 text-[11px] transition-colors ${
            confirmClear
              ? 'border-rose-200 bg-rose-50 text-rose-600'
              : 'border-ink-200/70 bg-white text-ink-500 hover:border-ink-300'
          }`}
        >
          {confirmClear ? '确认清空？' : '清空回收站'}
        </button>
      </div>

      <div className="mt-3.5 space-y-2">
        {archived.map((note) => {
          const c = NOTE_COLORS[note.color]
          return (
            <div
              key={note.id}
              className="flex items-center gap-3 rounded-[12px] border border-line bg-white py-2.5 pr-2.5 pl-3.5 shadow-[0_1px_2px_rgba(15,45,45,0.04)]"
            >
              <span
                className="h-[26px] w-[3px] shrink-0 rounded-full"
                style={{ background: c.dot }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium" style={{ color: c.ink }}>
                  {note.title}
                </div>
                {note.content.trim() !== note.title && (
                  <div className="mt-0.5 truncate text-[11px] text-ink-400">
                    {note.content.trim() || '（空便签）'}
                  </div>
                )}
              </div>
              <span className="shrink-0 text-[10.5px] text-ink-300">
                {formatRelative(note.updatedAt)}
              </span>
              <div className="ml-1 flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => restoreNote(note.id)}
                  className="flex h-[26px] items-center gap-1 rounded-[6px] border border-ink-200/80 bg-white px-2 text-[11px] text-ink-600 transition-colors hover:bg-ink-50"
                >
                  <RotateCcw size={11} strokeWidth={2.2} />
                  还原
                </button>
                <button
                  type="button"
                  onClick={() => deleteForever(note.id)}
                  className="flex h-[26px] items-center gap-1 rounded-[6px] px-2 text-[11px] text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={11} strokeWidth={2.2} />
                  彻底删除
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
