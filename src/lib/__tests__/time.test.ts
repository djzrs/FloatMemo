import { describe, expect, it } from 'vitest'
import { formatDateTime, formatRelative } from '../time'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// 固定「现在」：2026-10-27 15:04:05（本地时区）
const NOW = new Date(2026, 9, 27, 15, 4, 5).getTime()

describe('formatRelative', () => {
  it('1 分钟内显示「刚刚」', () => {
    expect(formatRelative(NOW - 5_000, NOW)).toBe('刚刚')
    expect(formatRelative(NOW, NOW)).toBe('刚刚')
  })

  it('1 小时内显示「N 分钟前」', () => {
    expect(formatRelative(NOW - 12 * MINUTE, NOW)).toBe('12 分钟前')
    expect(formatRelative(NOW - 59 * MINUTE, NOW)).toBe('59 分钟前')
  })

  it('12 小时内显示「N 小时前」', () => {
    expect(formatRelative(NOW - 3 * HOUR, NOW)).toBe('3 小时前')
    expect(formatRelative(NOW - 11 * HOUR, NOW)).toBe('11 小时前')
  })

  it('同一天显示「今天 HH:mm」', () => {
    // 13 小时前仍在当天（15:04 - 13h = 02:04），跨过 12 小时阈值进入日期分支
    expect(formatRelative(NOW - 13 * HOUR, NOW)).toBe('今天 02:04')
  })

  it('昨天显示「昨天 HH:mm」', () => {
    const yesterday = NOW - DAY
    expect(formatRelative(yesterday, NOW)).toBe('昨天 15:04')
  })

  it('7 天内显示「N 天前」', () => {
    expect(formatRelative(NOW - 3 * DAY, NOW)).toBe('3 天前')
  })

  it('同年更早显示「M 月 D 日」', () => {
    const ts = new Date(2026, 5, 12, 8, 30).getTime()
    expect(formatRelative(ts, NOW)).toBe('6 月 12 日')
  })

  it('跨年显示「YYYY/MM/DD」', () => {
    const ts = new Date(2025, 11, 31, 23, 59).getTime()
    expect(formatRelative(ts, NOW)).toBe('2025/12/31')
  })

  it('未来时间按「刚刚」处理（不显示负数）', () => {
    expect(formatRelative(NOW + HOUR, NOW)).toBe('刚刚')
  })
})

describe('formatDateTime', () => {
  it('输出完整日期时间', () => {
    const ts = new Date(2026, 0, 2, 9, 5).getTime()
    expect(formatDateTime(ts)).toBe('2026/01/02 09:05')
  })

  it('月份与日期补零', () => {
    const ts = new Date(2026, 9, 27, 15, 4).getTime()
    expect(formatDateTime(ts)).toBe('2026/10/27 15:04')
  })
})