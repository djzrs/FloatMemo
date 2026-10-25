import { useEffect } from 'react'
import { Ball } from './components/Ball'
import { Panel, type PanelPage } from './components/Panel'
import { QuickNote } from './components/QuickNote'
import { DesktopDemo } from './showcase/DesktopDemo'
import { Showcase } from './showcase/Showcase'
import { useNotesStore } from './stores/notes'
import { useSettingsStore } from './stores/settings'

const params = new URLSearchParams(window.location.search)
const win = params.get('win')
const demo = params.get('demo')
const rawPage = params.get('page')
const page: PanelPage =
  rawPage === 'pinned' || rawPage === 'trash' || rawPage === 'settings' ? rawPage : 'notes'

export default function App() {
  const addNote = useNotesStore((s) => s.addNote)
  const animations = useSettingsStore((s) => s.animations)

  useEffect(() => {
    document.documentElement.dataset.motion = animations ? 'on' : 'off'
  }, [animations])

  if (demo === 'desktop') return <DesktopDemo />

  if (win === 'ball') {
    return (
      <div className="grid h-full w-full place-items-center">
        <Ball state="hover" />
      </div>
    )
  }

  if (win === 'quick') {
    return (
      <div className="grid h-full w-full place-items-center p-2">
        <QuickNote
          autoFocus
          onSave={(draft) => {
            addNote({ title: '', content: draft.content, color: draft.color })
            // Tauri 阶段：这里同时隐藏速记窗
          }}
        />
      </div>
    )
  }

  if (win === 'panel') {
    return (
      <div className="grid h-full w-full place-items-center">
        <Panel page={page} />
      </div>
    )
  }

  return <Showcase />
}
