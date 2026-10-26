import { Bell, Pin } from 'lucide-react'
import { NOTE_COLORS } from '../data/colors'
import type { Note } from '../data/notes'
import { formatDateTime, formatRelative } from '../lib/time'
import { DENSITY_STYLES, useSettingsStore } from '../stores/settings'
import { NoteMenu } from './NoteMenu'

type Props = {
  note: Note
  onOpen: () => void
  onTogglePin: () => void
  onArchive: () => void
  /** 钉为桌面贴纸 */
  onSticker?: () => void
}

export function NoteCard({ note, onOpen, onTogglePin, onArchive, onSticker }: Props) {
  const c = NOTE_COLORS[note.color]
  const density = useSettingsStore((s) => s.cardDensity)
  const d = DENSITY_STYLES[density]

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
          className={`min-w-0 flex-1 font-semibold tracking-[0.01em] ${d.title}`}
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

          <NoteMenu
            pinned={note.pinned}
            onEdit={onOpen}
            onTogglePin={onTogglePin}
            onArchive={onArchive}
            onSticker={onSticker}
            triggerClassName="h-[18px] w-[18px]"
            iconColor={c.sub}
          />
        </div>
      </div>

      <p className={`mt-1.5 whitespace-pre-line ${d.body}`} style={{ color: c.sub, opacity: 0.92 }}>
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
        <div className="flex shrink-0 items-center gap-1.5">
          {note.remindAt != null && (
            <span
              className="flex items-center gap-1 text-[10.5px] whitespace-nowrap"
              title={formatDateTime(note.remindAt)}
              style={{
                color: note.remindAt <= Date.now() ? '#E5484D' : c.sub,
                opacity: note.remindAt <= Date.now() ? 0.9 : 0.7,
              }}
            >
              <Bell size={9.5} strokeWidth={2.2} />
              {note.remindAt <= Date.now() ? '已到点' : formatRelative(note.remindAt)}
            </span>
          )}
          <time
            className="shrink-0 text-[10.5px] whitespace-nowrap"
            style={{ color: c.sub, opacity: 0.55 }}
            title={formatDateTime(note.updatedAt)}
          >
            {formatRelative(note.updatedAt)}
          </time>
        </div>
      </div>
    </article>
  )
}
