import { describe, expect, it } from 'vitest'
import type { Note } from '../../data/notes'
import { buildBackup, buildMarkdown, parseBackup } from '../backup'

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    title: '标题',
    content: '正文内容',
    color: 'yellow',
    pinned: false,
    archived: false,
    tags: ['工作'],
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_001_000,
    ...overrides,
  }
}

describe('buildBackup', () => {
  it('生成约定格式的备份文件', () => {
    const file = buildBackup([note()])
    expect(file.app).toBe('floatmemo')
    expect(file.version).toBe(1)
    expect(typeof file.exportedAt).toBe('number')
    expect(file.notes).toHaveLength(1)
  })
})

describe('parseBackup', () => {
  it('解析 { notes: [...] } 包装格式', () => {
    const text = JSON.stringify({ notes: [note({ id: 'a', tags: ['#工作', '生活'] })] })
    const notes = parseBackup(text)
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe('a')
    // 导入时标签会规整：去掉 #、去重
    expect(notes[0].tags).toEqual(['工作', '生活'])
  })

  it('解析直接是数组的格式', () => {
    const text = JSON.stringify([note({ id: 'b' })])
    const notes = parseBackup(text)
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe('b')
  })

  it('空内容且无标题的便签被跳过', () => {
    const text = JSON.stringify({ notes: [{ id: 'x', content: '', title: '  ' }] })
    expect(() => parseBackup(text)).toThrow('没有解析到可导入的便签')
  })

  it('非法 JSON 抛出中文错误', () => {
    expect(() => parseBackup('not json')).toThrow('不是合法的 JSON 文件')
  })

  it('没有 notes 字段抛出中文错误', () => {
    expect(() => parseBackup('{"foo": 1}')).toThrow('文件里没有找到便签数据')
  })

  it('重复 id 自动追加后缀避免冲突', () => {
    const text = JSON.stringify({ notes: [note({ id: 'same' }), note({ id: 'same' })] })
    const notes = parseBackup(text)
    expect(notes[0].id).toBe('same')
    expect(notes[1].id).toMatch(/^same-1$/)
  })

  it('非法颜色回落到黄色', () => {
    const text = JSON.stringify({ notes: [note({ color: 'neon' as never })] })
    expect(parseBackup(text)[0].color).toBe('yellow')
  })

  it('无标题时用正文首行兜底', () => {
    const text = JSON.stringify({ notes: [note({ title: '', content: '首行标题内容' })] })
    expect(parseBackup(text)[0].title).toBe('首行标题内容')
  })
})

describe('buildMarkdown', () => {
  it('包含标题、标签与更新时间', () => {
    const md = buildMarkdown([note()])
    expect(md).toContain('# 浮笺便签导出')
    expect(md).toContain('## 标题')
    expect(md).toContain('#工作')
    expect(md).toContain('更新于')
  })

  it('回收站便签标注（回收站）', () => {
    const md = buildMarkdown([note({ archived: true })])
    expect(md).toContain('## 标题（回收站）')
  })
})