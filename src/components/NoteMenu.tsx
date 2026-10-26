import { MoreHorizontal, Pencil, Pin, Sticker, Trash2, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

type Props = {
  pinned: boolean
  onEdit: () => void
  onTogglePin: () => void
  onArchive: () => void
  /** 钉为桌面贴纸 */
  onSticker?: () => void
  /** 触发按钮的额外样式（卡片与列表里的尺寸不同） */
  triggerClassName?: string
  iconColor?: string
  align?: 'left' | 'right'
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: LucideIcon
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[28px] w-full items-center gap-2 rounded-[7px] px-2 text-left text-[11.5px] transition-colors ${
        danger
          ? 'text-ink-600 hover:bg-rose-50 hover:text-rose-600'
          : 'text-ink-700 hover:bg-ink-50'
      }`}
    >
      <Icon size={13} strokeWidth={1.9} className={danger ? 'text-rose-400' : 'text-ink-400'} />
      {label}
    </button>
  )
}

/** 便签的「更多」菜单：编辑 / 置顶 / 移到回收站 */
export function NoteMenu({
  pinned,
  onEdit,
  onTogglePin,
  onArchive,
  onSticker,
  triggerClassName = '',
  iconColor,
  align = 'right',
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="更多操作"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={`grid place-items-center rounded-full transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } ${triggerClassName}`}
        style={{ color: iconColor }}
      >
        <MoreHorizontal size={14} strokeWidth={2.2} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20 cursor-default"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <div
            className={`absolute top-[26px] z-30 w-[150px] rounded-[10px] border border-ink-100 bg-white p-1 shadow-[0_18px_36px_-14px_rgba(6,29,29,0.35)] ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem
              icon={Pencil}
              label="编辑"
              onClick={() => {
                setOpen(false)
                onEdit()
              }}
            />
            {onSticker && (
              <MenuItem
                icon={Sticker}
                label="钉为贴纸"
                onClick={() => {
                  setOpen(false)
                  onSticker()
                }}
              />
            )}
            <MenuItem
              icon={Pin}
              label={pinned ? '取消置顶' : '置顶'}
              onClick={() => {
                setOpen(false)
                onTogglePin()
              }}
            />
            <div className="mx-1 my-1 h-px bg-ink-100" />
            <MenuItem
              icon={Trash2}
              label="移到回收站"
              danger
              onClick={() => {
                setOpen(false)
                onArchive()
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
