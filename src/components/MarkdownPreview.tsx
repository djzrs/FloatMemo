import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

/**
 * Markdown 实时预览（GFM 子集）。
 * 用 react-markdown 的 AST 渲染，不注入原始 HTML，天然避免 XSS。
 * 样式与便签编辑区的字号/行高保持一致，色系跟随全局 ink/brand 变量。
 */
export function MarkdownPreview({
  content,
  className = 'px-5 py-3',
}: {
  content: string
  /** 容器的额外 padding / 样式类；分栏时由父级传入紧凑值 */
  className?: string
}) {
  return (
    <div
      className={`markdown-preview scroll-thin h-full overflow-y-auto text-[13px] leading-[24px] text-ink-700 outline-none ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 border-b border-ink-100 pb-1 text-[17px] leading-[26px] font-bold tracking-[-0.01em] text-ink-900 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1.5 mt-3 border-b border-ink-100 pb-0.5 text-[15px] leading-[24px] font-bold text-ink-900 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2.5 text-[13.5px] leading-[22px] font-bold text-ink-900 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5 marker:text-ink-300">{children}</ul>,
  ol: ({ children }) => (
    <ol className="my-1.5 list-decimal space-y-0.5 pl-5 marker:text-ink-300">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-[22px]">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-[3px] border-brand-300 bg-brand-50/70 py-0.5 pr-2 pl-3 text-ink-600">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    // react-markdown 的 inline code 与 fenced code 都走这里，靠 className 区分
    const isBlock = /language-/.test(className ?? '')
    if (isBlock) {
      return (
        <pre className="scroll-thin my-2 overflow-x-auto rounded-[10px] bg-ink-900 px-3.5 py-2.5 text-[12px] leading-[20px] text-ink-50">
          <code className={className}>{children}</code>
        </pre>
      )
    }
    return (
      <code className="rounded-[5px] border border-ink-100 bg-ink-50 px-[5px] py-[1px] font-mono text-[11.5px] leading-none text-brand-700">
        {children}
      </code>
    )
  },
  pre: ({ children }) => <>{children}</>,
  hr: () => <hr className="my-3 border-ink-100" />,
  table: ({ children }) => (
    <div className="scroll-thin my-2 overflow-x-auto rounded-[10px] border border-ink-100">
      <table className="w-full border-collapse text-[12px] leading-[20px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-ink-50 text-ink-700">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-ink-100 px-2.5 py-1.5 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-ink-100/70 px-2.5 py-1.5 align-top last:border-b-0">{children}</td>,
  input: ({ checked, type }) =>
    type === 'checkbox' ? (
      <input type="checkbox" checked={Boolean(checked)} readOnly className="mr-1.5 accent-brand-600" />
    ) : null,
}