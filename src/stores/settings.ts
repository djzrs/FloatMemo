import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { NoteColorKey } from '../data/colors'

export type CardDensity = 'compact' | 'cozy' | 'relaxed'
export type PanelView = 'grid' | 'list'

/** MySQL 备份连接配置 */
export type MysqlConfig = {
  host: string
  port: number
  user: string
  password: string
  database: string
  table: string
  /** 加密方式：none=明文 / required=TLS 校验证书 / insecure=TLS 不校验 */
  sslMode: 'none' | 'required' | 'insecure'
  /** 自定义 CA 证书路径（可选） */
  caPath: string
}

export type Settings = {
  /** 新建便签的默认颜色（也会记住上次使用的颜色） */
  defaultColor: NoteColorKey
  /** 卡片密度：影响标题字号、正文字号与行数上限 */
  cardDensity: CardDensity
  /** 关掉后所有过渡动画瞬时完成 */
  animations: boolean
  /** 悬浮球透明度 0=100% / 1=85% / 2=70% */
  ballOpacity: 0 | 1 | 2
  /** 贴边时是否只露 6px */
  halfHidden: boolean
  /** 拖到边缘附近时自动吸附；关掉后球可以停在任何位置 */
  snapToEdge: boolean
  defaultView: PanelView
  /** 以下两项需要 Tauri 层才能真正生效，先存下来 */
  autoStart: boolean
  minimizeToTray: boolean
  /** MySQL 备份配置（密码只保存在本机） */
  mysql: MysqlConfig
}

type SettingsState = Settings & {
  patch: (partial: Partial<Settings>) => void
}

const DEFAULTS: Settings = {
  defaultColor: 'yellow',
  cardDensity: 'cozy',
  animations: true,
  ballOpacity: 0,
  halfHidden: true,
  snapToEdge: true,
  defaultView: 'grid',
  autoStart: true,
  minimizeToTray: true,
  mysql: {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'floatmemo',
    table: 'floatmemo_notes',
    sslMode: 'none',
    caPath: '',
  },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      patch: (partial) => set(partial),
    }),
    {
      name: 'floatmemo.settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        defaultColor: state.defaultColor,
        cardDensity: state.cardDensity,
        animations: state.animations,
        ballOpacity: state.ballOpacity,
        halfHidden: state.halfHidden,
        snapToEdge: state.snapToEdge,
        defaultView: state.defaultView,
        autoStart: state.autoStart,
        minimizeToTray: state.minimizeToTray,
        mysql: state.mysql,
      }),
      // 老版本存的 mysql 配置没有 sslMode / caPath，合并时补上默认值，
      // 否则升级后设置页会读到 undefined
      merge: (persisted, current) => {
        const saved = persisted as Partial<Settings> | undefined
        return {
          ...current,
          ...saved,
          mysql: { ...DEFAULTS.mysql, ...(saved?.mysql ?? {}) },
        }
      },
    },
  ),
)

/** 卡片密度对应的排版参数 */
export const DENSITY_STYLES: Record<
  CardDensity,
  { title: string; body: string; clamp: string; gap: string }
> = {
  compact: {
    title: 'text-[13px] leading-[19px]',
    body: 'text-[11.5px] leading-[1.6] line-clamp-3',
    clamp: 'line-clamp-3',
    gap: 'gap-2.5',
  },
  cozy: {
    title: 'text-[13.5px] leading-[20px]',
    body: 'text-[12px] leading-[1.68] line-clamp-4',
    clamp: 'line-clamp-4',
    gap: 'gap-3',
  },
  relaxed: {
    title: 'text-[14px] leading-[21px]',
    body: 'text-[12.5px] leading-[1.75] line-clamp-5',
    clamp: 'line-clamp-5',
    gap: 'gap-3.5',
  },
}
