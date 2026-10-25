import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useState } from 'react'
import { BallWindow } from './components/BallWindow'
import { Panel, type PanelPage } from './components/Panel'
import { QuickNote } from './components/QuickNote'
import { hideWindow, isDesktop, takePanelPage } from './lib/desktop'
import { DesktopDemo } from './showcase/DesktopDemo'
import { Showcase } from './showcase/Showcase'
import { useNotesStore } from './stores/notes'
import { useSettingsStore } from './stores/settings'

const params = new URLSearchParams(window.location.search)
const hash = window.location.hash.replace(/^#\/?/, '')
// 桌面端直接按窗口 label 决定渲染哪个界面；浏览器预览用 query/hash
const label = isDesktop ? getCurrentWindow().label : null
const win = label ?? params.get('win') ?? (hash || null)
const demo = params.get('demo')
const rawPage = params.get('page')
const urlPage: PanelPage =
  rawPage === 'pinned' || rawPage === 'trash' || rawPage === 'settings' ? rawPage : 'notes'

export default function App() {
  const addNote = useNotesStore((s) => s.addNote)
  const animations = useSettingsStore((s) => s.animations)
  // 桌面端从托盘/球菜单打开面板时，目标页由 Rust 侧暂存，这里取走
  const [desktopPage, setDesktopPage] = useState<PanelPage>(urlPage)
  const page = isDesktop && win === 'panel' ? desktopPage : urlPage

  useEffect(() => {
    document.documentElement.dataset.motion = animations ? 'on' : 'off'
  }, [animations])

  useEffect(() => {
    if (!isDesktop || win !== 'panel') return
    void takePanelPage().then((p) => {
      if (p === 'pinned' || p === 'trash' || p === 'settings') setDesktopPage(p)
    })
  }, [])

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
