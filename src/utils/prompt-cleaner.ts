/**
 * 轻量提示词解析器：
 * 1) 优先解析 JSON 的 prompt 字段
 * 2) 兼容常见扩展结构（prompts/description）
 * 3) 最后再做纯文本兜底，避免把整段结构化文本直接展示
 */

const MAX_PROMPT_LENGTH = 600

export type PreferredLanguage = 'zh' | 'en' | 'ja' | 'ko'

export function extractPromptFromJsonOrText(
  raw: string,
  preferredLanguage: PreferredLanguage = 'en'
): string {
  const input = String(raw || '').trim()
  if (!input) return ''

  // 1. 直接 JSON
  const direct = parsePromptJson(input, preferredLanguage)
  if (direct) return direct

  // 2. 文本中嵌入 JSON
  const embedded = input.match(/\{[\s\S]*\}/)
  if (embedded?.[0]) {
    const fromEmbedded = parsePromptJson(embedded[0], preferredLanguage)
    if (fromEmbedded) return fromEmbedded
  }

  // 3. 近似结构化文本兜底提取（应对轻微格式错误）
  const fromLoose = extractPromptFromLooseStructuredText(input, preferredLanguage)
  if (fromLoose) return fromLoose

  // 4. 纯文本兜底：避免把整段结构化文本原样展示到 UI
  const fallback = cleanupText(input)
  if (!fallback) return ''
  if (looksLikeStructuredPayload(fallback)) return ''
  return truncatePrompt(fallback)
}

function parsePromptJson(value: string, preferredLanguage: PreferredLanguage): string {
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object') return ''
    const obj = parsed as Record<string, unknown>

    // 1) 标准结构：{"prompt":"..."}
    if (typeof obj.prompt === 'string' && obj.prompt.trim()) {
      return truncatePrompt(cleanupText(obj.prompt))
    }

    // 2) 扩展结构：{"prompt":{"positive":"...","negative":"..."}}
    if (obj.prompt && typeof obj.prompt === 'object') {
      const p = obj.prompt as Record<string, unknown>
      const positive =
        typeof p.positive === 'string'
          ? p.positive
          : typeof p.positive_prompt === 'string'
            ? p.positive_prompt
            : ''
      const negative =
        typeof p.negative === 'string'
          ? p.negative
          : typeof p.negative_prompt === 'string'
            ? p.negative_prompt
            : ''
      const merged = [positive.trim(), negative.trim() ? `--no ${negative.trim()}` : '']
        .filter(Boolean)
        .join(', ')
      if (merged) return truncatePrompt(cleanupText(merged))
    }

    // 3) 兼容结构：{"positive_prompt":"...","negative_prompt":"..."}
    const positivePrompt = typeof obj.positive_prompt === 'string' ? obj.positive_prompt : ''
    const negativePrompt = typeof obj.negative_prompt === 'string' ? obj.negative_prompt : ''
    const merged = [
      positivePrompt.trim(),
      negativePrompt.trim() ? `--no ${negativePrompt.trim()}` : '',
    ]
      .filter(Boolean)
      .join(', ')
    if (merged) return truncatePrompt(cleanupText(merged))

    // 4) analysis/prompt 混合结构
    if (obj.analysis && typeof obj.analysis === 'object') {
      const a = obj.analysis as Record<string, unknown>
      if (typeof a.prompt === 'string' && a.prompt.trim()) {
        return truncatePrompt(cleanupText(a.prompt))
      }
    }

    // 5) 兼容结构：{"description":"...","prompts":["...","..."]}
    if (Array.isArray(obj.prompts)) {
      const prompts = obj.prompts.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
      const selected = selectPromptByLanguage(prompts, preferredLanguage)
      if (selected) return truncatePrompt(cleanupText(selected))
    }

    // 6) 兜底结构：{"description":"..."}
    if (typeof obj.description === 'string' && obj.description.trim()) {
      return truncatePrompt(cleanupText(obj.description))
    }
  } catch {
    // ignore
  }
  return ''
}

function extractPromptFromLooseStructuredText(
  input: string,
  preferredLanguage: PreferredLanguage
): string {
  // prompt: "..."
  const promptMatch = input.match(/["']prompt["']\s*:\s*["']([\s\S]*?)["']\s*(,|\}|$)/i)
  if (promptMatch?.[1]) {
    return truncatePrompt(cleanupText(promptMatch[1]))
  }

  // prompts: ["...", "..."]
  const promptsArrayMatch = input.match(/["']prompts["']\s*:\s*\[([\s\S]*?)\]/i)
  if (promptsArrayMatch?.[1]) {
    const inner = promptsArrayMatch[1]
    const items = [...inner.matchAll(/["']((?:\\.|[^"'])+)["']/g)]
      .map((m) => cleanupText(m[1]))
      .filter(Boolean)
    const selected = selectPromptByLanguage(items, preferredLanguage)
    if (selected) return truncatePrompt(cleanupText(selected))
  }

  // description: "..."
  const descriptionMatch = input.match(/["']description["']\s*:\s*["']([\s\S]*?)["']\s*(,|\}|$)/i)
  if (descriptionMatch?.[1]) {
    return truncatePrompt(cleanupText(descriptionMatch[1]))
  }

  return ''
}

function selectPromptByLanguage(
  prompts: string[],
  preferredLanguage: PreferredLanguage
): string {
  if (!prompts.length) return ''

  const scored = prompts.map((text) => ({
    text,
    score: scoreByLanguage(text, preferredLanguage),
  }))
  scored.sort((a, b) => b.score - a.score)

  return scored[0]?.score > 0 ? scored[0].text : prompts[0]
}

function scoreByLanguage(text: string, preferredLanguage: PreferredLanguage): number {
  const hasZh = /[\u4e00-\u9fff]/.test(text)
  const hasJa = /[\u3040-\u30ff]/.test(text)
  const hasKo = /[\uac00-\ud7af]/.test(text)
  const hasLatin = /[A-Za-z]/.test(text)

  if (preferredLanguage === 'zh') return hasZh ? 3 : 0
  if (preferredLanguage === 'ja') return hasJa ? 3 : 0
  if (preferredLanguage === 'ko') return hasKo ? 3 : 0

  // en
  if (hasLatin && !hasZh && !hasJa && !hasKo) return 3
  if (hasLatin) return 1
  return 0
}

function looksLikeStructuredPayload(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return true
  }
  if (/["'](?:prompt|prompts|description|analysis|positive_prompt|negative_prompt)["']\s*:/.test(trimmed)) {
    return true
  }
  return false
}

function truncatePrompt(text: string): string {
  if (text.length <= MAX_PROMPT_LENGTH) return text
  return text.slice(0, MAX_PROMPT_LENGTH).trim()
}

function cleanupText(value: string): string {
  let text = String(value || '').trim()

  // 去掉常见 markdown 包裹
  const codeBlock = text.match(/```(?:json|text|markdown)?\s*([\s\S]*?)```/i)
  if (codeBlock?.[1]) {
    text = codeBlock[1].trim()
  }

  // 去掉首尾引号
  text = text.replace(/^["“”'`]+|["“”'`]+$/g, '')
  return text.trim()
}

