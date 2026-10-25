import { MoreHorizontal, Pin } from 'lucide-react'
import { NOTE_COLORS } from '../data/colors'
import type { Note } from '../data/notes'

export function NoteCard({ note }: { note: Note }) {
  const c = NOTE_COLORS[note.color]

  return (
    <article
      className="group relative flex flex-col rounded-[14px] border p-3.5 transition-all duration-200 hover:-translate-y-[1px]"
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
        boxShadow:
          '0 1px 2px rgba(15,45,45,0.05), 0 10px 20px -16px rgba(15,45,45,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      <div className="flex items-start gap-1.5">
        <h3
          className="min-w-0 flex-1 text-[13.5px] leading-[20px] font-semibold tracking-[0.01em]"
          style={{ color: c.ink }}
        >
          {note.title}
        </h3>

        {note.pinned && (
          <span
            className="mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.62)', color: c.sub }}
            title="已置顶"
          >
            <Pin size={10} strokeWidth={2.4} fill="currentColor" />
          </span>
        )}

        <button
          type="button"
          className="-mr-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: c.sub }}
          aria-label="更多"
        >
          <MoreHorizontal size={14} strokeWidth={2.2} />
        </button>
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
        >
          {note.time}
        </time>
      </div>
    </article>
  )
}
