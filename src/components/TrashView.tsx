import { Check, Recycle } from 'lucide-react'

export function TrashView() {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center pb-12">
        <div className="relative mb-5 grid h-[76px] w-[76px] place-items-center rounded-full bg-white shadow-[0_10px_24px_-14px_rgba(15,45,45,0.4)] ring-1 ring-ink-100">
          <Recycle size={30} strokeWidth={1.6} className="text-ink-300" />
          <span className="absolute -right-1 -bottom-1 grid h-[26px] w-[26px] place-items-center rounded-full bg-brand-50 text-brand-600 ring-2 ring-white">
            <Check size={13} strokeWidth={2.6} />
          </span>
        </div>
        <h3 className="text-[14.5px] font-semibold text-ink-800">回收站是空的</h3>
        <p className="mt-1.5 max-w-[290px] text-center text-[11.5px] leading-[19px] text-ink-400">
          删除的便签会在这里保留 30 天，到期后自动清理，期间可以随时还原。
        </p>
        <button
          type="button"
          className="mt-4 h-[30px] rounded-[8px] border border-ink-200/80 bg-white px-3 text-[11.5px] text-ink-600 shadow-[0_1px_2px_rgba(15,45,45,0.05)] transition-colors hover:bg-ink-50"
        >
          返回全部便签
        </button>
      </div>
    </div>
  )
}
