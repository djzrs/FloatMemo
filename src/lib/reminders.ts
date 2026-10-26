import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'
import type { Note } from '../data/notes'
import { useNotesStore } from '../stores/notes'

/**
 * 到点提醒调度器。
 *
 * 每 10 秒扫一遍便签：remindAt 已到且本进程/历史未通知过 → 发系统通知。
 * 已通知记录持久化在 localStorage（key: floatmemo.notified-reminders），
 * 防止应用重启后对同一条提醒重复轰炸。
 */

const NOTIFIED_KEY = 'floatmemo.notified-reminders'
const CHECK_INTERVAL = 10_000

function loadNotified(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY)
    if (!raw) return new Set()
    const arr: unknown = JSON.parse(raw)
    if (Array.isArray(arr)) return new Set(arr.filter((x): x is string => typeof x === 'string'))
    return new Set()
  } catch {
    return new Set()
  }
}

let notified = loadNotified()

function persistNotified() {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified]))
  } catch {
    /* ignore */
  }
}

/** 提醒唯一键：同一便签同一次提醒只通知一次 */
function keyOf(note: Note): string {
  return `${note.id}:${note.remindAt}`
}

/** 清理已通知记录：便签已删除 / 提醒已清除时移除，避免集合无限膨胀 */
export function pruneNotified(notes: Note[]): void {
  const alive = new Set(notes.filter((n) => n.remindAt != null).map(keyOf))
  let changed = false
  for (const k of notified) {
    if (!alive.has(k)) {
      notified.delete(k)
      changed = true
    }
  }
  if (changed) persistNotified()
}

let permission: 'granted' | 'denied' | 'pending' = 'pending'

async function ensurePermission(): Promise<boolean> {
  if (permission === 'granted') return true
  if (permission === 'denied') return false
  try {
    const granted = await isPermissionGranted()
    if (granted) {
      permission = 'granted'
      return true
    }
    const res = await requestPermission()
    permission = res === 'granted' ? 'granted' : 'denied'
    return permission === 'granted'
  } catch {
    permission = 'denied'
    return false
  }
}

async function fire(note: Note): Promise<void> {
  const ok = await ensurePermission()
  if (!ok) return
  // 标题兜底 + 正文首行摘要（去 Markdown 标记，控制长度）
  const title = note.title.trim() || '浮笺提醒'
  const body =
    note.content
      .split('\n')
      .map((l) => l.replace(/^#{1,6}\s*/, '').replace(/[*_`>#]/g, '').trim())
      .find(Boolean)
      ?.slice(0, 60) ?? ''
  sendNotification({
    title,
    body,
  })
}

let started = false

/** 启动提醒调度（桌面端 App 挂载时调用一次） */
export function startReminderWatcher(): void {
  if (started || typeof window === 'undefined') return
  started = true

  const tick = () => {
    const notes = useNotesStore.getState().notes
    const now = Date.now()
    let fired = false
    for (const n of notes) {
      if (n.remindAt == null || n.archived) continue
      if (n.remindAt <= now) {
        const key = keyOf(n)
        if (notified.has(key)) continue
        notified.add(key)
        persistNotified()
        void fire(n)
        fired = true
      }
    }
    // 顺手清理已删除/清除的提醒记录
    if (fired || Math.random() < 0.01) pruneNotified(notes)
  }

  // 启动后立刻检查一次（可能应用刚打开就有到点提醒）
  tick()
  setInterval(tick, CHECK_INTERVAL)
}