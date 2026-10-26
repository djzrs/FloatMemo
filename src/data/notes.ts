import type { NoteColorKey } from './colors'

export type Note = {
  id: string
  title: string
  content: string
  color: NoteColorKey
  pinned: boolean
  /** 回收站：软删除 */
  archived: boolean
  tags: string[]
  createdAt: number
  updatedAt: number
  /** 提醒时间（毫秒时间戳）；未设置提醒时为 undefined */
  remindAt?: number
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** 首次启动时的示例便签：时间按「距现在多久」生成，只写入一次 */
export function createSeedNotes(now = Date.now()): Note[] {
  const seed = (
    id: string,
    ago: number,
    note: Pick<Note, 'title' | 'content' | 'color' | 'pinned' | 'tags'>,
  ): Note => ({
    ...note,
    id,
    archived: false,
    createdAt: now - ago,
    updatedAt: now - ago,
  })

  return [
    seed('n1', 12 * MINUTE, {
      title: '悬浮球交互稿 · 待评审',
      content:
        '边缘吸附阈值 12px，松手后留 6px 半隐藏；悬停 180ms 滑出全显，离开 1.6s 收回；拖动时球体透明度降到 80%。',
      color: 'yellow',
      pinned: true,
      tags: ['交互', '待办'],
    }),
    seed('n2', 1 * HOUR + 2 * MINUTE, {
      title: '周会纪要 · 10/24',
      content:
        '1. 先出界面稿，评审通过再进 W1\n2. 三窗口常驻内存预算控制在 60MB 内\n3. 开源协议定 MIT，README 中英双语\n4. 下周给悬浮球手感 demo',
      color: 'sky',
      pinned: false,
      tags: ['会议'],
    }),
    seed('n3', 2 * HOUR + 5 * MINUTE, {
      title: 'Rust 所有权 · 三条规则',
      content:
        '每个值有且只有一个所有者；所有者离开作用域，值即被释放；借用不转移所有权，同一时刻要么一个可变借用，要么多个不可变借用。',
      color: 'mint',
      pinned: false,
      tags: ['摘录'],
    }),
    seed('n4', 22 * HOUR, {
      title: '命名候选',
      content: '浮笺 / FloatMemo\n备选：贴笺、便签球、MemoBall、浮记\n域名：floatmemo.app 已被注册',
      color: 'lilac',
      pinned: true,
      tags: ['灵感'],
    }),
    seed('n5', 26 * HOUR, {
      title: '快捷键方案',
      content:
        'Ctrl + Shift + N　唤起速记条\nCtrl + Shift + M　打开便签面板\nEsc　取消并收起\nEnter　保存并收起（Shift+Enter 换行）',
      color: 'rose',
      pinned: false,
      tags: ['交互'],
    }),
    seed('n6', 33 * HOUR, {
      title: '本周待办',
      content: '☑ Logo 定稿\n☐ 界面稿走查\n☐ Tauri 三窗口配置\n☐ 写 README 骨架 + CI',
      color: 'sand',
      pinned: false,
      tags: ['待办'],
    }),
    seed('n7', 2 * DAY + 3 * HOUR, {
      title: 'DPI 适配备忘',
      content:
        '多屏不同缩放时，按所在 monitor 的 scale_factor 换算 logical 与 physical，位置不要用全局物理坐标保存，否则换屏就错位。',
      color: 'sky',
      pinned: false,
      tags: ['工程'],
    }),
    seed('n8', 2 * DAY + 5 * HOUR, {
      title: '灵感 · 贴纸模式',
      content:
        '把便签钉在桌面上：无边框 + 透明 + 点击穿透，像一张真的便利贴贴在屏幕上，可以随手挪。',
      color: 'yellow',
      pinned: false,
      tags: ['灵感'],
    }),
    seed('n9', 3 * DAY + 2 * HOUR, {
      title: '《深度工作》摘录',
      content:
        '注意力残留：从任务 A 切到任务 B 之后，仍有一部分注意力滞留在 A 上，切换越频繁残留越多。',
      color: 'mint',
      pinned: false,
      tags: ['摘录'],
    }),
  ]
}
