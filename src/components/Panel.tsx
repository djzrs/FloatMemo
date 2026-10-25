import {
  Check,
  ChevronDown,
  Clock,
  LayoutGrid,
  List,
  Minus,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  SearchX,
  Settings,
  Tags,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR_ORDER, NOTE_COLORS, type NoteColorKey } from '../data/colors'
import type { Note } from '../data/notes'
import { formatDateTime, formatRelative } from '../lib/time'
import { closeWindow, minimizeWindow } from '../lib/desktop'
import { useNotesStore } from '../stores/notes'
import { DENSITY_STYLES, useSettingsStore } from '../stores/settings'
import { Logomark } from './Logomark'
import { NoteCard } from './NoteCard'
import { NoteEditor } from './NoteEditor'
import { NoteMenu } from './NoteMenu'
import { SettingsView } from './SettingsView'
import { TrashView } from './TrashView'

export type PanelPage = 'notes' | 'pinned' | 'trash' | 'settings'

type SortKey = 'updated' | 'created' | 'title'

const SORT_LABEL: Record<SortKey, string> = {
  updated: '最近更新',
  created: '创建时间',
  title: '标题',
}

const TAG_DOTS = COLOR_ORDER.map((key) => NOTE_COLORS[key].dot)

/** 标签取色用名称哈希，排序变化时颜色保持稳定 */
function tagDot(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 9973
  return TAG_DOTS[hash % TAG_DOTS.length]
}

