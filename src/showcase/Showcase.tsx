import { ArrowUpRight, MousePointer2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Ball } from '../components/Ball'
import { BallMenu } from '../components/BallMenu'
import { Panel } from '../components/Panel'
import { QuickNote } from '../components/QuickNote'
import { NOTE_COLORS, COLOR_ORDER } from '../data/colors'
import { DesktopScene } from './DesktopScene'

const SECTIONS = [
  {
    id: 'desktop',
    no: '01',
    title: '桌面场景',
    desc: '1440 × 900 桌面下的真实层级：面板、半隐藏悬浮球、任务栏常驻。',
  },
  {
    id: 'ball',
    no: '02',
    title: '悬浮球',
    desc: '54px 玻璃球，四种形态 + 右键菜单。这是每天被看见最多的一块像素。',
  },
  {
    id: 'quick',
    no: '03',
    title: '速记条',
    desc: '单击球即展开，输入框自动聚焦；颜色、正文、快捷键提示在一屏内说完。',
  },
  {
    id: 'panel',
    no: '04',
    title: '管理面板',
    desc: '1080 × 720 主窗口：深墨绿侧栏 + 纸感便签网格，承载查找与整理。',
  },
  {
    id: 'settings',
    no: '05',
    title: '设置',
    desc: '左分组右内容，把「开机自启 / 快捷键 / 悬浮球 / 数据」收进四个小页。',
  },
  {
    id: 'spec',
    no: '06',
    title: '设计规范',
    desc: '色板、便签配色、尺寸与字阶——后续所有实现以此为准。',
  },
]

function Section({
  id,
  no,
  title,
  desc,
  children,
}: {
  id: string
  no: string
  title: string
  desc: string
  children: ReactNode
}) {
  return (
    <section id={id} className="mx-auto max-w-[1180px] scroll-mt-[72px] px-6 py-11">
      <div className="mb-6 flex items-start gap-4">
        <span className="mt-[3px] font-mono text-[11px] tracking-[0.1em] text-brand-400/70">
          {no}
        </span>
        <div className="min-w-0">
          <h2 className="text-[19px] leading-none font-semibold tracking-[-0.01em] text-white/90">
            {title}
          </h2>
          <p className="mt-2 text-[12px] leading-[19px] text-white/45">{desc}</p>
        </div>
        <div className="mt-3 hidden h-px flex-1 bg-white/[0.07] sm:block" />
      </div>
      {children}
    </section>
  )
}

function StateCell({
  title,
  desc,
  children,
}: {
  title: string
  desc: string
  children: ReactNode
}) {
  return (
    <div className="relative grid h-[176px] place-items-center bg-[#0a2425]">
      {children}
      <div className="absolute bottom-3 left-3.5">
        <div className="text-[11px] font-medium text-white/65">{title}</div>
        <div className="mt-[2px] text-[9.5px] text-white/30">{desc}</div>
      </div>
    </div>
  )
}

function Swatch({ hex, name, light }: { hex: string; name: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-9 w-9 shrink-0 rounded-[9px] ring-1 ring-white/10"
        style={{ background: hex }}
      />
      <div className="min-w-0">
        <div className={`text-[11px] ${light ? 'text-white/85' : 'text-white/70'}`}>{name}</div>
        <div className="font-mono text-[9.5px] tracking-wide text-white/30">
          {hex.toUpperCase()}
        </div>
      </div>
    </div>
  )
}

const BRAND = [
  ['brand-600', '#1C8F86'],
  ['brand-500', '#2CAF9F'],
  ['brand-400', '#55C9B8'],
  ['brand-200', '#B9ECE2'],
]
const INK = [
  ['ink-900', '#0B2A2B'],
  ['ink-800', '#10393A'],
  ['ink-500', '#45807C'],
  ['ink-200', '#D2E4E1'],
]
const MIST = [
  ['mist-500', '#6FA8D6'],
  ['mist-300', '#A9CFEA'],
  ['mist-200', '#CFE3F4'],
  ['mist-100', '#E2EEFA'],
]

const SIZES = [
  ['悬浮球', '54 px（窗口 74）', '球体 / 阴影留白'],
  ['速记条', '520 × 180 px', '圆角 18'],
  ['管理面板', '1080 × 720 px', '圆角 16'],
  ['便签卡片', '≈ 267 × 180 px', '圆角 14，三列'],
  ['侧边栏', '214 px', '深墨绿渐变'],
]

const TYPE = [
  {
    name: 'Display / 19 600',
    sample: '全部便签',
    style: 'text-[19px] font-semibold text-white/90',
  },
  {
    name: 'Title / 13 600',
    sample: '悬浮球交互稿 · 待评审',
    style: 'text-[13px] font-semibold text-white/80',
  },
  {
    name: 'Body / 11.5 172%',
    sample: '边缘吸附阈值 12px，松手后留 6px 半隐藏。',
    style: 'text-[11.5px] text-white/50',
  },
  { name: 'Caption / 10 400', sample: '12 分钟前 · #交互', style: 'text-[10px] text-white/30' },
]

