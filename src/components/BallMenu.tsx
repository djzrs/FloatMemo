import { MapPin, NotebookPen, PanelLeft, Power, Settings2, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

type MenuItemProps = {
  icon: LucideIcon
  label: string
  hint?: string
  active?: boolean
  danger?: boolean
}

function MenuItem({ icon: Icon, label, hint, active, danger }: MenuItemProps) {
  return (
    <button
      type="button"
      className={`group flex h-8 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left transition-colors ${
        active
          ? 'bg-brand-50 text-brand-800'
          : danger
            ? 'text-ink-600 hover:bg-rose-50 hover:text-rose-600'
            : 'text-ink-700 hover:bg-ink-50'
      }`}
    >
      <Icon size={14.5} strokeWidth={1.9} className={active ? 'text-brand-600' : 'text-ink-400'} />
      <span className="text-[12.5px]">{label}</span>
      {hint && (
        <span className="ml-auto flex items-center gap-0.5 text-[10px] tracking-wide text-ink-300">
          {hint}
        </span>
      )}
    </button>
  )
}

function Divider() {
  return <div className="mx-2 my-1 h-px bg-ink-100" />
}

/** 悬浮球右键菜单 */
export function BallMenu({ level = 1 }: { level?: 0 | 1 | 2 }) {
  const [current, setCurrent] = useState<0 | 1 | 2>(level)
  const levels: { v: 0 | 1 | 2; label: string }[] = [
    { v: 0, label: '100%' },
    { v: 1, label: '85%' },
    { v: 2, label: '70%' },
  ]

  return (
    <div
      className="w-[228px] rounded-[14px] border border-white/80 bg-white/95 p-1.5 backdrop-blur-xl"
      style={{
        boxShadow:
          '0 24px 48px -18px rgba(6,29,29,0.55), 0 4px 12px -4px rgba(6,29,29,0.18), 0 0 0 1px rgba(6,29,29,0.03)',
      }}
    >
      <MenuItem icon={NotebookPen} label="新建便签" hint="Ctrl ⇧ N" active />
      <MenuItem icon={PanelLeft} label="打开便签面板" hint="Ctrl ⇧ M" />

      <Divider />

      <div className="px-2.5 pt-1 pb-1.5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] text-ink-400">悬浮球透明度</span>
          <span className="text-[11px] font-medium text-ink-600">
            {levels.find((l) => l.v === current)?.label}
          </span>
        </div>
        <div className="flex gap-1">
          {levels.map((l) => (
            <button
              key={l.v}
              type="button"
              onClick={() => setCurrent(l.v)}
              className={`h-[22px] flex-1 rounded-md border text-[10.5px] transition-all ${
                current === l.v
                  ? 'border-brand-400/60 bg-brand-100 text-brand-800'
                  : 'border-ink-100 bg-white text-ink-400 hover:border-ink-200'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="flex h-8 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left text-ink-700 transition-colors hover:bg-ink-50"
      >
        <MapPin size={14.5} strokeWidth={1.9} className="text-ink-400" />
        <span className="text-[12.5px]">贴边位置</span>
        <span className="ml-auto text-[11px] text-ink-400">自动 · 右侧</span>
      </button>

      <Divider />

      <MenuItem icon={Settings2} label="设置" />
      <MenuItem icon={Power} label="退出浮笺" danger />
    </div>
  )
}
