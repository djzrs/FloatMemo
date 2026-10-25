import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/settings'
import {
  collapseBall,
  expandQuick,
  isDesktop,
  openPanelPage,
  quitApp,
  showBallMenu,
} from '../lib/desktop'
import { useNotesStore } from '../stores/notes'
import { Ball } from './Ball'
import { BallMenu } from './BallMenu'
import { QuickNote } from './QuickNote'

type Mode = 'ball' | 'quick' | 'menu'

/** 桌面悬浮球窗口：单击展开速记，右键展开菜单。三种形态共用同一个 webview。 */
export function BallWindow() {
  const [hover, setHover] = useState(false)
  const [mode, setMode] = useState<Mode>('ball')
  const addNote = useNotesStore((s) => s.addNote)
  const ballOpacity = useSettingsStore((s) => s.ballOpacity)
  const patchSettings = useSettingsStore((s) => s.patch)

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

  // 全局快捷键 Ctrl+Shift+N：Rust 侧展开窗口后通知前端切到速记态
  useEffect(() => {
    if (!isDesktop) return
    let unlisten: (() => void) | undefined
    void listen('floatmemo://quick', () => setMode('quick')).then((fn) => {
      unlisten = fn
    })
    return () => unlisten?.()
  }, [])

  // Esc 收起
  useEffect(() => {
    if (mode === 'ball') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void collapse()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, collapse])

  const level = ballOpacity
  const ballState = mode === 'menu' ? 'menu' : hover ? 'hover' : 'idle'

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
          onOpenPanel={() => {
            void openPanelPage('notes')
            void collapse()
          }}
          onSettings={() => {
            void openPanelPage('settings')
            void collapse()
          }}
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
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onContextMenu={(e) => {
        e.preventDefault()
        void openMenu()
      }}
    >
      <button
        type="button"
        aria-label="浮笺悬浮球：单击速记，右键菜单"
        onClick={() => void openQuick()}
        className="block cursor-pointer"
      >
        <Ball state={ballState} level={level} />
      </button>
    </div>
  )
}
