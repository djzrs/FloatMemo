import { CornerDownLeft, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { COLOR_ORDER, NOTE_COLORS, type NoteColorKey } from '../data/colors'
import { Logomark } from './Logomark'

type Props = {
  value?: string
  color?: NoteColorKey
}

/** 速记条：单击悬浮球后展开的极速输入窗 */
export function QuickNote({ value = '', color = 'mint' }: Props) {
  const [current, setCurrent] = useState<NoteColorKey>(color)
  const tone = NOTE_COLORS[current]

  return (
    <div
      className="w-[520px] overflow-hidden rounded-[18px] border border-white/85 bg-[#fdfefe]/95 backdrop-blur-2xl"
      style={{
        boxShadow:
          '0 32px 64px -24px rgba(6,29,29,0.55), 0 8px 18px -8px rgba(6,29,29,0.25), 0 0 0 1px rgba(6,29,29,0.04)',
      }}
    >
      {/* 颜色条：随便签颜色变化 */}
      <div
        className="h-[3px] w-full"
        style={{
          background: `linear-gradient(90deg, ${tone.dot} 0%, ${tone.dot}66 55%, transparent 100%)`,
        }}
      />

      {/* 拖动区 */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <div className="flex h-4 w-4 items-center justify-center">
          <Logomark className="h-4 w-4" />
        </div>
        <span className="text-[11.5px] font-medium tracking-[0.14em] text-brand-700">速记</span>
        <span className="text-[10.5px] text-ink-300">记事不打断</span>

        <div className="ml-auto flex items-center gap-1.5">
          {COLOR_ORDER.map((key) => {
            const c = NOTE_COLORS[key]
            const active = key === current
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCurrent(key)}
                aria-label={c.label}
                className={`h-[13px] w-[13px] rounded-full border border-black/5 transition-transform ${
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
      </div>

      <div className="px-4 pt-2.5 pb-3">
        <textarea
          defaultValue={value}
          spellCheck={false}
          placeholder="随手记点什么…"
          className="h-[72px] w-full resize-none bg-transparent text-[14.5px] leading-[26px] text-ink-800 outline-none placeholder:text-ink-300"
        />
      </div>

      <div className="flex items-center justify-between border-t border-ink-100/80 bg-white/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <Kbd>
            <CornerDownLeft size={10} strokeWidth={2.2} />
            Enter
          </Kbd>
          <span className="text-[10.5px] text-ink-400">保存</span>
          <span className="text-ink-200">·</span>
          <Kbd>Esc</Kbd>
          <span className="text-[10.5px] text-ink-400">取消</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-ink-300">Shift + Enter 换行</span>
          <div className="mx-1 h-4 w-px bg-ink-100" />
          <button
            type="button"
            className="flex h-7 items-center gap-1 rounded-[7px] px-2 text-[12px] text-ink-500 transition-colors hover:bg-ink-50"
          >
            <X size={12} strokeWidth={2.2} />
            取消
          </button>
          <button
            type="button"
            className="flex h-7 items-center gap-1.5 rounded-[7px] bg-brand-600 px-2.5 text-[12px] font-medium text-white shadow-[0_1px_2px_rgba(6,29,29,0.2)] transition-colors hover:bg-brand-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[18px] items-center gap-1 rounded-[5px] border border-ink-200/80 bg-white px-1.5 text-[10px] font-medium text-ink-500 shadow-[0_1px_0_rgba(6,29,29,0.05)]">
      {children}
    </span>
  )
}
