import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PanelPage } from './Panel'
import { useSettingsStore } from '../stores/settings'
import {
  collapseBall,
  expandQuick,
  hideWindow,
  isDesktop,
  openPanelInBrowser,
  openPanelPage,
  quitApp,
  setBallHidden,
  showBallMenu,
  snapBall,
} from '../lib/desktop'
import { useNotesStore } from '../stores/notes'
import { Ball } from './Ball'
import { BallMenu } from './BallMenu'
import { Panel } from './Panel'
import { QuickNote } from './QuickNote'

type Mode = 'ball' | 'quick' | 'menu' | 'panel'

/** 桌面悬浮球窗口：单击速记、右键菜单、放大便签面板。四种形态共用同一个 webview。 */
export function BallWindow() {
  const [hover, setHover] = useState(false)
  const [mode, setMode] = useState<Mode>('ball')
  const [page, setPage] = useState<PanelPage>('notes')
  const [tucked, setTucked] = useState(false)
  const addNote = useNotesStore((s) => s.addNote)
  const ballOpacity = useSettingsStore((s) => s.ballOpacity)
  const halfHidden = useSettingsStore((s) => s.halfHidden)
  const minimizeToTray = useSettingsStore((s) => s.minimizeToTray)
  const patchSettings = useSettingsStore((s) => s.patch)

  const idleTimer = useRef<number | undefined>(undefined)
  const suppressClick = useRef(false)

  /** 半隐藏：静置 3 秒后滑出屏幕，只留一条边 */
  const armIdle = useCallback(() => {
    window.clearTimeout(idleTimer.current)
    if (!isDesktop || !halfHidden || mode !== 'ball') return
    idleTimer.current = window.setTimeout(() => {
      setTucked(true)
      void setBallHidden(true).catch(() => undefined)
    }, 3000)
  }, [halfHidden, mode])

  /** 滑回完整显示（悬停 / 拖拽结束 / 形态变化时） */
  const untuck = useCallback(() => {
    window.clearTimeout(idleTimer.current)
    if (tucked) {
      setTucked(false)
      void setBallHidden(false).catch(() => undefined)
    }
    armIdle()
  }, [tucked, armIdle])

  useEffect(() => {
    if (mode !== 'ball') {
      window.clearTimeout(idleTimer.current)
      return
    }
    if (tucked) {
      setTucked(false)
      void setBallHidden(false).catch(() => undefined)
    }
    armIdle()
    return () => window.clearTimeout(idleTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, armIdle])

  /** 按住拖动：超过阈值才交给系统拖窗，松手后吸附到最近的边 */
  const beginDrag = useCallback(
    (down: React.MouseEvent) => {
      if (!isDesktop || down.button !== 0) return
      const startX = down.clientX
      const startY = down.clientY
      let started = false

      const stop = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', stop)
      }
      const onMove = (e: MouseEvent) => {
        if (started) return
        if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) < 5) return
        started = true
        suppressClick.current = true
        stop()
        void (async () => {
          await getCurrentWindow().startDragging()
          await snapBall().catch(() => undefined)
          untuck()
        })()
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', stop)
    },
    [untuck],
  )

  const collapse = useCallback(async () => {
    setMode('ball')
    if (isDesktop) await collapseBall().catch(() => undefined)
  }, [])

  const openQuick = useCallback(async () => {
    if (isDesktop) {
      const ok = await expandQuick().catch(() => false)
      if (!ok) return
    }
    setMode('quick')
  }, [])

  const openMenu = useCallback(async () => {
    if (isDesktop) {
      const ok = await showBallMenu().catch(() => false)
      if (!ok) return
    }
    setMode('menu')
  }, [])

  const openPanel = useCallback(
    (target: PanelPage) => {
      if (!isDesktop) {
        openPanelInBrowser(target)
        return
      }
      void openPanelPage(target).catch(() => undefined)
    },
    [],
  )

  // Rust 侧（全局快捷键 / 托盘）通知的形态切换
  useEffect(() => {
    if (!isDesktop) return
    const cleanups: Array<() => void> = []
    const bind = async () => {
      cleanups.push(await listen('floatmemo://quick', () => setMode('quick')))
      cleanups.push(
        await listen<string>('floatmemo://panel', (e) => {
          const p = e.payload
          setPage(p === 'pinned' || p === 'trash' || p === 'settings' ? p : 'notes')
          setMode('panel')
        }),
      )
      cleanups.push(await listen('floatmemo://ball', () => setMode('ball')))
    }
    void bind()
    return () => cleanups.forEach((fn) => fn())
  }, [])

  // Esc 收起（面板不响应，避免编辑中断）
  useEffect(() => {
    if (mode === 'ball' || mode === 'panel') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void collapse()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, collapse])

  const level = ballOpacity
  const ballState = mode === 'menu' ? 'menu' : hover ? 'hover' : 'idle'

  if (mode === 'panel') {
    return (
      <div className="grid h-full w-full place-items-center">
        <Panel
          page={page}
          onClose={() => {
            // 关掉面板：默认收回悬浮球（进程常驻），关掉"最小化到托盘"则直接退出
            if (minimizeToTray) void collapse()
            else void quitApp()
          }}
          onMinimize={() => void hideWindow().catch(() => undefined)}
        />
      </div>
    )
  }

  if (mode === 'quick') {
    return (
      <div className="grid h-full w-full place-items-center p-2">
        <QuickNote
          autoFocus
          onSave={(draft) => {
            addNote({ title: '', content: draft.content, color: draft.color })
            void collapse()
          }}
          onCancel={() => void collapse()}
        />
      </div>
    )
  }

  if (mode === 'menu') {
    return (
      <div
        className="flex h-full w-full items-center justify-end gap-1 pr-2.5"
        onContextMenu={(e) => e.preventDefault()}
      >
        <BallMenu
          level={level}
          onLevelChange={(v) => patchSettings({ ballOpacity: v })}
          onNewNote={() => void openQuick()}
          onOpenPanel={() => openPanel('notes')}
          onSettings={() => openPanel('settings')}
          onQuit={() => void quitApp()}
        />
        <button
          type="button"
          aria-label="收起菜单"
          onClick={() => void collapse()}
          onContextMenu={(e) => {
            e.preventDefault()
            void collapse()
          }}
          className="block cursor-pointer"
        >
          <Ball state="menu" level={level} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex h-full w-full items-center justify-start"
      onMouseEnter={() => {
        setHover(true)
        untuck()
      }}
      onMouseLeave={() => {
        setHover(false)
        armIdle()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        void openMenu()
      }}
    >
      <button
        type="button"
        aria-label="浮笺悬浮球：单击速记，拖动贴边，右键菜单"
        onMouseDown={(e) => beginDrag(e)}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          void openQuick()
        }}
        className="block cursor-pointer"
      >
        <Ball state={ballState} level={level} />
      </button>
    </div>
  )
}
