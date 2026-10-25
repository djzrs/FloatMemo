import { FileText, Folder, Globe, Image, Search, SquareTerminal } from 'lucide-react'
import { Ball } from '../components/Ball'
import { Panel } from '../components/Panel'
import { Logomark } from '../components/Logomark'

/** 模拟桌面：1440 × 900，用于展示真实的窗口层级关系 */
export function DesktopScene() {
  return (
    <div className="desktop-wallpaper relative h-[900px] w-[1440px] overflow-clip">
      {/* 环境光 */}
      <div className="pointer-events-none absolute top-[-120px] right-[-80px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(44,175,159,0.22),transparent_65%)] blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-160px] left-[-60px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(111,168,214,0.16),transparent_65%)] blur-2xl" />

      {/* 桌面图标：拟真系统桌面的一点点环境信息 */}
      <div className="absolute top-[38px] right-[28px] flex flex-col gap-5">
        {[
          { icon: Folder, label: '项目' },
          { icon: FileText, label: '规划.md' },
          { icon: Image, label: 'logo.png' },
        ].map((it) => (
          <div key={it.label} className="flex w-[74px] flex-col items-center gap-1.5">
            <span className="grid h-[42px] w-[42px] place-items-center rounded-[10px] bg-white/[0.07] text-white/60 ring-1 ring-white/[0.08] backdrop-blur-sm">
              <it.icon size={19} strokeWidth={1.6} />
            </span>
            <span className="text-[9.5px] text-white/45 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
              {it.label}
            </span>
          </div>
        ))}
      </div>

      {/* 面板窗口 */}
      <div className="absolute top-[46px] left-[54px]">
        <Panel />
      </div>

      {/* 半隐藏的悬浮球：贴右边缘，仅露出 10px */}
      <div className="absolute top-[352px] right-[-54px]">
        <Ball />
      </div>

      {/* 桌面右缘高光，示意屏幕边界 */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[1px] bg-white/15" />

      {/* 任务栏 */}
      <div className="absolute inset-x-0 bottom-0 flex h-[52px] items-center gap-2 border-t border-white/[0.07] bg-[#072122]/70 px-4 backdrop-blur-2xl">
        <div className="flex items-center gap-1.5">
          <span className="mr-1 grid h-8 w-8 place-items-center rounded-[8px] text-white/50">
            <Search size={15} strokeWidth={2} />
          </span>
          {[
            { icon: Globe, active: false },
            { icon: Folder, active: false },
            { icon: SquareTerminal, active: false },
          ].map((it, i) => (
            <span
              key={i}
              className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-white/[0.05] text-white/55 ring-1 ring-white/[0.05]"
            >
              <it.icon size={15} strokeWidth={1.8} />
            </span>
          ))}
          <span className="relative grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-white/[0.1] ring-1 ring-white/10">
            <Logomark className="h-[19px] w-[19px]" />
            <span className="absolute -bottom-[2px] left-1/2 h-[2px] w-[14px] -translate-x-1/2 rounded-full bg-brand-400" />
          </span>
        </div>

        <div className="ml-2 flex items-center gap-1.5 text-[10px] text-white/35">
          <span className="h-[5px] w-[5px] rounded-full bg-brand-400" />
          浮笺正在运行 · 快捷键 Ctrl+Shift+N
        </div>

        <div className="ml-auto text-right">
          <div className="text-[10.5px] leading-tight text-white/75 tabular-nums">18:02</div>
          <div className="text-[8.5px] leading-tight text-white/40 tabular-nums">2026/10/25</div>
        </div>
      </div>
    </div>
  )
}