/** 列表视图的一行 */
function NoteRow({
  note,
  onOpen,
  onTogglePin,
  onArchive,
}: {
  note: Note
  onOpen: () => void
  onTogglePin: () => void
  onArchive: () => void
}) {
  const c = NOTE_COLORS[note.color]
  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer items-center gap-3 border-b border-ink-100/70 px-3.5 py-[11px] transition-colors last:border-0 hover:bg-ink-50/70"
    >
      <span className="h-[22px] w-[3px] shrink-0 rounded-full" style={{ background: c.dot }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium" style={{ color: c.ink }}>
          {note.title}
        </div>
        <div className="mt-[2px] truncate text-[11px] text-ink-400">
          {note.content.trim() || '（空便签）'}
        </div>
      </div>
      <div className="hidden w-[112px] shrink-0 flex-wrap items-center gap-1 lg:flex">
        {note.tags.slice(0, 2).map((t) => (
          <span
            key={t}
            className="rounded-full bg-ink-50 px-1.5 py-[1px] text-[9.5px] text-ink-500"
          >
            #{t}
          </span>
        ))}
      </div>
      <time
        className="w-[64px] shrink-0 text-right text-[10.5px] text-ink-300"
        title={formatDateTime(note.updatedAt)}
      >
        {formatRelative(note.updatedAt)}
      </time>
      <button
        type="button"
        title={note.pinned ? '取消置顶' : '置顶'}
        onClick={(e) => {
          e.stopPropagation()
          onTogglePin()
        }}
        className={`grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full transition-opacity ${
          note.pinned ? 'text-brand-600 opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <Pin size={11} strokeWidth={2.2} fill={note.pinned ? 'currentColor' : 'none'} />
      </button>
      <NoteMenu
        pinned={note.pinned}
        onEdit={onOpen}
        onTogglePin={onTogglePin}
        onArchive={onArchive}
        triggerClassName="h-[22px] w-[22px] text-ink-400"
      />
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  count: number
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  const notes = useNotesStore((s) => s.notes)
  const addNote = useNotesStore((s) => s.addNote)
  const updateNote = useNotesStore((s) => s.updateNote)
  const togglePin = useNotesStore((s) => s.togglePin)
  const archiveNote = useNotesStore((s) => s.archiveNote)

  const [nav, setNav] = useState<PanelPage>(page)
  const [query, setQuery] = useState('')
  const [colorFilter, setColorFilter] = useState<NoteColorKey | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('updated')
  const [sortOpen, setSortOpen] = useState(false)
  const [editing, setEditing] = useState<{ note: Note | null } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const view = useSettingsStore((s) => s.defaultView)
  const density = useSettingsStore((s) => s.cardDensity)
  const defaultColor = useSettingsStore((s) => s.defaultColor)
  const patchSettings = useSettingsStore((s) => s.patch)

  const searchRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const activeNotes = useMemo(() => notes.filter((n) => !n.archived), [notes])
  const pinnedNotes = useMemo(() => activeNotes.filter((n) => n.pinned), [activeNotes])
  const trashCount = useMemo(() => notes.filter((n) => n.archived).length, [notes])

  const tagItems = useMemo(() => {
    const map = new Map<string, number>()
    activeNotes.forEach((n) => n.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)))
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count, dot: tagDot(name) }))
  }, [activeNotes])

  const list = useMemo(() => {
    const base = nav === 'pinned' ? pinnedNotes : activeNotes
    const q = query.trim().toLowerCase()
    return base
      .filter((n) => {
        if (colorFilter && n.color !== colorFilter) return false
        if (tagFilter && !n.tags.includes(tagFilter)) return false
        if (!q) return true
        return `${n.title}\n${n.content}\n${n.tags.join(' ')}`.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        if (sort === 'title') return a.title.localeCompare(b.title, 'zh-Hans-CN')
        if (sort === 'created') return b.createdAt - a.createdAt
        return b.updatedAt - a.updatedAt
      })
  }, [activeNotes, pinnedNotes, nav, query, colorFilter, tagFilter, sort])

  const hasFilter = Boolean(query.trim() || colorFilter || tagFilter)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setEditing({ note: null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1800)
  }

  const changeNav = (next: PanelPage) => {
    setNav(next)
    setTagFilter(null)
    setColorFilter(null)
  }

  const clearFilters = () => {
    setQuery('')
    setColorFilter(null)
    setTagFilter(null)
  }

  const latest = list.reduce((max, n) => Math.max(max, n.updatedAt), 0)

  return (
    <div className="window-shell relative flex h-[720px] w-[1080px] overflow-hidden rounded-[16px] border border-white/60 bg-canvas">
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
            count={activeNotes.length}
            active={nav === 'notes'}
            onClick={() => changeNav('notes')}
          />
          <NavItem
            icon={Pin}
            label="置顶"
            count={pinnedNotes.length}
            active={nav === 'pinned'}
            onClick={() => changeNav('pinned')}
          />
          <NavItem
            icon={Trash2}
            label="回收站"
            count={trashCount}
            active={nav === 'trash'}
            onClick={() => changeNav('trash')}
          />

          <div className="mt-3 flex items-center px-2.5 pt-1 pb-1.5">
            <span className="flex items-center gap-1.5 text-[9px] font-medium tracking-[0.18em] text-white/25">
              <Tags size={9.5} strokeWidth={2} />
              标签
            </span>
          </div>
          {tagItems.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => {
                if (nav !== 'notes' && nav !== 'pinned') changeNav('notes')
                setTagFilter(tagFilter === t.name ? null : t.name)
              }}
              className={`mb-0.5 flex h-[28px] w-full items-center gap-2.5 rounded-[8px] px-2.5 text-[12px] transition-colors ${
                tagFilter === t.name
                  ? 'bg-white/[0.07] text-white/90'
                  : 'text-white/50 hover:bg-white/[0.05] hover:text-white/85'
              }`}
            >
              <span className="h-[6px] w-[6px] rounded-full" style={{ background: t.dot }} />
              {t.name}
              <span className="ml-auto text-[10px] tabular-nums text-white/20">{t.count}</span>
            </button>
          ))}
          {tagItems.length === 0 && (
            <div className="px-2.5 py-1 text-[10px] text-white/20">暂无标签</div>
          )}
        </div>

        <div className="relative mt-auto">
          <div className="mx-1 mb-1.5 h-px bg-white/[0.07]" />
          <button
            type="button"
            onClick={() => changeNav('settings')}
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
        <header
          data-tauri-drag-region
          className="flex h-[54px] shrink-0 items-center gap-3 border-b border-line/90 bg-white/70 px-5 backdrop-blur"
        >
          <div className="relative w-[262px]">
            <Search
              size={14}
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-300"
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('')
              }}
              placeholder="搜索标题、正文或标签…"
              className="h-[32px] w-full rounded-full border border-ink-200/70 bg-white pr-14 pl-8.5 text-[12px] text-ink-700 shadow-[0_1px_2px_rgba(15,45,45,0.03)] outline-none transition-shadow placeholder:text-ink-300 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="清空搜索"
                className="absolute top-1/2 right-2 grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded-full text-ink-300 hover:bg-ink-100 hover:text-ink-500"
              >
                <X size={11} strokeWidth={2.4} />
              </button>
            ) : (
              <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-[5px] border border-ink-200/70 bg-ink-50 px-1.5 py-[1px] text-[9.5px] text-ink-400">
                Ctrl K
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-[9px] bg-ink-100/80 p-0.5">
              <button
                type="button"
                onClick={() => patchSettings({ defaultView: 'grid' })}
                className={`grid h-[26px] w-[26px] place-items-center rounded-[7px] transition-colors ${
                  view === 'grid'
                    ? 'bg-white text-ink-700 shadow-[0_1px_2px_rgba(15,45,45,0.1)]'
                    : 'text-ink-400 hover:text-ink-600'
                }`}
                aria-label="网格视图"
                aria-pressed={view === 'grid'}
              >
                <LayoutGrid size={13} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => patchSettings({ defaultView: 'list' })}
                className={`grid h-[26px] w-[26px] place-items-center rounded-[7px] transition-colors ${
                  view === 'list'
                    ? 'bg-white text-ink-700 shadow-[0_1px_2px_rgba(15,45,45,0.1)]'
                    : 'text-ink-400 hover:text-ink-600'
                }`}
                aria-label="列表视图"
                aria-pressed={view === 'list'}
              >
                <List size={13} strokeWidth={2} />
              </button>
            </div>

            <div className="mx-0.5 h-[18px] w-px bg-line" />

            <button
              type="button"
              onClick={() => setEditing({ note: null })}
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
                onClick={() => void minimizeWindow()}
                className="grid h-[28px] w-[30px] place-items-center rounded-[6px] text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              >
                <Minus size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => void closeWindow()}
                className="grid h-[28px] w-[30px] place-items-center rounded-[6px] text-ink-400 transition-colors hover:bg-[#E81123] hover:text-white"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          {nav === 'settings' ? (
            <SettingsView />
          ) : nav === 'trash' ? (
            <TrashView />
          ) : (
            <div className="scroll-thin h-full overflow-y-auto px-5 pt-4 pb-5">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-[20px] leading-none font-semibold tracking-[-0.01em] text-ink-900">
                    {nav === 'pinned' ? '置顶便签' : '全部便签'}
                    <span className="rounded-full bg-ink-100 px-1.5 py-[2px] text-[10px] leading-none font-medium text-ink-400">
                      {list.length}
                    </span>
                  </h2>
                  <p className="mt-1.5 truncate text-[10.5px] text-ink-400">
                    {hasFilter
                      ? [
                          tagFilter && `标签 #${tagFilter}`,
                          colorFilter && `颜色 · ${NOTE_COLORS[colorFilter].label}`,
                          query.trim() && `搜索「${query.trim()}」`,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : nav === 'pinned'
                        ? '置顶的便签永远排在最前'
                        : activeNotes.length === 0
                          ? '还没有便签，新建一条开始记录'
                          : `共 ${activeNotes.length} 条 · 最近更新 ${formatRelative(latest || Date.now())}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex h-[30px] items-center gap-1.5 rounded-full border border-ink-200/70 bg-white px-2.5 shadow-[0_1px_1px_rgba(15,45,45,0.03)]">
                    <button
                      type="button"
                      onClick={() => setColorFilter(null)}
                      className={`text-[10.5px] transition-colors ${
                        colorFilter ? 'text-ink-400 hover:text-ink-600' : 'text-ink-600'
                      }`}
                    >
                      颜色
                    </button>
                    {COLOR_ORDER.map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-label={NOTE_COLORS[k].label}
                        onClick={() => setColorFilter(colorFilter === k ? null : k)}
                        className={`h-[9px] w-[9px] rounded-full ring-1 transition-transform ${
                          colorFilter === k
                            ? 'scale-[1.3] ring-2 ring-ink-300'
                            : 'ring-black/5 hover:scale-110'
                        }`}
                        style={{ background: NOTE_COLORS[k].dot }}
                      />
                    ))}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSortOpen((v) => !v)}
                      className="flex h-[30px] items-center gap-1.5 rounded-[8px] border border-ink-200/70 bg-white px-2.5 text-[10.5px] text-ink-500 shadow-[0_1px_1px_rgba(15,45,45,0.03)] transition-colors hover:border-ink-300"
                    >
                      <Clock size={11} strokeWidth={2} />
                      {SORT_LABEL[sort]}
                      <ChevronDown size={11} className="text-ink-300" />
                    </button>

                    {sortOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20 cursor-default"
                          onClick={() => setSortOpen(false)}
                        />
                        <div className="absolute top-[34px] right-0 z-30 w-[132px] rounded-[10px] border border-ink-100 bg-white p-1 shadow-[0_18px_36px_-14px_rgba(6,29,29,0.35)]">
                          {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setSort(key)
                                setSortOpen(false)
                              }}
                              className="flex h-[28px] w-full items-center justify-between rounded-[7px] px-2 text-left text-[11.5px] text-ink-700 transition-colors hover:bg-ink-50"
                            >
                              {SORT_LABEL[key]}
                              {sort === key && <Check size={12} className="text-brand-600" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {list.length > 0 ? (
                view === 'grid' ? (
                  <div
                    className={`mt-3.5 grid grid-cols-3 items-stretch ${DENSITY_STYLES[density].gap}`}
                  >
                    {list.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onOpen={() => setEditing({ note })}
                        onTogglePin={() => togglePin(note.id)}
                        onArchive={() => {
                          archiveNote(note.id)
                          showToast('已移到回收站')
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-3.5 overflow-hidden rounded-[12px] border border-line bg-white shadow-[0_1px_2px_rgba(15,45,45,0.04)]">
                    {list.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        onOpen={() => setEditing({ note })}
                        onTogglePin={() => togglePin(note.id)}
                        onArchive={() => {
                          archiveNote(note.id)
                          showToast('已移到回收站')
                        }}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="mt-10 flex flex-col items-center justify-center pb-10">
                  <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-white ring-1 ring-ink-100">
                    <SearchX size={26} strokeWidth={1.5} className="text-ink-300" />
                  </div>
                  <h3 className="mt-4 text-[13.5px] font-semibold text-ink-700">
                    {hasFilter ? '没有找到匹配的便签' : '这里还没有便签'}
                  </h3>
                  <p className="mt-1.5 text-[11.5px] text-ink-400">
                    {hasFilter ? '换个关键词，或清除筛选条件' : '新建一条，随手把想法放进来'}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    {hasFilter && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="h-[30px] rounded-[8px] border border-ink-200/80 bg-white px-3 text-[11.5px] text-ink-600 transition-colors hover:bg-ink-50"
                      >
                        清除筛选
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing({ note: null })}
                      className="flex h-[30px] items-center gap-1.5 rounded-[8px] bg-brand-600 px-3 text-[11.5px] font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
                    >
                      <Plus size={13} strokeWidth={2.4} />
                      新建便签
                    </button>
                  </div>
                </div>
              )}

              {list.length > 0 && (
                <div className="mt-4 flex items-center justify-between px-0.5 text-[10px] text-ink-300">
                  <span>已显示全部 {list.length} 条</span>
                  <span className="flex items-center gap-1.5">
                    <MoreHorizontal size={12} />
                    点击可编辑
                  </span>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {editing && (
        <NoteEditor
          note={editing.note}
          defaultColor={defaultColor}
          onClose={() => setEditing(null)}
          onArchive={
            editing.note
              ? () => {
                  archiveNote(editing.note!.id)
                  setEditing(null)
                  showToast('已移到回收站')
                }
              : undefined
          }
          onSave={(draft) => {
            if (editing.note) {
              updateNote(editing.note.id, draft)
              showToast('已更新')
            } else {
              addNote(draft)
              showToast('已保存')
            }
            patchSettings({ defaultColor: draft.color })
            setEditing(null)
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900/92 px-3.5 py-1.5 text-[11.5px] text-white/95 shadow-[0_12px_24px_-10px_rgba(6,29,29,0.6)]">
          {toast}
        </div>
      )}
    </div>
  )
}
