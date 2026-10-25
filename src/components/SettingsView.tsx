import {
  ChevronDown,
  Circle,
  Database,
  Download,
  Info,
  Keyboard,
  Palette,
  SlidersHorizontal,
  Upload,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { COLOR_ORDER, NOTE_COLORS } from '../data/colors'
import { exportJson, exportMarkdown, parseBackup } from '../lib/backup'
import { autoStartEnabled, isDesktop, setAutoStart } from '../lib/desktop'
import { useNotesStore } from '../stores/notes'
import { useSettingsStore, type CardDensity, type PanelView } from '../stores/settings'
import { Ball } from './Ball'

type SectionKey = 'general' | 'shortcut' | 'ball' | 'data' | 'about'

const NAV: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: 'general', label: '常规', icon: SlidersHorizontal },
  { key: 'shortcut', label: '快捷键', icon: Keyboard },
  { key: 'ball', label: '悬浮球', icon: Circle },
  { key: 'data', label: '数据', icon: Database },
  { key: 'about', label: '关于', icon: Info },
]

function Toggle({ on, onChange }: { on: boolean; onChange?: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`relative inline-block h-[20px] w-[34px] shrink-0 rounded-full transition-colors ${
        on ? 'bg-brand-500' : 'bg-ink-200'
      }`}
    >
      <span
        className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(6,29,29,0.25)] transition-all ${
          on ? 'left-[16px]' : 'left-[2px]'
        }`}
      />
    </button>
  )
}

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-ink-100/80 py-[8px] last:border-0">
      <div className="min-w-0">
        <div className="text-[12.5px] text-ink-800">{title}</div>
        {desc && <div className="mt-[3px] text-[10.5px] leading-[16px] text-ink-400">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-2.5 overflow-hidden rounded-[12px] border border-line bg-white shadow-[0_1px_2px_rgba(15,45,45,0.04)]">
      <header className="flex items-center gap-2 border-b border-ink-100/80 bg-ink-50/60 px-4 py-2">
        <Icon size={13} strokeWidth={2} className="text-brand-600" />
        <h3 className="text-[12px] font-semibold tracking-[0.02em] text-ink-800">{title}</h3>
      </header>
      <div className="px-4 py-0.5">{children}</div>
    </section>
  )
}

function Select({ value }: { value: string }) {
  return (
    <button
      type="button"
      className="flex h-[30px] min-w-[104px] items-center justify-between gap-3 rounded-[8px] border border-ink-200/80 bg-white px-2.5 text-[11.5px] text-ink-700 shadow-[0_1px_1px_rgba(15,45,45,0.03)] transition-colors hover:border-ink-300"
    >
      {value}
      <ChevronDown size={12} className="text-ink-400" />
    </button>
  )
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-[8px] bg-ink-100/70 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`h-[26px] rounded-[6px] px-2.5 text-[11px] transition-all ${
            value === o.value
              ? 'bg-white font-medium text-ink-800 shadow-[0_1px_2px_rgba(15,45,45,0.1)]'
              : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[24px] min-w-[24px] items-center justify-center rounded-[6px] border border-ink-200/90 border-b-[2px] bg-white px-1.5 font-sans text-[10.5px] font-medium text-ink-600">
      {children}
    </kbd>
  )
}

function OutlineButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[28px] items-center gap-1.5 rounded-[7px] border border-ink-200/80 bg-white px-2.5 text-[11px] text-ink-600 transition-colors hover:bg-ink-50"
    >
      <Icon size={11} strokeWidth={2} />
      {label}
    </button>
  )
}

