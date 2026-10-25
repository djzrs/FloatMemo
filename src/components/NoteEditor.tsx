import { Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { COLOR_ORDER, NOTE_COLORS, type NoteColorKey } from '../data/colors'
import type { Note } from '../data/notes'
import { normalizeTags, TAG_MAX_COUNT, type NoteDraft } from '../stores/notes'

type Props = {
  note?: Note | null
  defaultColor?: NoteColorKey
  onClose: () => void
  onSave: (draft: NoteDraft) => void
  onArchive?: () => void
}

/** 新建 / 编辑便签的浮层 */
export function NoteEditor({ note, defaultColor = 'yellow', onClose, onSave, onArchive }: Props) {
  const isEdit = Boolean(note)
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [color, setColor] = useState<NoteColorKey>(note?.color ?? defaultColor)
  const [tags, setTags] = useState<string[]>(note?.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = isEdit ? contentRef.current : titleRef.current
    el?.focus()
    if (isEdit && contentRef.current) {
      const end = contentRef.current.value.length
      contentRef.current.setSelectionRange(end, end)
    }
  }, [isEdit])

  const canSave = Boolean(title.trim() || content.trim())
  const tone = NOTE_COLORS[color]

  const addTag = () => {
    if (!tagInput.trim()) return
    setTags((prev) => normalizeTags([...prev, tagInput]))
    setTagInput('')
  }

  const save = () => {
    if (!canSave) return
    onSave({ title, content, color, tags: normalizeTags([...tags, tagInput]) })
  }

  return (
    <div
      className="absolute inset-0 z-40 grid place-items-center bg-ink-950/25 p-6 backdrop-blur-[2px]"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? '编辑便签' : '新建便签'}
    >
      <div
        className="w-[560px] max-w-full overflow-hidden rounded-[16px] border border-white/80 bg-white"
        style={{
          boxShadow:
            '0 32px 64px -24px rgba(6,29,29,0.5), 0 8px 20px -12px rgba(6,29,29,0.3), 0 0 0 1px rgba(6,29,29,0.04)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            save()
          }
        }}
      >
        <div
          className="h-[3px] w-full"
          style={{
            background: `linear-gradient(90deg, ${tone.dot} 0%, ${tone.dot}66 55%, transparent 100%)`,
          }}
        />

        <div className="px-5 pt-4 pb-2">
          <div className="text-[9.5px] font-medium tracking-[0.18em] text-brand-600">
            {isEdit ? '编辑便签' : '新建便签'}
          </div>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                contentRef.current?.focus()
              }
            }}
            placeholder="标题"
            className="mt-1 w-full bg-transparent text-[17px] font-semibold tracking-[-0.01em] text-ink-900 outline-none placeholder:text-ink-200"
          />
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写点什么…"
            spellCheck={false}
            className="mt-2 h-[196px] w-full resize-none bg-transparent text-[13px] leading-[24px] text-ink-700 outline-none placeholder:text-ink-300"
          />

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full py-[2px] pr-1 pl-2 text-[10.5px]"
                style={{ background: `${tone.dot}22`, color: tone.ink }}
              >
                #{tag}
                <button
                  type="button"
                  aria-label={`移除标签 ${tag}`}
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="grid h-[13px] w-[13px] place-items-center rounded-full opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100"
                >
                  <X size={8.5} strokeWidth={2.6} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
                  e.preventDefault()
                  addTag()
                }
                if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                  setTags((prev) => prev.slice(0, -1))
                }
              }}
              onBlur={addTag}
              disabled={tags.length >= TAG_MAX_COUNT}
              placeholder={tags.length >= TAG_MAX_COUNT ? '标签已达上限' : '+ 标签'}
              className="h-[20px] w-[70px] bg-transparent text-[10.5px] text-ink-600 outline-none placeholder:text-ink-300 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-ink-100 px-5 py-2.5">
          <div className="flex items-center gap-1.5">
            {COLOR_ORDER.map((key) => {
              const c = NOTE_COLORS[key]
              const active = key === color
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={c.label}
                  onClick={() => setColor(key)}
                  className={`h-[14px] w-[14px] rounded-full border border-black/5 transition-transform ${
                    active ? 'scale-[1.15] ring-2 ring-white ring-offset-1' : 'hover:scale-110'
                  }`}
                  style={{
                    background: c.dot,
                    boxShadow: active ? `0 0 0 1px ${c.dot}` : 'none',
                  }}
                />
              )
            })}
          </div>

          <span className="ml-1.5 text-[10px] text-ink-300">Ctrl + Enter 保存 · Esc 取消</span>

          <div className="ml-auto flex items-center gap-1.5">
            {isEdit && onArchive && (
              <button
                type="button"
                onClick={onArchive}
                title="移到回收站"
                className="mr-0.5 grid h-8 w-8 place-items-center rounded-[7px] text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
              >
                <Trash2 size={14} strokeWidth={1.9} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-[7px] px-2.5 text-[12px] text-ink-500 transition-colors hover:bg-ink-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="h-8 rounded-[7px] bg-brand-600 px-3.5 text-[12px] font-medium text-white shadow-[0_1px_2px_rgba(6,29,29,0.18)] transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-white/80 disabled:shadow-none"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
