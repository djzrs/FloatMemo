const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const pad = (n: number) => String(n).padStart(2, '0')

/** 列表里的相对时间：刚刚 / 12 分钟前 / 昨天 21:40 / 3 天前 */
export function formatRelative(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts)

  if (diff < MINUTE) return '刚刚'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`
  if (diff < 12 * HOUR) return `${Math.floor(diff / HOUR)} 小时前`

  const date = new Date(ts)
  const today = new Date(now)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const dayDiff = Math.round((startOfToday - startOfThatDay) / DAY)

  if (dayDiff <= 0) return `今天 ${pad(date.getHours())}:${pad(date.getMinutes())}`
  if (dayDiff === 1) return `昨天 ${pad(date.getHours())}:${pad(date.getMinutes())}`
  if (dayDiff < 7) return `${dayDiff} 天前`
  if (date.getFullYear() === today.getFullYear()) {
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
  }
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}

/** 详情/回收站里的完整时间 */
export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}
