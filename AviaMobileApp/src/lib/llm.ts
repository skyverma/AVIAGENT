import type { ChatMessage, LlmProvider, StoredFile } from './types'
import { buildDataSummary } from './csv'
import { resolveApiKey } from './llmDefaults'

function buildPrompt(messages: ChatMessage[], file: StoredFile | null | undefined, userPrompt: string) {
  const system = [
    'You are AviaAgent, a mobile data analyst assistant.',
    'Give concise, actionable insights with bullet points when helpful.',
    'If dataset context is provided, base answers only on that data.',
  ].join(' ')

  const history = messages.slice(-8).map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
  const dataBlock = file ? `\n\n--- DATASET CONTEXT ---\n${buildDataSummary(file)}` : ''
  return { system, user: `${history.length ? `Conversation:\n${history.join('\n')}\n\n` : ''}User: ${userPrompt}${dataBlock}` }
}

async function chatOpenAICompatible(opts: {
  url: string
  apiKey: string
  model: string
  system: string
  user: string
  authPrefix?: string
}): Promise<string> {
  const res = await fetch(opts.url, {
    method: 'POST',
    headers: {
      Authorization: `${opts.authPrefix ?? 'Bearer'} ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      temperature: 0.4,
      max_tokens: 2048,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText.slice(0, 280) || `API error ${res.status}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response from AI')
  return String(text).trim()
}

async function askGemini(apiKey: string, model: string, system: string, user: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText.slice(0, 280) || `Gemini error ${res.status}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')
  return String(text).trim()
}

export async function askLlm(opts: {
  provider: LlmProvider
  model: string
  customApiKey: string
  messages: ChatMessage[]
  file?: StoredFile | null
  userPrompt: string
}): Promise<string> {
  const { provider, model, customApiKey, messages, file, userPrompt } = opts
  const apiKey = resolveApiKey(provider, customApiKey)
  if (!apiKey) {
    throw new Error(
      provider === 'gemini'
        ? 'Add a Gemini API key in Settings, or use free DeepSeek (default).'
        : 'No API key — add yours in Settings or rebuild APK with a built-in free key.',
    )
  }

  const { system, user } = buildPrompt(messages, file, userPrompt)

  switch (provider) {
    case 'huggingface':
      return chatOpenAICompatible({
        url: 'https://router.huggingface.co/v1/chat/completions',
        apiKey,
        model,
        system,
        user,
      })
    case 'deepseek':
      return chatOpenAICompatible({
        url: 'https://api.deepseek.com/chat/completions',
        apiKey,
        model,
        system,
        user,
      })
    case 'gemini':
      return askGemini(apiKey, model, system, user)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