export function Showcase() {
  return (
    <div className="spec-grid min-h-full bg-[#08201f] pb-16 text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#08201f]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[56px] max-w-[1180px] items-center gap-3 px-6">
          <img
            src="/logo.png"
            alt=""
            className="h-[26px] w-[26px] rounded-full ring-1 ring-white/15"
          />
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold tracking-wide">浮笺</span>
            <span className="text-[9px] tracking-[0.2em] text-white/25">FLOATMEMO</span>
          </div>
          <nav className="ml-6 hidden items-center gap-0.5 md:flex">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-md px-2.5 py-1.5 text-[11.5px] text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white/80"
              >
                {s.title}
              </a>
            ))}
          </nav>
          <a
            href="?win=panel"
            target="_blank"
            rel="noreferrer"
            className="ml-auto flex items-center gap-1.5 rounded-[8px] border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/70 transition-colors hover:bg-white/[0.1]"
          >
            打开面板窗口
            <ArrowUpRight size={11} strokeWidth={2.2} />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute -top-56 left-[30%] h-[560px] w-[560px] rounded-full bg-brand-500/[0.13] blur-3xl" />
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-10 px-6 pt-14 pb-12 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10.5px] text-white/55">
              <span className="h-[5px] w-[5px] rounded-full bg-brand-400" />
              界面设计稿 · 已接入本地存储，可新建 / 编辑 / 回收站还原
            </div>
            <h1 className="mt-5 text-[44px] leading-[1.08] font-semibold tracking-[-0.02em]">
              浮笺
              <span className="ml-3 text-[30px] font-normal tracking-normal text-white/25">
                FloatMemo
              </span>
            </h1>
            <p className="mt-3.5 max-w-[560px] text-[13.5px] leading-[24px] text-white/50">
              Windows 上的悬浮速记球 —— 半隐藏在屏幕边缘，单击展开输入条，3 秒完成一次记录。
              <br className="hidden sm:block" />
              所有便签本地存储、始终置顶、随叫随到。
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {['三窗口架构', '6 色便签', '54px 悬浮球', 'Tauri 2 + React 19'].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10.5px] text-white/45"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <span className="text-[10.5px] text-white/25">单独打开窗口</span>
              {[
                { label: '悬浮球', href: '?win=ball' },
                { label: '速记条', href: '?win=quick' },
                { label: '面板', href: '?win=panel' },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10.5px] text-white/55 transition-colors hover:bg-white/[0.09] hover:text-white/85"
                >
                  {l.label}
                  <ArrowUpRight size={10} className="text-white/25 group-hover:text-white/60" />
                </a>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute inset-0 rounded-full bg-brand-400/20 blur-[60px]" />
            <img
              src="/logo.png"
              alt="浮笺 Logo"
              className="animate-breathe relative h-[212px] w-[212px] rounded-full object-cover shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
            />
            <div className="mt-5 text-center font-mono text-[9.5px] tracking-[0.18em] text-white/25">
              WINDOWS · ALWAYS ON TOP
            </div>
          </div>
        </div>
      </section>

      {/* 设计原则 */}
      <div className="border-b border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid max-w-[1180px] gap-6 px-6 py-6 sm:grid-cols-3">
          {[
            { k: '纸感', v: '便签用低饱和纸色 + 第 1 层柔和投影，像真的贴在屏幕上。' },
            { k: '克制', v: '常驻像素只有 54px；所有面板都做成“用完就走”的临时层。' },
            { k: '一眼可读', v: '颜色即分类，标题即结论，正文四行封顶，不做信息堆叠。' },
          ].map((p) => (
            <div key={p.k} className="flex gap-3">
              <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-brand-400/70" />
              <div>
                <div className="text-[11.5px] font-medium text-white/70">{p.k}</div>
                <p className="mt-1 text-[10.5px] leading-[17px] text-white/38">{p.v}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Section id="desktop" no="01" title="桌面场景" desc={SECTIONS[0].desc}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2.5">
          <div className="overflow-x-auto">
            <div className="overflow-hidden rounded-[12px]">
              <Scaled width={1440} height={900} scale={0.7639}>
                <DesktopScene />
              </Scaled>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[10.5px] text-white/30">
          <span className="flex items-center gap-1.5">
            <MousePointer2 size={11} className="text-brand-400/70" />
            半隐藏球贴右边缘，仅露 10px（实现取 6px，预览放大便于观察）
          </span>
          <span>· 面板为独立窗口，关闭即销毁，释放 WebView 内存</span>
        </div>
      </Section>

      <Section id="ball" no="02" title="悬浮球" desc={SECTIONS[1].desc}>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-2 divide-white/[0.06] sm:grid-cols-4 sm:divide-x">
            <StateCell title="静止" desc="54px · 常驻桌面">
              <Ball />
            </StateCell>
            <StateCell title="悬停" desc="放大 6% + 青绿光晕">
              <div className="relative">
                <Ball state="hover" />
                <div className="absolute top-[calc(100%-4px)] left-1/2 -translate-x-1/2 rounded-md bg-white px-2 py-1 text-[9.5px] whitespace-nowrap text-ink-600 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)]">
                  单击速记 · 拖动移动
                </div>
              </div>
            </StateCell>
            <StateCell title="拖动中" desc="阴影加深 · 40% 透明">
              <Ball state="dragging" level={1} />
            </StateCell>
            <StateCell title="半隐藏" desc="贴边后仅留 6px">
              <div className="relative h-[176px] w-full overflow-hidden">
                <div className="absolute inset-y-0 right-0 w-px bg-white/[0.12]" />
                <div className="absolute top-1/2 right-[-54px] -translate-y-1/2">
                  <Ball />
                </div>
                <span className="absolute right-2 bottom-11 font-mono text-[8.5px] text-white/25">
                  6px
                </span>
              </div>
            </StateCell>
          </div>

          <div className="grid border-t border-white/[0.06] md:grid-cols-[1fr_300px] md:divide-x md:divide-white/[0.06]">
            <div className="p-6">
              <h3 className="text-[12.5px] font-medium text-white/75">右键菜单</h3>
              <p className="mt-1.5 max-w-[420px] text-[10.5px] leading-[18px] text-white/35">
                高频动作放最上，危险动作（退出）放最下并单独分隔。透明度做成三档而不是滑杆，避免在菜单里拖拽。
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  ['单击', '展开速记条（自动聚焦输入框）'],
                  ['右键', '呼出菜单：新建 / 面板 / 透明度 / 贴边 / 设置 / 退出'],
                  ['拖动', '松手后吸附最近的屏幕边缘'],
                  ['悬停 180ms', '半隐藏状态下自动滑出全显'],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-start gap-3 text-[10.5px]">
                    <span className="mt-[1px] w-[64px] shrink-0 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-[2px] text-center text-[9.5px] text-white/45">
                      {k}
                    </span>
                    <span className="leading-[16px] text-white/30">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid place-items-center bg-[#0a2425] p-6">
              <BallMenu />
            </div>
          </div>
        </div>
      </Section>

      <Section id="quick" no="03" title="速记条" desc={SECTIONS[2].desc}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0a2425] p-5">
            <div className="mb-4 flex items-center gap-2 text-[10.5px] text-white/35">
              <span className="h-[5px] w-[5px] rounded-full bg-brand-400/80" />
              空状态 · 等待输入
            </div>
            <div className="flex justify-center">
              <QuickNote />
            </div>
            <p className="mt-4 text-[10.5px] leading-[17px] text-white/38">
              展开即聚焦，占位文案只给一个最低成本的开始；底部固定显示 Enter /
              Esc，减少“记完怎么保存”的犹豫。
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a2425] p-5">
            <div className="mb-4 flex items-center gap-2 text-[10.5px] text-white/35">
              <span className="h-[5px] w-[5px] rounded-full bg-mist-400" />
              输入中 · 选中天蓝色
            </div>
            <div className="flex justify-center">
              <QuickNote
                color="sky"
                initialValue={
                  '把「失焦 1.5s 收起」改成「失焦 150ms 后判断焦点」\n否则拖到第二个屏幕时会误收。'
                }
              />
            </div>
            <p className="mt-4 text-[10.5px] leading-[17px] text-white/38">
              颜色条与便签色同步，选了色就记住；右键菜单与设置里都能改，不必重开窗口。
            </p>
          </div>
        </div>
      </Section>

      <Section id="panel" no="04" title="管理面板" desc={SECTIONS[3].desc}>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-[1080px] justify-center">
            <Panel />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['侧栏', '深墨绿压住整窗重心，选中项用 2.5px 青绿竖条 + 半透明白底。'],
            ['卡片', '6 色低饱和纸色，标题 13 加粗，正文最多四行，标签与时间贴底对齐。'],
            ['留白', '内容区 20px 边距、12px 卡间距，三列固定，不在窗口内做瀑布流。'],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
            >
              <div className="text-[10.5px] font-medium text-white/60">{k}</div>
              <p className="mt-1 text-[10px] leading-[16px] text-white/36">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            { label: '置顶便签', page: 'pinned' as const },
            { label: '回收站 · 空态', page: 'trash' as const },
          ].map((p) => (
            <div key={p.page}>
              <div className="mb-2 flex items-center gap-2 text-[10.5px] text-white/35">
                <span className="h-[4px] w-[4px] rounded-full bg-white/25" />
                {p.label}
                <span className="font-mono text-[9px] text-white/20">50%</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <Scaled width={1080} height={720} scale={0.5}>
                  <Panel page={p.page} />
                </Scaled>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="settings" no="05" title="设置" desc={SECTIONS[4].desc}>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-[1080px] justify-center">
            <Panel page="settings" />
          </div>
        </div>
      </Section>

      <Section id="spec" no="06" title="设计规范" desc={SECTIONS[5].desc}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="mb-4 text-[12px] font-medium text-white/70">主色板</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {BRAND.map(([n, h]) => (
                <Swatch key={n} name={n} hex={h} light />
              ))}
            </div>
            <div className="my-5 h-px bg-white/[0.07]" />
            <h3 className="mb-4 text-[12px] font-medium text-white/70">墨色</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {INK.map(([n, h]) => (
                <Swatch key={n} name={n} hex={h} />
              ))}
            </div>
            <div className="my-5 h-px bg-white/[0.07]" />
            <h3 className="mb-4 text-[12px] font-medium text-white/70">天蓝（Logo 便签头）</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {MIST.map(([n, h]) => (
                <Swatch key={n} name={n} hex={h} />
              ))}
            </div>
            <div className="my-5 h-px bg-white/[0.07]" />
            <h3 className="mb-4 text-[12px] font-medium text-white/70">界面色</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {[
                ['canvas', '#F4F7F9'],
                ['paper', '#FBFCFF'],
                ['line', '#E3EAEF'],
                ['ink-100', '#ECF4F2'],
              ].map(([n, h]) => (
                <Swatch key={n} name={n} hex={h} light />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="mb-4 text-[12px] font-medium text-white/70">便签六色</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {COLOR_ORDER.map((k) => {
                  const c = NOTE_COLORS[k]
                  return (
                    <div
                      key={k}
                      className="flex items-center gap-2.5 rounded-[10px] border border-white/[0.07] px-3 py-2.5"
                      style={{ background: c.bg }}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/5"
                        style={{ background: c.dot }}
                      />
                      <span className="text-[10.5px] font-medium" style={{ color: c.ink }}>
                        {c.label}
                      </span>
                      <span
                        className="ml-auto font-mono text-[8.5px]"
                        style={{ color: c.sub, opacity: 0.6 }}
                      >
                        {c.bg}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="mb-3 text-[12px] font-medium text-white/70">尺寸</h3>
              <ul className="divide-y divide-white/[0.06]">
                {SIZES.map(([k, v, d]) => (
                  <li key={k} className="flex items-baseline gap-3 py-[7px]">
                    <span className="w-[62px] shrink-0 text-[10.5px] text-white/45">{k}</span>
                    <span className="font-mono text-[10.5px] text-white/80">{v}</span>
                    <span className="ml-auto text-[9.5px] text-white/25">{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="mb-3.5 text-[12px] font-medium text-white/70">字阶</h3>
              <div className="space-y-2.5">
                {TYPE.map((t) => (
                  <div key={t.name} className="flex items-baseline gap-3">
                    <span className="w-[104px] shrink-0 font-mono text-[9px] text-white/25">
                      {t.name}
                    </span>
                    <span className={t.style}>{t.sample}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="mb-3 text-[12px] font-medium text-white/70">圆角与阴影</h3>
              <ul className="divide-y divide-white/[0.06]">
                {[
                  ['圆角', '窗口 16 · 速记 18 · 卡片 14 · 控件 8'],
                  ['窗口阴影', '0 40 90 -30 / 黑 50%'],
                  ['卡片阴影', '0 1 2 / 5% + 0 10 20 -16 / 45%'],
                  ['悬浮球', '0 10 22 -8 / 45% + 内高光'],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-baseline gap-3 py-[7px]">
                    <span className="w-[62px] shrink-0 text-[10.5px] text-white/45">{k}</span>
                    <span className="font-mono text-[10px] text-white/65">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <footer className="mx-auto mt-4 max-w-[1180px] border-t border-white/[0.07] px-6 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] text-white/45">界面稿 v0.1 · 2026-10-25</div>
            <p className="mt-1 text-[10px] text-white/25">
              下一步：Tauri 三窗口骨架 → 悬浮球拖拽与吸附 → SQLite 替换 localStorage
            </p>
          </div>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-5 w-5 rounded-full opacity-60" />
            <span className="text-[10px] tracking-[0.14em] text-white/20">FLOATMEMO · MIT</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Scaled({
  width,
  height,
  scale,
  children,
}: {
  width: number
  height: number
  scale: number
  children: ReactNode
}) {
  return (
    <div style={{ width: width * scale, height: height * scale }} className="overflow-hidden">
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}
