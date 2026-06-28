import ReactMarkdown from 'react-markdown'

export function MarkdownView({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none text-[14px] leading-relaxed text-slate-700 prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-qm-navy">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
