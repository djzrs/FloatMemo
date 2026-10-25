import { MoreHorizontal, Pencil, Pin, Trash2, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NOTE_COLORS } from '../data/colors'
import type { Note } from '../data/notes'
import { formatDateTime, formatRelative } from '../lib/time'

type Props = {
  note: Note
  onOpen: () => void
  onTogglePin: () => void
  onArchive: () => void
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: LucideIcon
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[28px] w-full items-center gap-2 rounded-[7px] px-2 text-left text-[11.5px] transition-colors ${
        danger
          ? 'text-ink-600 hover:bg-rose-50 hover:text-rose-600'
          : 'text-ink-700 hover:bg-ink-50'
      }`}
    >
      <Icon size={13} strokeWidth={1.9} className={danger ? 'text-rose-400' : 'text-ink-400'} />
      {label}
    </button>
  )
}

export function NoteCard({ note, onOpen, onTogglePin, onArchive }: Props) {
  const c = NOTE_COLORS[note.color]
  const [menu, setMenu] = useState(false)

  return (
    <article
      onClick={() => onOpen()}
      className="group relative flex cursor-pointer flex-col rounded-[14px] border p-3.5 transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(15,45,45,0.06),0_14px_26px_-16px_rgba(15,45,45,0.4)]"
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
        boxShadow:
          '0 1px 2px rgba(15,45,45,0.05), 0 10px 20px -16px rgba(15,45,45,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      <div className="flex items-start gap-1">
        <h3
          className="min-w-0 flex-1 text-[13.5px] leading-[20px] font-semibold tracking-[0.01em]"
          style={{ color: c.ink }}
        >
          {note.title}
        </h3>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            title={note.pinned ? '取消置顶' : '置顶'}
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin()
            }}
            className={`grid h-[18px] w-[18px] place-items-center rounded-full transition-opacity ${
              note.pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 hover:bg-white/50'
            }`}
            style={{ background: note.pinned ? 'rgba(255,255,255,0.62)' : undefined, color: c.sub }}
          >
            <Pin size={10} strokeWidth={2.4} fill={note.pinned ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            aria-label="更多操作"
            onClick={(e) => {
              e.stopPropagation()
              setMenu((v) => !v)
            }}
            className={`grid h-[18px] w-[18px] place-items-center rounded-full transition-opacity ${
              menu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            style={{ color: c.sub }}
          >
            <MoreHorizontal size={14} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <p
        className="mt-1.5 line-clamp-4 text-[12px] leading-[1.68] whitespace-pre-line"
        style={{ color: c.sub, opacity: 0.92 }}
      >
        {note.content}
      </p>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div className="flex min-w-0 flex-wrap gap-1">
          {note.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/70 bg-white/55 px-[7px] py-[1px] text-[10.5px] leading-[16px]"
              style={{ color: c.sub }}
            >
              #{t}
            </span>
          ))}
        </div>
        <time
          className="shrink-0 text-[10.5px] whitespace-nowrap"
          style={{ color: c.sub, opacity: 0.55 }}
          title={formatDateTime(note.updatedAt)}
        >
          {formatRelative(note.updatedAt)}
        </time>
      </div>

      {menu && (
        <>
          <div
            className="fixed inset-0 z-20 cursor-default"
            onClick={(e) => {
              e.stopPropagation()
              setMenu(false)
            }}
          />
          <div
            className="absolute top-[34px] right-2 z-30 w-[150px] rounded-[10px] border border-ink-100 bg-white p-1 shadow-[0_18px_36px_-14px_rgba(6,29,29,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem
              icon={Pencil}
              label="编辑"
              onClick={() => {
                setMenu(false)
                onOpen()
              }}
            />
            <MenuItem
              icon={Pin}
              label={note.pinned ? '取消置顶' : '置顶'}
              onClick={() => {
                setMenu(false)
                onTogglePin()
              }}
            />
            <div className="mx-1 my-1 h-px bg-ink-100" />
            <MenuItem
              icon={Trash2}
              label="移到回收站"
              danger
              onClick={() => {
                setMenu(false)
                onArchive()
              }}
            />
          </div>
        </>
      )}
    </article>
  )
}
