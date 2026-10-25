import { useState } from 'react'
import { collapseBall, expandQuick, isDesktop } from '../lib/desktop'
import { useNotesStore } from '../stores/notes'
import { Ball } from './Ball'
import { QuickNote } from './QuickNote'

type Mode = 'ball' | 'quick'

/** 桌面悬浮球窗口：点击球就地展开速记条，保存/Esc 收回。与速记共用同一 webview。 */
export function BallWindow() {
  const [hover, setHover] = useState(false)
  const [mode, setMode] = useState<Mode>('ball')
  const addNote = useNotesStore((s) => s.addNote)

  async function openQuick() {
    if (isDesktop) {
      const ok = await expandQuick().catch(() => false)
      if (!ok) return
    }
    setMode('quick')
  }

  async function closeQuick() {
    setMode('ball')
    if (isDesktop) await collapseBall().catch(() => undefined)
  }

  if (mode === 'quick') {
    return (
      <div className="grid h-full w-full place-items-center p-2">
        <QuickNote
          autoFocus
          onSave={(draft) => {
            addNote({ title: '', content: draft.content, color: draft.color })
            void closeQuick()
          }}
          onCancel={() => void closeQuick()}
        />
      </div>
    )
  }

  return (
    <div
      className="flex h-full w-full items-center justify-start"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-label="浮笺悬浮球：单击速记"
        onClick={() => void openQuick()}
        className="block cursor-pointer"
      >
        <Ball state={hover ? 'hover' : 'idle'} />
      </button>
    </div>
  )
}
