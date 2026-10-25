import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect } from 'react'
import { BallWindow } from './components/BallWindow'
import { Panel, type PanelPage } from './components/Panel'
import { QuickNote } from './components/QuickNote'
import { hideWindow, isDesktop } from './lib/desktop'
import { DesktopDemo } from './showcase/DesktopDemo'
import { Showcase } from './showcase/Showcase'
import { useNotesStore } from './stores/notes'
import { useSettingsStore } from './stores/settings'

const params = new URLSearchParams(window.location.search)
const hash = window.location.hash.replace(/^#\/?/, '')
// 桌面端只有一个窗口（球窗）：速记/菜单/面板都是它就地放大的形态，由 BallWindow 自己切换。
// 浏览器预览用 query/hash 路由。
const label = isDesktop ? getCurrentWindow().label : null
const win = label ?? params.get('win') ?? (hash || null)
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

  if (win === 'ball') return <BallWindow />

  if (win === 'quick') {
    return (
      <div className="grid h-full w-full place-items-center p-2">
        <QuickNote
          autoFocus
          onSave={(draft) => {
            addNote({ title: '', content: draft.content, color: draft.color })
            void hideWindow()
          }}
          onCancel={() => void hideWindow()}
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
