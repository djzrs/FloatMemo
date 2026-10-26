import { Bell, BellOff, Columns2, Eye, Pencil, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { COLOR_ORDER, NOTE_COLORS, type NoteColorKey } from '../data/colors'
import type { Note } from '../data/notes'
import { normalizeTags, TAG_MAX_COUNT, type NoteDraft } from '../stores/notes'
import { MarkdownPreview } from './MarkdownPreview'

type Props = {
  note?: Note | null
  defaultColor?: NoteColorKey
  onClose: () => void
  onSave: (draft: NoteDraft) => void
  onArchive?: () => void
}

type ViewMode = 'edit' | 'split' | 'preview'

const VIEW_MODES: { key: ViewMode; label: string; icon: typeof Pencil; tip: string }[] = [
  { key: 'edit', label: '编辑', icon: Pencil, tip: '纯编辑（Ctrl+Shift+P 切换）' },
  { key: 'split', label: '分栏', icon: Columns2, tip: '左编辑右预览' },
  { key: 'preview', label: '预览', icon: Eye, tip: '纯预览渲染结果' },
]

/** 毫秒时间戳 → datetime-local 输入框值（本地时区，YYYY-MM-DDTHH:mm） */
function toLocalInput(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local 输入框值 → 毫秒时间戳；空串返回 null */
function fromLocalInput(value: string): number | null {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

/** 新建 / 编辑便签的浮层 */
export function NoteEditor({ note, defaultColor = 'yellow', onClose, onSave, onArchive }: Props) {
  const isEdit = Boolean(note)
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [color, setColor] = useState<NoteColorKey>(note?.color ?? defaultColor)
  const [tags, setTags] = useState<string[]>(note?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  // 默认分栏：写的时候能实时看到渲染效果
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  // 提醒时间（毫秒时间戳）；null=不提醒
  const [remindAt, setRemindAt] = useState<number | null>(note?.remindAt ?? null)

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

  // Ctrl+Shift+P 在 编辑 / 分栏 / 预览 之间轮换
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setViewMode((m) => (m === 'edit' ? 'split' : m === 'split' ? 'preview' : 'edit'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const canSave = Boolean(title.trim() || content.trim())
  const tone = NOTE_COLORS[color]

  const addTag = () => {
    if (!tagInput.trim()) return
    setTags((prev) => normalizeTags([...prev, tagInput]))
    setTagInput('')
  }

  const save = () => {
    if (!canSave) return
    onSave({
      title,
      content,
      color,
      tags: normalizeTags([...tags, tagInput]),
      remindAt: remindAt ?? null,
    })
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
          {/* 视图模式切换 */}
          <div className="mt-2 flex items-center gap-1">
            <div className="flex items-center gap-0.5 rounded-[8px] bg-ink-100/70 p-0.5">
              {VIEW_MODES.map(({ key, label, icon: Icon, tip }) => {
                const active = key === viewMode
                return (
                  <button
                    key={key}
                    type="button"
                    title={tip}
                    onClick={() => setViewMode(key)}
                    className={`flex h-[22px] items-center gap-1 rounded-[6px] px-2 text-[10.5px] font-medium transition-colors ${
                      active
                        ? 'bg-white text-ink-700 shadow-[0_1px_2px_rgba(15,45,45,0.1)]'
                        : 'text-ink-400 hover:text-ink-600'
                    }`}
                  >
                    <Icon size={10.5} strokeWidth={2.2} />
                    {label}
                  </button>
                )
              })}
            </div>
            <span className="ml-1 text-[9.5px] text-ink-300">Markdown 实时预览</span>
          </div>

          {/* 编辑 / 预览 内容区 */}
          <div
            className={`mt-2 grid h-[196px] gap-0 ${
              viewMode === 'split' ? 'grid-cols-2 divide-x divide-ink-100' : 'grid-cols-1'
            }`}
          >
            {(viewMode === 'edit' || viewMode === 'split') && (
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写点什么… 支持 Markdown：**加粗**、`代码`、- 列表、# 标题"
                spellCheck={false}
                className={`h-full w-full resize-none bg-transparent text-[13px] leading-[24px] text-ink-700 outline-none placeholder:text-ink-300 ${
                  viewMode === 'edit' ? '' : 'pr-3'
                }`}
              />
            )}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={viewMode === 'split' ? 'h-full min-w-0 pl-3' : 'h-full'}>
                <MarkdownPreview
                  content={content}
                  className={viewMode === 'split' ? 'px-0 py-0' : 'px-1 py-1'}
                />
              </div>
            )}
          </div>

          {/* 提醒设置 */}
          <div className="mt-2 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10.5px] text-ink-400">
              {remindAt ? <Bell size={11} strokeWidth={2} className="text-brand-600" /> : <BellOff size={11} strokeWidth={2} className="text-ink-300" />}
              提醒
            </span>
            <input
              type="datetime-local"
              value={remindAt ? toLocalInput(remindAt) : ''}
              min={toLocalInput(Date.now())}
              onChange={(e) => setRemindAt(fromLocalInput(e.target.value))}
              className="h-[24px] rounded-[6px] border border-ink-200/80 bg-white px-2 text-[11px] text-ink-600 outline-none transition-colors focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
            {remindAt && (
              <button
                type="button"
                onClick={() => setRemindAt(null)}
                className="flex items-center gap-1 rounded-[6px] px-1.5 py-[3px] text-[10.5px] text-ink-400 transition-colors hover:bg-ink-50 hover:text-rose-500"
              >
                <X size={10} strokeWidth={2.4} />
                清除
              </button>
            )}
            <span className="ml-auto text-[9.5px] text-ink-300">到点弹出系统通知</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