export function SettingsView() {
  const [active, setActive] = useState<SectionKey>('general')

  const settings = useSettingsStore()
  const notes = useNotesStore((s) => s.notes)
  const importNotes = useNotesStore((s) => s.importNotes)

  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const statusTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(statusTimer.current), [])

  // 桌面端：进入设置时对齐系统里真实的自启状态（用户可能在系统设置里改过）
  useEffect(() => {
    void autoStartEnabled().then((real) => {
      if (real !== null && real !== settings.autoStart) {
        settings.patch({ autoStart: real })
      }
    })
    // 只在挂载时对齐一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flash = (ok: boolean, text: string) => {
    setStatus({ ok, text })
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(null), 4000)
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    try {
      const parsed = parseBackup(await file.text())
      const added = importNotes(parsed)
      flash(true, added > 0 ? `已导入 ${added} 条便签` : '这些便签已经在列表里了')
    } catch (error) {
      flash(false, error instanceof Error ? error.message : '导入失败')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const activeCount = notes.filter((n) => !n.archived).length
  const pinnedCount = notes.filter((n) => n.pinned && !n.archived).length
  const trashCount = notes.filter((n) => n.archived).length

  return (
    <div className="flex h-full">
      <nav className="w-[148px] shrink-0 border-r border-ink-100/80 px-2.5 pt-4">
        <div className="px-2 pb-2 text-[9.5px] font-medium tracking-[0.18em] text-ink-300">
          设置
        </div>
        {NAV.map((n) => (
          <button
            key={n.key}
            type="button"
            onClick={() => setActive(n.key)}
            className={`mb-0.5 flex h-[32px] w-full items-center gap-2 rounded-[8px] px-2 text-left text-[12px] transition-colors ${
              active === n.key
                ? 'bg-brand-50 font-medium text-brand-800'
                : 'text-ink-500 hover:bg-ink-50'
            }`}
          >
            <n.icon
              size={14}
              strokeWidth={1.9}
              className={active === n.key ? 'text-brand-600' : 'text-ink-400'}
            />
            {n.label}
          </button>
        ))}
      </nav>

      <div className="relative min-w-0 flex-1">
        <div className="scroll-thin h-full overflow-y-auto px-6 py-3">
          <div className="max-w-[680px]">
            <h2 className="text-[16px] font-semibold tracking-tight text-ink-900">
              {NAV.find((n) => n.key === active)?.label}
            </h2>
            <p className="mt-1 mb-3.5 text-[11px] text-ink-400">
              {active === 'general' && '启动方式、默认外观与面板行为'}
              {active === 'shortcut' && '全局快捷键在任何窗口下都可以唤起速记'}
              {active === 'ball' && '调整悬浮球的显隐与透明度'}
              {active === 'data' && '便签全部保存在本地，可随时导出备份'}
              {active === 'about' && '关于浮笺'}
            </p>

            {active === 'general' && (
              <>
                <Card icon={SlidersHorizontal} title="启动与窗口">
                  <Row title="开机自启" desc="登录 Windows 后自动启动浮笺">
                    <Toggle
                      on={settings.autoStart}
                      onChange={() => {
                        const next = !settings.autoStart
                        settings.patch({ autoStart: next })
                        if (!isDesktop) return
                        void setAutoStart(next).then((ok) => {
                          if (ok) return
                          // 写系统启动项失败：回滚开关并提示
                          settings.patch({ autoStart: !next })
                          flash(false, '开机自启设置失败，请检查系统权限')
                        })
                      }}
                    />
                  </Row>
                  <Row title="关闭面板时最小化到托盘" desc="进程常驻，悬浮球与快捷键继续可用">
                    <Toggle
                      on={settings.minimizeToTray}
                      onChange={() => settings.patch({ minimizeToTray: !settings.minimizeToTray })}
                    />
                  </Row>
                  <Row title="界面语言" desc="需要重启生效">
                    <Select value="简体中文" />
                  </Row>
                </Card>

                <Card icon={Palette} title="外观与便签">
                  <Row title="默认便签颜色" desc="新建便签时预选的颜色，会记住上次选择">
                    <div className="flex items-center gap-1.5">
                      {COLOR_ORDER.map((key) => {
                        const c = NOTE_COLORS[key]
                        const on = settings.defaultColor === key
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-label={c.label}
                            onClick={() => settings.patch({ defaultColor: key })}
                            className={`h-[16px] w-[16px] rounded-full transition-transform ${
                              on
                                ? 'scale-[1.15] ring-2 ring-white ring-offset-1'
                                : 'hover:scale-110'
                            }`}
                            style={{
                              background: c.dot,
                              boxShadow: on
                                ? `0 0 0 1px ${c.dot}`
                                : 'inset 0 0 0 1px rgba(0,0,0,0.07)',
                            }}
                          />
                        )
                      })}
                    </div>
                  </Row>
                  <Row title="卡片密度" desc="影响标题字号、正文行高与显示行数">
                    <Segmented<CardDensity>
                      value={settings.cardDensity}
                      options={[
                        { value: 'compact', label: '紧凑' },
                        { value: 'cozy', label: '标准' },
                        { value: 'relaxed', label: '宽松' },
                      ]}
                      onChange={(v) => settings.patch({ cardDensity: v })}
                    />
                  </Row>
                  <Row title="默认视图" desc="打开面板时的排布方式">
                    <Segmented<PanelView>
                      value={settings.defaultView}
                      options={[
                        { value: 'grid', label: '网格' },
                        { value: 'list', label: '列表' },
                      ]}
                      onChange={(v) => settings.patch({ defaultView: v })}
                    />
                  </Row>
                </Card>

                <Card icon={Zap} title="性能">
                  <Row title="动画效果" desc="关闭后所有过渡瞬时完成，进一步降低占用">
                    <Toggle
                      on={settings.animations}
                      onChange={() => settings.patch({ animations: !settings.animations })}
                    />
                  </Row>
                  <Row title="空闲开销" desc="全部事件驱动，没有轮询与常驻计时器">
                    <span className="text-[11px] text-ink-400">0 轮询</span>
                  </Row>
                </Card>

                <p className="px-1 text-[10.5px] leading-[17px] text-ink-300">
                  开机自启与托盘行为需要 Tauri
                  桌面版支持；浏览器预览里只保存偏好，不会真的改动系统。
                </p>
              </>
            )}

            {active === 'shortcut' && (
              <>
                <Card icon={Keyboard} title="全局快捷键">
                  <Row title="唤起速记条" desc="任意窗口下按下，立即开始记录">
                    <div className="flex items-center gap-1">
                      <Key>Ctrl</Key>
                      <span className="text-[10px] text-ink-300">+</span>
                      <Key>Shift</Key>
                      <span className="text-[10px] text-ink-300">+</span>
                      <Key>N</Key>
                    </div>
                  </Row>
                  <Row title="打开便签面板" desc="查看、搜索与整理全部便签">
                    <div className="flex items-center gap-1">
                      <Key>Ctrl</Key>
                      <span className="text-[10px] text-ink-300">+</span>
                      <Key>Shift</Key>
                      <span className="text-[10px] text-ink-300">+</span>
                      <Key>M</Key>
                    </div>
                  </Row>
                  <Row title="面板内搜索" desc="光标在面板里时可直接按下">
                    <div className="flex items-center gap-1">
                      <Key>Ctrl</Key>
                      <span className="text-[10px] text-ink-300">+</span>
                      <Key>K</Key>
                    </div>
                  </Row>
                </Card>
                <Card icon={Info} title="说明">
                  <p className="py-2.5 text-[11px] leading-[18px] text-ink-500">
                    全局快捷键需要 Tauri 注册；面板内的 Ctrl + K
                    已可用。若快捷键被其他软件占用，桌面版会在托盘提示并允许改键。
                  </p>
                </Card>
              </>
            )}

            {active === 'ball' && (
              <>
                <Card icon={Circle} title="外观与停靠">
                  <Row title="半隐藏" desc="贴边时只保留 6px，鼠标靠近自动滑出">
                    <Toggle
                      on={settings.halfHidden}
                      onChange={() => settings.patch({ halfHidden: !settings.halfHidden })}
                    />
                  </Row>
                  <Row title="自动吸附边缘" desc="关掉后悬浮球可以停在屏幕任意位置">
                    <Toggle
                      on={settings.snapToEdge}
                      onChange={() => settings.patch({ snapToEdge: !settings.snapToEdge })}
                    />
                  </Row>
                  <Row title="透明度" desc="拖动时仍会临时降到 80% 以便观察">
                    <Segmented<0 | 1 | 2>
                      value={settings.ballOpacity}
                      options={[
                        { value: 0, label: '100%' },
                        { value: 1, label: '85%' },
                        { value: 2, label: '70%' },
                      ]}
                      onChange={(v) => settings.patch({ ballOpacity: v })}
                    />
                  </Row>
                  <Row title="实际效果" desc="在桌面演示里试一下贴边、悬停与右键菜单">
                    <OutlineButton
                      icon={Circle}
                      label="打开桌面演示"
                      onClick={() => window.open('/?demo=desktop', '_blank', 'noopener')}
                    />
                  </Row>
                </Card>

                <section className="overflow-hidden rounded-[12px] border border-line bg-white shadow-[0_1px_2px_rgba(15,45,45,0.04)]">
                  <header className="flex items-center justify-between border-b border-ink-100/80 bg-ink-50/60 px-4 py-2">
                    <span className="text-[12px] font-semibold tracking-[0.02em] text-ink-800">
                      预览
                    </span>
                    <span className="text-[10px] text-ink-400">贴右边缘时的两种状态</span>
                  </header>
                  <div className="grid grid-cols-2 gap-3 p-3">
                    <div className="relative h-[124px] overflow-clip rounded-[10px] bg-[#0a2526]">
                      <div className="pointer-events-none absolute -top-8 -left-6 h-28 w-28 rounded-full bg-brand-500/15 blur-2xl" />
                      <span className="absolute top-2.5 left-3 text-[9.5px] text-white/45">
                        悬停 / 展开
                      </span>
                      <div className="grid h-full place-items-center">
                        <Ball level={settings.ballOpacity} state="hover" />
                      </div>
                    </div>

                    <div className="relative h-[124px] overflow-clip rounded-[10px] bg-[#0a2526]">
                      <div className="pointer-events-none absolute -top-8 right-0 h-28 w-28 rounded-full bg-brand-500/15 blur-2xl" />
                      <span className="absolute top-2.5 left-3 text-[9.5px] text-white/45">
                        静止 / 贴边
                      </span>
                      <div
                        className="absolute top-1/2 right-0"
                        style={{
                          transform: `translate(${settings.halfHidden ? 58 : 0}px, -50%)`,
                          transition: 'transform 260ms cubic-bezier(0.2,0.8,0.2,1)',
                        }}
                      >
                        <Ball level={settings.ballOpacity} />
                      </div>
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/[0.15]" />
                      <span className="absolute bottom-2.5 left-3 text-[9.5px] text-white/40">
                        {settings.halfHidden ? '仅露 6px' : '完整显示'}
                        {' · '}
                        {['100%', '85%', '70%'][settings.ballOpacity]}
                      </span>
                    </div>
                  </div>
                </section>
              </>
            )}

            {active === 'data' && (
              <>
                <Card icon={Database} title="本地数据">
                  <Row title="便签数量" desc="不含回收站">
                    <span className="text-[12px] text-ink-600 tabular-nums">{activeCount} 条</span>
                  </Row>
                  <Row title="置顶 / 回收站" desc="回收站里的便签也会写进 JSON 备份">
                    <span className="text-[12px] text-ink-600 tabular-nums">
                      {pinnedCount} / {trashCount}
                    </span>
                  </Row>
                  <Row title="存储位置" desc="浏览器预览为 localStorage，桌面版为 SQLite">
                    <span className="font-mono text-[10.5px] text-ink-400">floatmemo.notes</span>
                  </Row>
                </Card>

                <Card icon={Upload} title="导入 / 导出">
                  <Row title="导出备份" desc="JSON 可原样导入，包含颜色、标签与回收站状态">
                    <div className="flex gap-1.5">
                      <OutlineButton
                        icon={Download}
                        label="JSON"
                        onClick={() => {
                          exportJson(notes)
                          flash(true, `已导出 ${notes.length} 条便签到 JSON`)
                        }}
                      />
                      <OutlineButton
                        icon={Download}
                        label="Markdown"
                        onClick={() => {
                          exportMarkdown(notes)
                          flash(true, `已导出 ${notes.length} 条便签到 Markdown`)
                        }}
                      />
                    </div>
                  </Row>
                  <Row title="导入备份" desc="选择之前导出的 JSON，重复的便签会自动跳过">
                    <OutlineButton
                      icon={Upload}
                      label="选择文件"
                      onClick={() => fileRef.current?.click()}
                    />
                  </Row>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => void handleFile(e.target.files?.[0])}
                  />
                  {status && (
                    <div
                      className={`py-2 text-[10.5px] ${
                        status.ok ? 'text-brand-700' : 'text-rose-600'
                      }`}
                    >
                      {status.text}
                    </div>
                  )}
                </Card>

                <p className="px-1 text-[10.5px] leading-[17px] text-ink-300">
                  Markdown 导出为单个文件，按「二级标题 + 标签 + 正文」组织，方便贴到别处。
                </p>
              </>
            )}

            {active === 'about' && (
              <div className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_1px_2px_rgba(15,45,45,0.04)]">
                <div className="flex items-center gap-3.5 border-b border-ink-100/80 bg-[linear-gradient(120deg,#f4fbf9,#eef4fa)] px-5 py-4">
                  <img
                    src="/logo.png"
                    alt="浮笺 Logo"
                    className="h-[58px] w-[58px] rounded-full bg-white object-cover shadow-[0_6px_16px_-8px_rgba(15,45,45,0.5)] ring-1 ring-white"
                  />
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-[15px] font-semibold text-ink-900">浮笺</h3>
                      <span className="text-[10.5px] tracking-[0.16em] text-ink-400">
                        FLOATMEMO
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-ink-400">v0.1.0 · 本地预览版</p>
                  </div>
                </div>
                <div className="px-5 py-3.5">
                  <p className="text-[11.5px] leading-[19px] text-ink-500">
                    一个永远在手边的随手记。悬浮球贴在屏幕边缘，单击展开输入条，3
                    秒完成一次记录；所有便签保存在本地，始终置顶、随叫随到。
                  </p>
                  <div className="mt-3.5 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-[28px] rounded-[7px] bg-brand-600 px-2.5 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
                    >
                      检查更新
                    </button>
                    <button
                      type="button"
                      className="h-[28px] rounded-[7px] border border-ink-200/80 bg-white px-2.5 text-[11px] text-ink-600 transition-colors hover:bg-ink-50"
                    >
                      GitHub 仓库
                    </button>
                    <span className="ml-auto text-[10.5px] text-ink-300">MIT License</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-canvas to-transparent" />
      </div>
    </div>
  )
}
