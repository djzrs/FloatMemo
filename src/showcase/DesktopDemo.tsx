import { Check, FileText, Folder, Image } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Ball } from '../components/Ball'
import { BallMenu } from '../components/BallMenu'
import { Logomark } from '../components/Logomark'
import { QuickNote } from '../components/QuickNote'
import type { NoteColorKey } from '../data/colors'
import { useNotesStore } from '../stores/notes'

/**
 * 浏览器里的桌面演示：悬浮球贴右边缘半隐藏，悬停滑出，单击展开速记条。
 * 真实 Tauri 版本里，球与速记条分别是两个置顶窗口，交互逻辑与此一致。
 */
export function DesktopDemo() {
  const addNote = useNotesStore((s) => s.addNote)

  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [hover, setHover] = useState(false)
  const [level, setLevel] = useState<0 | 1 | 2>(0)
  const [justSaved, setJustSaved] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const ballRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const savedTimer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        ballRef.current?.contains(target) ||
        noteRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
      setMenu(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setMenu(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(
    () => () => {
      window.clearTimeout(savedTimer.current)
      window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2000)
  }

  const handleSave = (draft: { content: string; color: NoteColorKey }) => {
    addNote({ title: '', content: draft.content, color: draft.color })
    setOpen(false)
    setJustSaved(true)
    window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setJustSaved(false), 1800)
    showToast('已保存 · 可在便签面板中查看')
  }

  const ballOffset = hover || open || menu ? 0 : 58

  return (
    <div className="desktop-wallpaper relative h-full w-full overflow-clip">
      <div className="pointer-events-none absolute top-[-140px] right-[-60px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(44,175,159,0.22),transparent_65%)] blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-160px] left-[-80px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(111,168,214,0.16),transparent_65%)] blur-2xl" />

      {/* 演示说明 */}
      <div className="absolute top-5 left-5 z-10 flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/[0.08] ring-1 ring-white/10 backdrop-blur">
          <Logomark className="h-[20px] w-[20px]" />
        </div>
        <div>
          <div className="text-[12.5px] font-medium tracking-wide text-white/80">
            浮笺 · 桌面演示
          </div>
          <div className="mt-[2px] text-[9.5px] text-white/35">
            浏览器预览 · 真实版本中悬浮球是独立置顶窗口
          </div>
        </div>
      </div>

      {/* 桌面图标：只为氛围，不参与交互 */}
      <div className="pointer-events-none absolute top-[88px] left-6 z-0 flex flex-col gap-4 opacity-60">
        {[
          { icon: Folder, label: '项目' },
          { icon: FileText, label: '规划.md' },
          { icon: Image, label: 'logo.png' },
        ].map((it) => (
          <div key={it.label} className="flex w-[64px] flex-col items-center gap-1">
            <span className="grid h-[38px] w-[38px] place-items-center rounded-[9px] bg-white/[0.06] text-white/55 ring-1 ring-white/[0.06] backdrop-blur-sm">
              <it.icon size={17} strokeWidth={1.6} />
            </span>
            <span className="text-[9px] text-white/40">{it.label}</span>
          </div>
        ))}
      </div>

      {/* 悬浮球：贴右边缘，悬停/展开时滑出 */}
      <div
        ref={ballRef}
        className="absolute top-1/2 right-0 z-20"
        style={{
          transform: `translate(${ballOffset}px, -50%)`,
          transition: 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button
          type="button"
          aria-label="浮笺悬浮球：单击速记，右键菜单"
          onClick={() => {
            setOpen((v) => !v)
            setMenu(false)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu((v) => !v)
            setOpen(false)
          }}
          className="block cursor-pointer"
        >
          <Ball state={menu ? 'menu' : hover || open ? 'hover' : 'idle'} level={level} />
        </button>

        {justSaved && (
          <span className="pointer-events-none absolute top-[8px] left-[6px] grid h-[16px] w-[16px] place-items-center rounded-full bg-brand-500 text-white ring-2 ring-white">
            <Check size={9} strokeWidth={3.2} />
          </span>
        )}

        {hover && !open && !menu && (
          <div className="pointer-events-none absolute top-1/2 right-[calc(100%+2px)] -translate-y-1/2 rounded-md bg-white/95 px-2 py-1 text-[10px] whitespace-nowrap text-ink-600 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)]">
            单击速记
          </div>
        )}
      </div>

      {/* 速记条 */}
      {open && (
        <div ref={noteRef} className="absolute top-1/2 right-[84px] z-20 -translate-y-1/2">
          <QuickNote autoFocus onSave={handleSave} onCancel={() => setOpen(false)} />
        </div>
      )}

      {/* 右键菜单 */}
      {menu && (
        <div ref={menuRef} className="absolute top-1/2 right-[86px] z-30 -translate-y-1/2">
          <BallMenu
            level={level}
            onLevelChange={setLevel}
            onNewNote={() => {
              setMenu(false)
              setOpen(true)
            }}
            onOpenPanel={() => window.open('/?win=panel', '_blank', 'noopener')}
            onSettings={() => window.open('/?win=panel&page=settings', '_blank', 'noopener')}
            onQuit={() => {
              setMenu(false)
              showToast('演示环境不会退出进程')
            }}
          />
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/95 px-3.5 py-1.5 text-[11px] text-ink-700 shadow-[0_12px_28px_-10px_rgba(0,0,0,0.6)]">
          {toast}
        </div>
      )}

      {/* 任务栏 */}
      <div className="absolute inset-x-0 bottom-0 flex h-[52px] items-center gap-3 border-t border-white/[0.07] bg-[#072122]/65 px-4 backdrop-blur-2xl">
        <div className="flex items-center gap-1.5">
          <span className="relative grid h-[32px] w-[32px] place-items-center rounded-[9px] bg-white/[0.1] ring-1 ring-white/10">
            <Logomark className="h-[18px] w-[18px]" />
            <span className="absolute -bottom-[2px] left-1/2 h-[2px] w-[13px] -translate-x-1/2 rounded-full bg-brand-400" />
          </span>
          <span className="grid h-[32px] w-[32px] place-items-center rounded-[9px] bg-white/[0.04] text-white/35 ring-1 ring-white/[0.05]">
            <Folder size={14} strokeWidth={1.8} />
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-white/35">
          <span className="h-[5px] w-[5px] rounded-full bg-brand-400" />
          浮笺正在运行 · Ctrl + Shift + N 唤起速记
        </span>
        <span className="ml-auto text-[9.5px] text-white/25">
          单击球速记 · 右键菜单 · 点击空白收起
        </span>
      </div>
    </div>
  )
}
