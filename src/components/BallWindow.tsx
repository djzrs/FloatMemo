import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PanelPage } from './Panel'
import { useSettingsStore } from '../stores/settings'
import {
  collapseBall,
  expandQuick,
  hideWindow,
  isDesktop,
  openPanelInBrowser,
  moveBallBy,
  openPanelPage,
  quitApp,
  restoreBallPosition,
  setBallHidden,
  showBallMenu,
  snapBall,
} from '../lib/desktop'
import { flushNotes, useNotesStore } from '../stores/notes'
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
  // 递增这个值会让 Panel 聚焦搜索框（全局快捷键唤起搜索时用）
  const [focusSearch, setFocusSearch] = useState(0)
  const addNote = useNotesStore((s) => s.addNote)
  const ballOpacity = useSettingsStore((s) => s.ballOpacity)
  const halfHidden = useSettingsStore((s) => s.halfHidden)
  const snapToEdge = useSettingsStore((s) => s.snapToEdge)
  const minimizeToTray = useSettingsStore((s) => s.minimizeToTray)
  const ballPosition = useSettingsStore((s) => s.ballPosition)
  const snapToEdgeState = useSettingsStore((s) => s.snapToEdge)
  const patchSettings = useSettingsStore((s) => s.patch)

  const idleTimer = useRef<number | undefined>(undefined)
  const suppressClick = useRef(false)
  const modeRef = useRef(mode)
  modeRef.current = mode

  /** 半隐藏：静置 3 秒后滑出屏幕，只留一条边 */
  const armIdle = useCallback(() => {
    window.clearTimeout(idleTimer.current)
    if (!isDesktop || !halfHidden || mode !== 'ball') return
    idleTimer.current = window.setTimeout(() => {
      // 只有真正藏起来了才记状态（自由位置无处可藏）
      void setBallHidden(true).then((applied) => {
        if (applied) setTucked(true)
      })
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

  /**
   * 按住拖动：自己按鼠标位移移动窗口（不依赖系统原生拖窗，后者在本机不生效），
   * 超过阈值才算拖动以免吃掉单击，松手后吸附到最近的边。
   */
  const beginDrag = useCallback(
    (down: React.MouseEvent) => {
      if (!isDesktop || down.button !== 0) return
      down.preventDefault()
      const startX = down.screenX
      const startY = down.screenY
      let lastX = startX
      let lastY = startY
      let moved = false

      const stop = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', stop)
      }
      const onMove = (e: MouseEvent) => {
        if (!moved) {
          if (Math.abs(e.screenX - startX) + Math.abs(e.screenY - startY) < 5) return
          moved = true
          suppressClick.current = true
        }
        const dx = e.screenX - lastX
        const dy = e.screenY - lastY
        lastX = e.screenX
        lastY = e.screenY
        if (dx === 0 && dy === 0) return
        void moveBallBy(dx, dy).catch(() => undefined)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', () => {
        stop()
        if (!moved) return
        void snapBall(snapToEdge).catch(() => undefined)
        untuck()
      })
    },
    [untuck, snapToEdge],
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

  /** 退出前先把改动刷进 SQLite，避免丢掉最后一次编辑 */
  const quit = useCallback(async () => {
    await flushNotes().catch(() => undefined)
    await quitApp().catch(() => undefined)
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
      cleanups.push(
        await listen('floatmemo://search', () => {
          setPage('notes')
          setMode('panel')
          setFocusSearch((n) => n + 1)
        }),
      )
      // 拖动结束时 Rust 通知的球位置：自由态存下来，重启后还原
      cleanups.push(
        await listen<[boolean, [number, number] | null]>('floatmemo://ball-pos', (e) => {
          const pos = e.payload?.[1]
          patchSettings({
            ballPosition: pos ? { x: pos[0], y: pos[1] } : null,
          })
        }),
      )
    }
    void bind()
    return () => cleanups.forEach((fn) => fn())
  }, [])

  // 启动时按设置还原球的位置（Rust 静态默认贴边，需前端把上次存的值灌进去）
  useEffect(() => {
    if (!isDesktop) return
    const pos = ballPosition
    void restoreBallPosition(
      pos ? pos.x : null,
      pos ? pos.y : null,
      !snapToEdgeState,
    )
    // 只在挂载时还原一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /**
   * 失焦自动收起（规划 3.4 节）：
   * 速记条 / 右键菜单失去焦点时，150ms 后收回悬浮球（延时是为了防止点中本窗口元素时的瞬时失焦误收）。
   * 得焦即取消。面板是主工作区，不自动收起。
   * 窗口被隐藏时（托盘收起）也不触发，避免把藏起来的窗口重新弹出来。
   */
  useEffect(() => {
    if (!isDesktop) return
    let timer: number | undefined
    const cleanTimer = () => window.clearTimeout(timer)
    const cleanups: Array<() => void> = []
    const bind = async () => {
      cleanups.push(await listen('tauri://blur', () => {
        cleanTimer()
        const m = modeRef.current
        if (m !== 'quick' && m !== 'menu') return
        if (document.visibilityState === 'hidden') return
        timer = window.setTimeout(() => {
          const m2 = modeRef.current
          if (m2 !== 'quick' && m2 !== 'menu') return
          if (document.visibilityState === 'hidden') return
          void collapse()
        }, 150)
      }))
      cleanups.push(await listen('tauri://focus', () => {
        cleanTimer()
      }))
    }
    void bind()
    return () => {
      cleanTimer()
      cleanups.forEach((fn) => fn())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapse])

  const level = ballOpacity
  const ballState = mode === 'menu' ? 'menu' : hover ? 'hover' : 'idle'

  if (mode === 'panel') {
    return (
      <div className="grid h-full w-full place-items-center">
        <Panel
          page={page}
          focusSearch={focusSearch}
          onClose={() => {
            // 关掉面板：默认收回悬浮球（进程常驻），关掉"最小化到托盘"则直接退出
            if (minimizeToTray) void collapse()
            else void quit()
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
          onQuit={() => void quit()}
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
      className="flex h-full w-full items-center justify-start select-none"
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
