import {
  ChevronDown,
  Clock,
  LayoutGrid,
  List,
  Minus,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Settings,
  Square,
  Tags,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { COLOR_ORDER, NOTE_COLORS } from '../data/colors'
import { NOTES, TAG_LIST } from '../data/notes'
import { Logomark } from './Logomark'
import { NoteCard } from './NoteCard'
import { SettingsView } from './SettingsView'
import { TrashView } from './TrashView'

export type PanelPage = 'notes' | 'pinned' | 'trash' | 'settings'

function NavItem({
  icon: Icon,
  label,
  count,
  active,
}: {
  icon: LucideIcon
  label: string
  count: number
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={`relative mb-0.5 flex h-[32px] w-full items-center gap-2.5 rounded-[8px] px-2.5 text-[12.5px] transition-colors ${
        active
          ? 'bg-white/[0.09] text-white'
          : 'text-white/55 hover:bg-white/[0.05] hover:text-white/85'
      }`}
    >
      {active && (
        <span className="absolute top-1/2 left-0 h-[14px] w-[2.5px] -translate-y-1/2 rounded-full bg-brand-400" />
      )}
      <Icon size={14.5} strokeWidth={1.9} className={active ? 'text-brand-300' : 'text-white/35'} />
      <span>{label}</span>
      <span className="ml-auto text-[10px] tabular-nums text-white/25">{count}</span>
    </button>
  )
}

export function Panel({ page = 'notes' }: { page?: PanelPage }) {
  const [nav, setNav] = useState<PanelPage>(page)
  const pinned = NOTES.filter((n) => n.pinned)

  const titles: Record<PanelPage, string> = {
    notes: '全部便签',
    pinned: '置顶便签',
    trash: '回收站',
    settings: '设置',
  }

  return (
    <div className="window-shell flex h-[720px] w-[1080px] overflow-hidden rounded-[16px] border border-white/60 bg-canvas">
      {/* 侧边栏 */}
      <aside className="relative flex w-[214px] shrink-0 flex-col bg-[linear-gradient(180deg,#123c3d_0%,#0b2a2b_55%,#082324_100%)] px-3 pt-1 pb-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(44,175,159,0.18),transparent_70%)]" />

        <div className="relative flex h-[54px] items-center gap-2.5 px-1.5">
          <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-white/[0.08] ring-1 ring-white/10">
            <Logomark className="h-[21px] w-[21px]" />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] leading-none font-semibold tracking-[0.06em] text-white">
              浮笺
            </div>
            <div className="mt-[3px] text-[8px] leading-none tracking-[0.24em] text-white/30">
              FLOATMEMO
            </div>
          </div>
        </div>

        <div className="relative mt-2">
          <div className="px-2.5 pt-1 pb-1.5 text-[9px] font-medium tracking-[0.18em] text-white/25">
            便签
          </div>
          <NavItem
            icon={LayoutGrid}
            label="全部便签"
            count={NOTES.length}
            active={nav === 'notes'}
          />
          <NavItem icon={Pin} label="置顶" count={pinned.length} active={nav === 'pinned'} />
          <NavItem icon={Trash2} label="回收站" count={0} active={nav === 'trash'} />

          <div className="mt-3 flex items-center justify-between px-2.5 pt-1 pb-1.5">
            <span className="flex items-center gap-1.5 text-[9px] font-medium tracking-[0.18em] text-white/25">
              <Tags size={9.5} strokeWidth={2} />
              标签
            </span>
            <button
              type="button"
              className="text-[13px] leading-none text-white/30 hover:text-white/60"
            >
              +
            </button>
          </div>
          {TAG_LIST.map((t) => (
            <button
              key={t.name}
              type="button"
              className="mb-0.5 flex h-[28px] w-full items-center gap-2.5 rounded-[8px] px-2.5 text-[12px] text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/85"
            >
              <span className="h-[6px] w-[6px] rounded-full" style={{ background: t.dot }} />
              {t.name}
              <span className="ml-auto text-[10px] tabular-nums text-white/20">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="relative mt-auto">
          <div className="mx-1 mb-1.5 h-px bg-white/[0.07]" />
          <button
            type="button"
            onClick={() => setNav('settings')}
            className={`flex h-[32px] w-full items-center gap-2.5 rounded-[8px] px-2.5 text-[12.5px] transition-colors ${
              nav === 'settings'
                ? 'bg-white/[0.09] text-white'
                : 'text-white/55 hover:bg-white/[0.05] hover:text-white/85'
            }`}
          >
            <Settings
              size={14.5}
              strokeWidth={1.9}
              className={nav === 'settings' ? 'text-brand-300' : 'text-white/35'}
            />
            设置
          </button>
          <div className="mt-2.5 flex items-center justify-between px-2.5 text-[9px] text-white/25">
            <span>v0.1.0 · 界面预览</span>
            <span className="flex items-center gap-1">
              <span className="h-[5px] w-[5px] rounded-full bg-brand-400/80" />
              本地
            </span>
          </div>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[54px] shrink-0 items-center gap-3 border-b border-line/90 bg-white/70 px-5 backdrop-blur">
          <div className="relative w-[262px]">
            <Search
              size={14}
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-300"
            />
            <input
              placeholder="搜索标题、正文或标签…"
              className="h-[32px] w-full rounded-full border border-ink-200/70 bg-white pr-14 pl-8.5 text-[12px] text-ink-700 shadow-[0_1px_2px_rgba(15,45,45,0.03)] outline-none transition-shadow placeholder:text-ink-300 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-[5px] border border-ink-200/70 bg-ink-50 px-1.5 py-[1px] text-[9.5px] text-ink-400">
              Ctrl K
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-[9px] bg-ink-100/80 p-0.5">
              <button
                type="button"
                className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-white text-ink-700 shadow-[0_1px_2px_rgba(15,45,45,0.1)]"
                aria-label="网格视图"
              >
                <LayoutGrid size={13} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="grid h-[26px] w-[26px] place-items-center rounded-[7px] text-ink-400 hover:text-ink-600"
                aria-label="列表视图"
              >
                <List size={13} strokeWidth={2} />
              </button>
            </div>

            <div className="mx-0.5 h-[18px] w-px bg-line" />

            <button
              type="button"
              className="flex h-[32px] items-center gap-1.5 rounded-[8px] bg-brand-600 pr-2.5 pl-2.5 text-[12px] font-medium text-white shadow-[0_1px_2px_rgba(6,29,29,0.18)] transition-colors hover:bg-brand-700"
            >
              <Plus size={14} strokeWidth={2.4} />
              新建便签
            </button>

            {/* 自绘窗口控制 */}
            <div className="ml-0.5 flex items-center gap-0.5">
              <button
                type="button"
                aria-label="最小化"
                className="grid h-[28px] w-[30px] place-items-center rounded-[6px] text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              >
                <Minus size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="最大化"
                className="grid h-[28px] w-[30px] place-items-center rounded-[6px] text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              >
                <Square size={11} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="关闭"
                className="grid h-[28px] w-[30px] place-items-center rounded-[6px] text-ink-400 transition-colors hover:bg-[#E81123] hover:text-white"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </header>

        <main className="scroll-thin min-h-0 flex-1 overflow-hidden">
          {nav === 'settings' ? (
            <SettingsView />
          ) : nav === 'trash' ? (
            <TrashView />
          ) : (
            <div className="scroll-thin h-full overflow-y-auto px-5 pt-4 pb-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-[20px] leading-none font-semibold tracking-[-0.01em] text-ink-900">
                    {titles[nav]}
                    <span className="rounded-full bg-ink-100 px-1.5 py-[2px] text-[10px] leading-none font-medium text-ink-400">
                      {nav === 'pinned' ? pinned.length : NOTES.length}
                    </span>
                  </h2>
                  <p className="mt-1.5 text-[10.5px] text-ink-400">
                    {nav === 'pinned' ? '置顶的便签永远排在最前' : '共 12 条 · 最近更新 12 分钟前'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex h-[30px] items-center gap-1.5 rounded-full border border-ink-200/70 bg-white px-2.5 shadow-[0_1px_1px_rgba(15,45,45,0.03)]">
                    <span className="text-[10.5px] text-ink-400">颜色</span>
                    {COLOR_ORDER.map((k) => (
                      <span
                        key={k}
                        className="h-[9px] w-[9px] rounded-full ring-1 ring-black/5"
                        style={{ background: NOTE_COLORS[k].dot }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="flex h-[30px] items-center gap-1.5 rounded-[8px] border border-ink-200/70 bg-white px-2.5 text-[10.5px] text-ink-500 shadow-[0_1px_1px_rgba(15,45,45,0.03)] transition-colors hover:border-ink-300"
                  >
                    <Clock size={11} strokeWidth={2} />
                    最近更新
                    <ChevronDown size={11} className="text-ink-300" />
                  </button>
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-3 items-stretch gap-3">
                {(nav === 'pinned' ? pinned : NOTES).map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between px-0.5 text-[10px] text-ink-300">
                <span>已显示全部 {nav === 'pinned' ? pinned.length : NOTES.length} 条</span>
                <span className="flex items-center gap-1.5">
                  <MoreHorizontal size={12} />
                  拖动卡片可调整顺序
                </span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
