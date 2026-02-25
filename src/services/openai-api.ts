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

function buildAnalysisPrompt(language: PromptLanguage): string {
  const lang = resolvePromptLanguage(language)
  let languageInstruction = '请使用简体中文返回prompt（仅中文）'
  if (lang === 'en') languageInstruction = 'Please output in English only.'
  if (lang === 'ja') languageInstruction = '日本語でpromptを返してください（日本語のみ）'
  if (lang === 'ko') languageInstruction = '프롬프트를 한국어로만 출력하세요.'

  return `${IMAGE_TO_PROMPT_SYSTEM}\n\n${languageInstruction}\n最终检查：严格按给定结构输出完整文本，不输出任何解释。`
}

function getLanguageInstruction(language: PromptLanguage): string {
  const lang = resolvePromptLanguage(language)
  if (lang === 'en') return 'Please output in English only.'
  if (lang === 'ja') return '日本語でpromptを返してください（日本語のみ）'
  if (lang === 'ko') return '프롬프트를 한국어로만 출력하세요.'
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
            text: `请分析这张图片并生成提示词。严格复用给定结构，仅替换具体内容，禁止解释。${getLanguageInstruction(language)}`,
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
