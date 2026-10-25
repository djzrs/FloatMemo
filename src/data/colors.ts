export type NoteColorKey = 'yellow' | 'mint' | 'sky' | 'rose' | 'lilac' | 'sand'

export type NoteColorStyle = {
  label: string
  bg: string
  border: string
  ink: string
  sub: string
  dot: string
}

export const NOTE_COLORS: Record<NoteColorKey, NoteColorStyle> = {
  yellow: {
    label: '柠檬黄',
    bg: '#FEF6DA',
    border: '#F1E3B2',
    ink: '#57430F',
    sub: '#7C6726',
    dot: '#F2C44E',
  },
  mint: {
    label: '薄荷绿',
    bg: '#E7F6EC',
    border: '#C9E8D5',
    ink: '#1D5037',
    sub: '#3D6C52',
    dot: '#6CCB93',
  },
  sky: {
    label: '天蓝',
    bg: '#E8F2FC',
    border: '#C9DEF2',
    ink: '#1E4362',
    sub: '#3D6483',
    dot: '#74AAD8',
  },
  rose: {
    label: '藕粉',
    bg: '#FCEDF1',
    border: '#F3D1DB',
    ink: '#6A293A',
    sub: '#8A4B5C',
    dot: '#EC8CA6',
  },
  lilac: {
    label: '淡紫',
    bg: '#F0EAFB',
    border: '#DCCFF2',
    ink: '#42306A',
    sub: '#5F4A86',
    dot: '#A98BE0',
  },
  sand: {
    label: '米白',
    bg: '#F6F3EA',
    border: '#E6DFCF',
    ink: '#484231',
    sub: '#6C6552',
    dot: '#C7BC98',
  },
}

export const COLOR_ORDER: NoteColorKey[] = ['yellow', 'mint', 'sky', 'rose', 'lilac', 'sand']
