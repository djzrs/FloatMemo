import { MousePointerClick, Sticker, X } from 'lucide-react'
import { useState } from 'react'
import { NOTE_COLORS } from '../data/colors'
import type { Note } from '../data/notes'
import { moveStickerBy, setStickerClickThrough } from '../lib/desktop'
import { MarkdownPreview } from './MarkdownPreview'

type Props = {
  note: Note
  onExit: () => void
}

/**
 * 贴纸模式：把便签「钉」在桌面上。
 * 无边框透明置顶小窗，支持拖动摆放与点击穿透（穿透后从托盘「退出贴纸」恢复）。
 */
export function StickerNote({ note, onExit }: Props) {
  const [through, setThrough] = useState(false)
  const c = NOTE_COLORS[note.color]

  const toggleThrough = () => {
    const next = !through
    setThrough(next)
    void setStickerClickThrough(next).catch(() => setThrough(!next))
  }

  /** 按住拖动：自算位移（不吸附，可摆到任意位置） */
  const beginDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const startX = e.screenX
    const startY = e.screenY
    let lastX = startX
    let lastY = startY
    let moved = false

    const stop = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', stop)
    }
    const onMove = (ev: MouseEvent) => {
      if (!moved) {
        if (Math.abs(ev.screenX - startX) + Math.abs(ev.screenY - startY) < 4) return
        moved = true
      }
      const dx = ev.screenX - lastX
      const dy = ev.screenY - lastY
      lastX = ev.screenX
      lastY = ev.screenY
      if (dx === 0 && dy === 0) return
      void moveStickerBy(dx, dy).catch(() => undefined)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', stop)
  }

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[14px] border shadow-[0_16px_36px_-14px_rgba(6,29,29,0.45)]"
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
        boxShadow: '0 2px 6px rgba(15,45,45,0.08), 0 18px 40px -18px rgba(15,45,45,0.5)',
      }}
    >
      {/* 顶部工具条 */}
      <div
        className="flex h-[34px] shrink-0 items-center gap-1.5 border-b px-2.5 select-none"
        style={{ borderColor: c.border, background: 'rgba(255,255,255,0.4)' }}
        onMouseDown={beginDrag}
      >
        <Sticker size={12} strokeWidth={2} style={{ color: c.sub }} />
        <span
          className="min-w-0 flex-1 truncate text-[12px] font-semibold"
          style={{ color: c.ink }}
        >
          {note.title || '无标题便签'}
        </span>

        <button
          type="button"
          title={through ? '关闭点击穿透（需从托盘恢复）' : '开启点击穿透：鼠标事件穿过贴纸'}
          onClick={toggleThrough}
          onMouseDown={(e) => e.stopPropagation()}
          className={`flex h-[22px] items-center gap-1 rounded-[6px] px-1.5 text-[10px] font-medium transition-colors ${
            through ? 'bg-brand-600 text-white' : 'bg-white/70 text-ink-500 hover:bg-white'
          }`}
          style={through ? undefined : { color: c.sub }}
        >
          <MousePointerClick size={10.5} strokeWidth={2.2} />
          {through ? '已穿透' : '穿透'}
        </button>

        <button
          type="button"
          title="退出贴纸模式，恢复悬浮球"
          onClick={onExit}
          onMouseDown={(e) => e.stopPropagation()}
          className="grid h-[22px] w-[22px] place-items-center rounded-[6px] text-ink-400 transition-colors hover:bg-white/80 hover:text-rose-500"
        >
          <X size={13} strokeWidth={2.2} />
        </button>
      </div>

      {/* 便签内容（Markdown 渲染） */}
      <div className="min-h-0 flex-1">
        <MarkdownPreview content={note.content} className="px-3.5 py-2.5" />
      </div>

      {/* 穿透提示 */}
      {through && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink-900/80 py-1.5 text-[10px] text-white/90">
          鼠标已穿透 · 从托盘「退出贴纸」恢复
        </div>
      )}
    </div>
  )
}