import {
  ChevronDown,
  Circle,
  Database,
  FolderOpen,
  Info,
  Keyboard,
  Palette,
  SlidersHorizontal,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { COLOR_ORDER, NOTE_COLORS } from '../data/colors'

type SectionKey = 'general' | 'shortcut' | 'ball' | 'data' | 'about'

const NAV: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: 'general', label: '常规', icon: SlidersHorizontal },
  { key: 'shortcut', label: '快捷键', icon: Keyboard },
  { key: 'ball', label: '悬浮球', icon: Circle },
  { key: 'data', label: '数据', icon: Database },
  { key: 'about', label: '关于', icon: Info },
]

function Toggle({ on }: { on?: boolean }) {
  return (
    <span
      className={`relative inline-block h-[20px] w-[34px] shrink-0 rounded-full transition-colors ${
        on ? 'bg-brand-500' : 'bg-ink-200'
      }`}
    >
      <span
        className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(6,29,29,0.25)] transition-all ${
          on ? 'left-[16px]' : 'left-[2px]'
        }`}
      />
    </span>
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

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[24px] min-w-[24px] items-center justify-center rounded-[6px] border border-ink-200/90 border-b-[2px] bg-white px-1.5 font-sans text-[10.5px] font-medium text-ink-600">
      {children}
    </kbd>
  )
}

export function SettingsView() {
  const [active, setActive] = useState<SectionKey>('general')

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
              {active === 'general' && '启动方式与窗口行为'}
              {active === 'shortcut' && '全局快捷键在任何窗口下都可以唤起速记'}
              {active === 'ball' && '调整悬浮球的显隐、透明度与停靠位置'}
              {active === 'data' && '所有便签保存在本地 SQLite，不上传云端'}
              {active === 'about' && '关于浮笺'}
            </p>

            {active === 'general' && (
              <>
                <Card icon={SlidersHorizontal} title="启动与窗口">
                  <Row title="开机自启" desc="登录 Windows 后自动启动浮笺">
                    <Toggle on />
                  </Row>
                  <Row title="关闭面板时最小化到托盘" desc="进程常驻，悬浮球与快捷键继续可用">
                    <Toggle on />
                  </Row>
                  <Row title="界面语言" desc="需要重启生效">
                    <Select value="简体中文" />
                  </Row>
                </Card>

                <Card icon={Palette} title="外观与便签">
                  <Row title="默认便签颜色" desc="新建速记时预选的颜色">
                    <div className="flex items-center gap-1.5">
                      {COLOR_ORDER.map((k, i) => (
                        <span
                          key={k}
                          className={`h-[15px] w-[15px] rounded-full ${
                            i === 1 ? 'ring-2 ring-white ring-offset-1' : ''
                          }`}
                          style={{
                            background: NOTE_COLORS[k].dot,
                            boxShadow:
                              i === 1
                                ? `0 0 0 1px ${NOTE_COLORS[k].dot}`
                                : 'inset 0 0 0 1px rgba(0,0,0,0.07)',
                          }}
                        />
                      ))}
                    </div>
                  </Row>
                  <Row title="卡片密度" desc="影响管理面板中便签的正文字号与行高">
                    <div className="flex items-center gap-1 rounded-[8px] bg-ink-100/70 p-0.5">
                      {['紧凑', '标准', '宽松'].map((v, i) => (
                        <button
                          key={v}
                          type="button"
                          className={`h-[26px] rounded-[6px] px-2.5 text-[11px] transition-all ${
                            i === 1
                              ? 'bg-white font-medium text-ink-800 shadow-[0_1px_2px_rgba(15,45,45,0.1)]'
                              : 'text-ink-500'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </Row>
                  <Row title="界面缩放" desc="高分屏下界面偏小时可手动调大">
                    <Select value="跟随系统 · 100%" />
                  </Row>
                </Card>

                <Card icon={Zap} title="性能">
                  <Row title="关闭面板后释放内存" desc="面板关闭即销毁，仅悬浮球常驻（约 50MB）">
                    <Toggle on />
                  </Row>
                  <Row title="动画效果" desc="关闭后所有过渡变为瞬时切换，进一步降低占用">
                    <Toggle on />
                  </Row>
                </Card>

                <p className="px-1 text-[10.5px] leading-[17px] text-ink-300">
                  浮笺不联网、不上传任何数据；便签与设置全部保存在本机。
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
                  <Row title="恢复默认" desc="快捷键被其他程序占用时会在此处提示">
                    <button
                      type="button"
                      className="h-[28px] rounded-[7px] border border-ink-200/80 bg-white px-2.5 text-[11px] text-ink-600 transition-colors hover:bg-ink-50"
                    >
                      恢复默认
                    </button>
                  </Row>
                </Card>
                <Card icon={Info} title="提示">
                  <p className="py-2.5 text-[11px] leading-[18px] text-ink-500">
                    点击右侧组合键即可重新录制，按 Esc 退出录制。建议避开 Ctrl+Shift+S、Ctrl+Shift+V
                    等被常用软件占用的组合。
                  </p>
                </Card>
              </>
            )}

            {active === 'ball' && (
              <>
                <Card icon={Circle} title="外观与停靠">
                  <Row title="半隐藏" desc="贴边时只保留 6px，鼠标靠近自动滑出">
                    <Toggle on />
                  </Row>
                  <Row title="透明度" desc="拖动时仍会临时降到 80% 以便观察">
                    <div className="flex items-center gap-1 rounded-[8px] bg-ink-100/70 p-0.5">
                      {['100%', '85%', '70%'].map((v, i) => (
                        <button
                          key={v}
                          type="button"
                          className={`h-[26px] rounded-[6px] px-2.5 text-[11px] transition-all ${
                            i === 1
                              ? 'bg-white font-medium text-ink-800 shadow-[0_1px_2px_rgba(15,45,45,0.1)]'
                              : 'text-ink-500'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </Row>
                  <Row title="停靠边缘" desc="拖动松手后自动吸附到最近的屏幕边缘">
                    <Select value="自动（就近）" />
                  </Row>
                  <Row title="位置" desc="右侧 · 垂直 42%">
                    <button
                      type="button"
                      className="flex h-[28px] items-center gap-1.5 rounded-[7px] border border-ink-200/80 bg-white px-2.5 text-[11px] text-ink-600 transition-colors hover:bg-ink-50"
                    >
                      <Circle size={11} />
                      重置位置
                    </button>
                  </Row>
                </Card>
              </>
            )}

            {active === 'data' && (
              <>
                <Card icon={Database} title="存储">
                  <Row title="数据文件" desc="%APPDATA%\FloatMemo\memo.db">
                    <button
                      type="button"
                      className="flex h-[28px] items-center gap-1.5 rounded-[7px] border border-ink-200/80 bg-white px-2.5 text-[11px] text-ink-600 transition-colors hover:bg-ink-50"
                    >
                      <FolderOpen size={11} />
                      打开文件夹
                    </button>
                  </Row>
                  <Row title="便签数量" desc="含 2 条置顶，回收站 0 条">
                    <span className="text-[12px] text-ink-600 tabular-nums">12 条</span>
                  </Row>
                  <Row title="导入 / 导出" desc="支持 Markdown 与 JSON，方便迁移">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="h-[28px] rounded-[7px] border border-ink-200/80 bg-white px-2.5 text-[11px] text-ink-600 transition-colors hover:bg-ink-50"
                      >
                        导入
                      </button>
                      <button
                        type="button"
                        className="h-[28px] rounded-[7px] border border-ink-200/80 bg-white px-2.5 text-[11px] text-ink-600 transition-colors hover:bg-ink-50"
                      >
                        导出
                      </button>
                    </div>
                  </Row>
                </Card>
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
                    <p className="mt-0.5 text-[10.5px] text-ink-400">v0.1.0 · 界面预览版</p>
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
