import type { NoteColorKey } from './colors'

export type Note = {
  id: string
  title: string
  content: string
  color: NoteColorKey
  pinned?: boolean
  tags: string[]
  time: string
  words: number
}

export const NOTES: Note[] = [
  {
    id: 'n1',
    title: '悬浮球交互稿 · 待评审',
    content:
      '边缘吸附阈值 12px，松手后留 6px 半隐藏；悬停 180ms 滑出全显，离开 1.6s 收回；拖动时球体透明度降到 80%。',
    color: 'yellow',
    pinned: true,
    tags: ['交互', '待办'],
    time: '12 分钟前',
    words: 86,
  },
  {
    id: 'n2',
    title: '周会纪要 · 10/24',
    content:
      '1. 先出界面稿，评审通过再进 W1\n2. 三窗口常驻内存预算控制在 60MB 内\n3. 开源协议定 MIT，README 中英双语\n4. 下周给悬浮球手感 demo',
    color: 'sky',
    tags: ['会议'],
    time: '1 小时前',
    words: 72,
  },
  {
    id: 'n3',
    title: 'Rust 所有权 · 三条规则',
    content:
      '每个值有且只有一个所有者；所有者离开作用域，值即被释放；借用不转移所有权，同一时刻要么一个可变借用，要么多个不可变借用。',
    color: 'mint',
    tags: ['摘录'],
    time: '2 小时前',
    words: 61,
  },
  {
    id: 'n4',
    title: '命名候选',
    content: '浮笺 / FloatMemo\n备选：贴笺、便签球、MemoBall、浮记\n域名：floatmemo.app 已被注册',
    color: 'lilac',
    pinned: true,
    tags: ['灵感'],
    time: '昨天 21:40',
    words: 34,
  },
  {
    id: 'n5',
    title: '快捷键方案',
    content:
      'Ctrl + Shift + N　唤起速记条\nCtrl + Shift + M　打开便签面板\nEsc　取消并收起\nEnter　保存并收起（Shift+Enter 换行）',
    color: 'rose',
    tags: ['交互'],
    time: '昨天 18:12',
    words: 45,
  },
  {
    id: 'n6',
    title: '本周待办',
    content: '☑ Logo 定稿\n☐ 界面稿走查\n☐ Tauri 三窗口配置\n☐ 写 README 骨架 + CI',
    color: 'sand',
    tags: ['待办'],
    time: '昨天 09:05',
    words: 28,
  },
  {
    id: 'n7',
    title: 'DPI 适配备忘',
    content:
      '多屏不同缩放时，按所在 monitor 的 scale_factor 换算 logical 与 physical，位置不要用全局物理坐标保存，否则换屏就错位。',
    color: 'sky',
    tags: ['工程'],
    time: '2 天前',
    words: 52,
  },
  {
    id: 'n8',
    title: '灵感 · 贴纸模式',
    content: '把便签钉在桌面上：无边框 + 透明 + 点击穿透，像一张真的便利贴贴在屏幕上，可以随手挪。',
    color: 'yellow',
    tags: ['灵感'],
    time: '2 天前',
    words: 42,
  },
  {
    id: 'n9',
    title: '《深度工作》摘录',
    content:
      '注意力残留：从任务 A 切到任务 B 之后，仍有一部分注意力滞留在 A 上，切换越频繁残留越多。',
    color: 'mint',
    tags: ['摘录'],
    time: '3 天前',
    words: 39,
  },
]

export type TagItem = { name: string; count: number; dot: string }

export const TAG_LIST: TagItem[] = [
  { name: '交互', count: 4, dot: '#74AAD8' },
  { name: '灵感', count: 3, dot: '#A98BE0' },
  { name: '待办', count: 3, dot: '#F2C44E' },
  { name: '摘录', count: 2, dot: '#6CCB93' },
  { name: '会议', count: 1, dot: '#EC8CA6' },
]
