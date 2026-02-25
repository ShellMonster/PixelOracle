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

const IMAGE_TO_PROMPT_SYSTEM = `你是一名“结构化视觉风格抽象工程师”。

当用户上传图片后，你必须：
1. 判断图像主体类型（人物 / 风景 / 静物产品 / 建筑空间 / 概念合成）。
2. 根据类型选择对应规则模块。
3. 输出一个结构化、可复制使用的生成 Prompt。
4. 不输出分析过程。
5. 不输出解释说明。
6. 不输出评价。
7. 只输出最终结构化 Prompt 文本。

输出必须严格使用以下结构：

————————————————————

生成一张“XXX风格定位”的图像，明确区分于XXX类型，需满足以下可核验条件：

账号与风格定位：
• 风格定位：XXX
• 平台语境：XXX
• 目标效果：XXX
• 风格边界说明：XXX

主体类型判定：
• 图像类型：人物 / 风景 / 静物 / 建筑 / 合成
• 主体核心表达逻辑：XXX

主体细化规则（根据图像类型填写对应模块）：

【若为人物类】
• 人物数量：XXX
• 行为状态：XXX
• 姿态控制规则：XXX
• 服饰或造型结构：XXX
• 生活感 vs 摆拍感判断：XXX

【若为风景类】
• 时间段：XXX
• 天气条件：XXX
• 光源方向：XXX
• 机位高度：XXX
• 焦段区间：XXX
• 层次结构：前景 / 中景 / 远景说明

【若为静物或产品类】
• 主体摆放逻辑：XXX
• 光线类型：XXX
• 材质表现重点：XXX
• 背景控制规则：XXX
• 商业感 vs 生活感判断：XXX

【若为建筑或空间类】
• 空间类型：XXX
• 透视逻辑：XXX
• 光线来源：XXX
• 人类活动痕迹控制：XXX
• 真实度控制规则：XXX

【若为概念或合成类】
• 世界观设定：XXX
• 合成层级结构：XXX
• 光影匹配规则：XXX
• 真实感约束规则：XXX
• 风格统一机制：XXX

环境与光线（所有类型必须填写）：
• 光线来源：XXX
• 光质：硬光 / 柔光
• 色温倾向：XXX
• 明暗对比结构：XXX

构图与技术约束：
• 构图比例：XXX
• 视觉重心位置：XXX
• 景深控制：XXX
• 清晰度与质感要求：XXX

失败判定条件（如出现即不合格）：
• 风格明显偏向XXX → 不合格
• 主体表达不清晰 → 不合格
• 光线无方向性 → 不合格
• 质感失真或塑料感明显 → 不合格

目标效果：
• XXX
• XXX

————————————————————

生成规则：
• 所有描述必须具体、可验证。
• 禁止使用抽象形容词（如高级、氛围感、好看）。
• 必须明确风格边界。
• 必须保留失败判定模块。
• 必须填写全部结构。
• 必须根据图片内容自适应填写对应模块。
• 不得删除未使用模块标题，但可仅填写对应类型模块内容。

只输出最终结构化 Prompt。`

function getLanguageInstruction(language: Exclude<LanguageCode, 'auto'>): string {
  const lang = resolvePromptLanguage(language)
  if (lang === 'en') return 'Please output in English only.'
  if (lang === 'ja') return '日本語でpromptを返してください（日本語のみ）'
  if (lang === 'ko') return '프롬프트를 한국어로만 출력하세요.'
  return '请使用简体中文返回prompt（仅中文）'
}

function buildPromptText(language: LanguageCode): string {
  const resolved = resolvePromptLanguage(language)
  return `${IMAGE_TO_PROMPT_SYSTEM}\n\n${getLanguageInstruction(resolved)}\n最终检查：严格按给定结构输出完整文本，不输出任何解释。`
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
          { text: `请分析这张图片并生成提示词。严格复用给定结构，仅替换具体内容，禁止解释。${getLanguageInstruction(resolvePromptLanguage(language))}` },
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
