import { t } from '../utils/i18n'
import { extractPromptFromJsonOrText } from '../utils/prompt-cleaner'
import { resolvePromptLanguage, type PromptLanguage } from '../utils/language'

/**
 * OpenAI Vision API 服务
 * 用于调用 OpenAI 的图像分析接口，逆向生成图像提示词
 */

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  error?: {
    message: string
    type: string
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

function buildAnalysisPrompt(language: PromptLanguage): string {
  const lang = resolvePromptLanguage(language)
  let languageInstruction = '请使用简体中文返回prompt（仅中文）'
  if (lang === 'en') languageInstruction = '请使用英文返回prompt（English only）'
  if (lang === 'ja') languageInstruction = '日本語でpromptを返してください（日本語のみ）'
  if (lang === 'ko') languageInstruction = '프롬프트를 한국어로 반환하세요（한국어만）'

  return `${IMAGE_TO_PROMPT_SYSTEM}\n\n${languageInstruction}\n最终检查：仅输出prompt本体，不输出解释。`
}

function getLanguageInstruction(language: PromptLanguage): string {
  const lang = resolvePromptLanguage(language)
  if (lang === 'en') return '请使用英文返回prompt（English only）'
  if (lang === 'ja') return '日本語でpromptを返してください（日本語のみ）'
  if (lang === 'ko') return '프롬프트를 한국어로 반환하세요（한국어만）'
  return '请使用简体中文返回prompt（仅中文）'
}

export async function reversePrompt(
  imageBase64: string,
  mimeType: string,
  language: PromptLanguage,
  apiKey: string,
  baseUrl: string,
  model: string = 'gemini-3-flash-preview',
  timeout: number = 180
): Promise<string> {
  const apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const imageUrl = `data:${mimeType};base64,${imageBase64}`

  const requestBody = {
    model,
    messages: [
      {
        role: 'system',
        content: buildAnalysisPrompt(language),
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `请分析这张图片并生成提示词。仅返回prompt本体，禁止任何解释。${getLanguageInstruction(language)}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data: OpenAIResponse = await response.json()

    if (data.error) {
      throw new Error(`API 错误: ${data.error.message}`)
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error(t('errorApiNoResult'))
    }

    const content = data.choices[0].message.content

    if (!content || content.trim() === '') {
      throw new Error(t('errorApiEmptyContent'))
    }

    const prompt = extractPromptFromJsonOrText(content, resolvePromptLanguage(language))
    if (!prompt) {
      throw new Error(t('errorApiInvalidResponse'))
    }
    return prompt
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`请求超时：服务器在 ${timeout} 秒内未响应，请检查网络连接或稍后重试`)
      }

      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new Error('网络错误：无法连接到服务器，请检查网络连接和 API 地址是否正确')
      }

      if (
        error.message.startsWith('API') ||
        error.message.startsWith('请求') ||
        error.message.startsWith('网络')
      ) {
        throw error
      }

      throw new Error(`分析失败：${error.message}`)
    }

    throw new Error(t('errorAnalysisFailed'))
  }
}
