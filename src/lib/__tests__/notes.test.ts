import { describe, expect, it } from 'vitest'
import { deriveTitle, normalizeTags, TAG_MAX_COUNT, TAG_MAX_LENGTH } from '../../stores/notes'

describe('deriveTitle', () => {
  it('空内容回落到「无标题便签」', () => {
    expect(deriveTitle('')).toBe('无标题便签')
    expect(deriveTitle('   \n  ')).toBe('无标题便签')
  })

  it('取正文首行作为标题', () => {
    expect(deriveTitle('这是第一行\n第二行')).toBe('这是第一行')
  })

  it('去掉 Markdown 标题前缀', () => {
    expect(deriveTitle('# 一级标题\n正文')).toBe('一级标题')
    expect(deriveTitle('###### 六级标题')).toBe('六级标题')
  })

  it('超过 24 字截断并加省略号', () => {
    const long = '这是一段非常非常长的正文内容，用来验证标题截断的逻辑是否正常工作'
    expect(deriveTitle(long)).toBe(`${long.slice(0, 24)}…`)
    expect(deriveTitle(long)).toHaveLength(25)
  })

  it('恰好 24 字不加省略号', () => {
    const exact = 'a'.repeat(24)
    expect(deriveTitle(exact)).toBe(exact)
  })

  it('忽略空行，找到第一个非空行', () => {
    expect(deriveTitle('\n\n   \n实际内容在这\n后面还有')).toBe('实际内容在这')
  })
})

describe('normalizeTags', () => {
  it('去除前导 # 与首尾空白', () => {
    expect(normalizeTags(['#工作', '## 生活', '  灵感  '])).toEqual(['工作', '生活', '灵感'])
  })

  it('空标签被丢弃', () => {
    expect(normalizeTags(['', '#', '   '])).toEqual([])
  })

  it('去重且保持顺序', () => {
    expect(normalizeTags(['工作', '工作', '#工作'])).toEqual(['工作'])
  })

  it('单个标签超过 12 字截断', () => {
    const long = 'x'.repeat(30)
    expect(normalizeTags([long])[0]).toHaveLength(TAG_MAX_LENGTH)
  })

  it('最多保留 8 个标签', () => {
    const many = Array.from({ length: 20 }, (_, i) => `tag${i}`)
    expect(normalizeTags(many)).toHaveLength(TAG_MAX_COUNT)
  })
})