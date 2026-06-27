import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

/** Strip outer ``` fences LLMs often wrap around markdown insights. */
export function normalizeInsightMarkdown(text: string): string {
  let s = (text || '').trim()
  if (!s) return s

  for (let i = 0; i < 4; i++) {
    const fenced = s.match(/^```(?:markdown|md|text|plaintext)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i)
    if (fenced) {
      s = fenced[1].trim()
      continue
    }
    const bare = s.match(/^```\s*\r?\n([\s\S]*?)\r?\n```\s*$/)
    if (bare) {
      s = bare[1].trim()
      continue
    }
    break
  }

  return s
}

type MarkdownViewProps = {
  children: string
  className?: string
  emptyFallback?: string
}

export function MarkdownView({ children, className, emptyFallback }: MarkdownViewProps) {
  const normalized = normalizeInsightMarkdown(children)
  const content = normalized || emptyFallback || ''
  if (!content) {
    return null
  }

  return (
    <div className={cn('chat-markdown', className)}>
      <ReactMarkdown
        components={{
          pre({ children: preChildren }) {
            return <div className="chat-markdown-pre-as-text">{preChildren}</div>
          },
          code({ className: codeClass, children: codeChildren, ...props }) {
            const lang = codeClass?.replace(/language-/, '') || ''
            const raw = String(codeChildren).replace(/\n$/, '')
            if (lang === 'markdown' || lang === 'md') {
              return (
                <div className="chat-markdown-nested">
                  <ReactMarkdown>{raw}</ReactMarkdown>
                </div>
              )
            }
            if (!codeClass && raw.includes('\n') && /^#+\s/m.test(raw)) {
              return (
                <div className="chat-markdown-nested">
                  <ReactMarkdown>{raw}</ReactMarkdown>
                </div>
              )
            }
            return (
              <code className={codeClass} {...props}>
                {codeChildren}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
