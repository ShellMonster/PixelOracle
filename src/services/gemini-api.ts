import { t } from '../utils/i18n'
import { extractPromptFromJsonOrText } from '../utils/prompt-cleaner'
import { resolvePromptLanguage, type PromptLanguage } from '../utils/language'

/**
 * Gemini Vision API 服务
 * 用于调用 Google Gemini API 分析图片并生成逆向提示词
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com'
const GEMINI_DEFAULT_MODEL = 'gemini-3-flash-preview'
const DEFAULT_TIMEOUT = 180000 // 180 秒（毫秒）

type LanguageCode = PromptLanguage

interface GeminiRequest {
  system_instruction?: {
    parts: Array<{ text: string }>
  }
  generationConfig?: {
    thinkingConfig?: {
      thinkingBudget?: number
    }
    responseMimeType?: string
  }
  contents: Array<{
    parts: Array<
      | { text: string }
      | { inline_data: { mime_type: string; data: string } }
    >
  }>
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
        inlineData?: unknown
        inline_data?: unknown
      }>
    }
  }>
  error?: {
    message?: string
    code?: number
  }
}

const IMAGE_TO_PROMPT_SYSTEM = `你是一个AI绘图提示词专家。请分析用户提供的图片，直接输出一个详细的、可以用来生成相似图片的AI绘图提示词。

提示词必须包含以下要素（融合成连贯的描述，不要分点列举）：
- 主体内容：主要对象、人物、场景的详细描述
- 构图方式：视角、景别、画面布局
- 色彩风格：主色调、配色方案
- 光影效果：光源、氛围
- 艺术风格：写实、插画、动漫等
- 细节特征：纹理、材质、装饰
- 质量标签：如 high quality, 8k, detailed 等

输出规则：
- 只返回最终 prompt 本体，不要 JSON，不要 markdown，不要解释、标题、分点、代码块
- 严禁输出“图片分析”“提示词推荐”“通用版”“Prompt:”等任何额外文本
- 可为单段或多行，但必须全部是 prompt 本体内容
- 输出语言必须严格等于指定语言，不得双语混合
- 看不清的内容写 unknown，不得臆测
- 如果无法遵守以上规则，返回空字符串`

function getLanguageInstruction(language: Exclude<LanguageCode, 'auto'>): string {
  const lang = resolvePromptLanguage(language)
  if (lang === 'en') return '请使用英文返回prompt（English only）'
  if (lang === 'ja') return '日本語でpromptを返してください（日本語のみ）'
  if (lang === 'ko') return '프롬프트를 한국어로 반환하세요（한국어만）'
  return '请使用简体中文返回prompt（仅中文）'
}

function buildPromptText(language: LanguageCode): string {
  const resolved = resolvePromptLanguage(language)
  return `${IMAGE_TO_PROMPT_SYSTEM}\n\n${getLanguageInstruction(resolved)}\n最终检查：仅输出prompt本体，不输出解释。`
}

export async function reversePrompt(
  imageBase64: string,
  mimeType: string,
  language: LanguageCode,
  apiKey: string,
  timeout: number = DEFAULT_TIMEOUT,
  baseUrl: string = GEMINI_API_BASE,
  model: string = GEMINI_DEFAULT_MODEL
): Promise<string> {
  if (!imageBase64 || !imageBase64.trim()) {
    throw new Error(t('errorImageDataEmpty'))
  }

  if (!mimeType || !mimeType.trim()) {
    throw new Error(t('errorMimeTypeEmpty'))
  }

  const keyValidation = validateGeminiApiKey(apiKey)
  if (!keyValidation.valid) {
    throw new Error(keyValidation.error || 'API 密钥无效')
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '')
  let endpointBase = `${normalizedBase}/v1beta`
  if (/\/v1beta$/i.test(normalizedBase) || /\/v1$/i.test(normalizedBase)) {
    endpointBase = normalizedBase
  }

  const normalizedModel = model.trim()
  let modelPath = normalizedModel.replace(/^\/+/, '')
  if (modelPath.startsWith('v1beta/')) {
    modelPath = modelPath.slice('v1beta/'.length)
  }
  if (!modelPath.startsWith('models/')) {
    modelPath = `models/${modelPath || GEMINI_DEFAULT_MODEL}`
  }
  if (!modelPath.endsWith(':generateContent')) {
    modelPath = `${modelPath}:generateContent`
  }

  const url = `${endpointBase}/${modelPath}?key=${encodeURIComponent(apiKey)}`

  const requestBody: GeminiRequest = {
    system_instruction: {
      parts: [{ text: buildPromptText(language) }],
    },
    generationConfig: {
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
    contents: [
      {
        parts: [
          { text: `请分析这张图片并生成提示词。仅返回prompt本体，禁止任何解释。${getLanguageInstruction(resolvePromptLanguage(language))}` },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorMessage = `API 请求失败 (${response.status})`
      try {
        const errorText = await response.text()
        const errorData = JSON.parse(errorText)
        if (errorData.error?.message) {
          errorMessage = errorData.error.message
        } else if (errorText) {
          errorMessage = errorText
        }
      } catch {
        // ignore parse error and keep default message
      }
      throw new Error(errorMessage)
    }

    const data: GeminiResponse = await response.json()

    if (data.error) {
      throw new Error(data.error.message || t('errorApiUnknown'))
    }

    const generatedText = data.candidates?.[0]?.content?.parts
      ?.map((p) => (typeof p.text === 'string' ? p.text : ''))
      .filter(Boolean)
      .join('\n')

    if (!generatedText || !generatedText.trim()) {
      throw new Error(t('errorApiInvalidResponse'))
    }

    const prompt = extractPromptFromJsonOrText(generatedText, resolvePromptLanguage(language))
    if (!prompt) {
      throw new Error(t('errorApiInvalidResponse'))
    }
    return prompt
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时，请稍后重试（超时时间：${timeout / 1000} 秒）`)
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(t('errorNetworkFailed'))
    }

    throw error
  }
}

export function validateGeminiApiKey(apiKey: string | undefined | null): {
  valid: boolean
  error?: string
} {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API 密钥不能为空' }
  }

  return { valid: true }
}
