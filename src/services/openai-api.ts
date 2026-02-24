import { t } from '../utils/i18n'

/**
 * OpenAI Vision API 服务
 * 用于调用 OpenAI 的图像分析接口，逆向生成图像提示词
 */

// OpenAI API 响应接口
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

// 语言代码映射到提示词语言
const LANGUAGE_PROMPTS: Record<string, string> = {
  zh: '请用中文回复',
  en: 'Please reply in English',
  ja: '日本語で返信してください',
  ko: '한국어로 답변해 주세요',
  auto: '请用中文回复', // 默认中文
}

/**
 * 根据语言代码生成分析提示词
 * @param language - 语言代码 (zh/en/ja/ko/auto)
 * @returns 完整的分析提示词
 */
function buildAnalysisPrompt(language: string): string {
  const langInstruction = LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS['zh']
  
  return `Analyze this image and generate a detailed prompt that could be used to recreate it with an AI image generator.

Please provide:
1. Main subject description (人物/物体/场景描述)
2. Art style and medium (艺术风格和媒介)
3. Color palette and lighting (色调和光影)
4. Composition and perspective (构图和视角)
5. Mood and atmosphere (情绪和氛围)
6. Technical details (camera settings, quality tags if applicable)

Format the output as a single, comprehensive prompt paragraph that captures all essential elements.

${langInstruction}`
}

/**
 * 调用 OpenAI Vision API 逆向生成图片提示词
 * 
 * @param imageBase64 - 图片的 Base64 编码字符串（不含 data:url 前缀）
 * @param mimeType - 图片 MIME 类型（如 image/jpeg, image/png）
 * @param language - 返回语言 (zh/en/ja/ko/auto)
 * @param apiKey - OpenAI API Key
 * @param baseUrl - API 基础 URL（支持 OpenAI 兼容 API）
 * @param model - 使用的模型，默认 gpt-4o
 * @param timeout - 请求超时时间（秒），默认 120 秒
 * @returns 生成的提示词文本
 * @throws 当 API 调用失败时抛出用户友好的错误信息
 */
export async function reversePrompt(
  imageBase64: string,
  mimeType: string,
  language: string,
  apiKey: string,
  baseUrl: string,
  model: string = 'gpt-4o',
  timeout: number = 120
): Promise<string> {
  // 构建完整的 API URL
  const apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  
  // 构建图片 Data URL
  const imageUrl = `data:${mimeType};base64,${imageBase64}`
  
  // 构建请求体
  const requestBody = {
    model: model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildAnalysisPrompt(language),
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
  
  // 创建 AbortController 用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000)
  
  try {
    // 发送 API 请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
    
    // 清除超时定时器
    clearTimeout(timeoutId)
    
    // 解析响应
    const data: OpenAIResponse = await response.json()
    
    // 检查 API 返回的错误
    if (data.error) {
      throw new Error(`API 错误: ${data.error.message}`)
    }
    
    // 检查响应格式
    if (!data.choices || data.choices.length === 0) {
      throw new Error(t('errorApiNoResult'))
    }
    
    // 提取生成的提示词
    const content = data.choices[0].message.content
    
    if (!content || content.trim() === '') {
      throw new Error(t('errorApiEmptyContent'))
    }
    
    return content.trim()
    
  } catch (error) {
    // 清除超时定时器（确保在错误情况下也能清除）
    clearTimeout(timeoutId)
    
    // 处理不同类型的错误
    if (error instanceof Error) {
      // 超时错误
      if (error.name === 'AbortError') {
        throw new Error(`请求超时：服务器在 ${timeout} 秒内未响应，请检查网络连接或稍后重试`)
      }
      
      // 网络错误
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new Error(`网络错误：无法连接到服务器，请检查网络连接和 API 地址是否正确`)
      }
      
      // 已经是用户友好的错误信息，直接抛出
      if (error.message.startsWith('API') || error.message.startsWith('请求') || error.message.startsWith('网络')) {
        throw error
      }
      
      // 其他未知错误
      throw new Error(`分析失败：${error.message}`)
    }
    
    // 非 Error 类型的错误
    throw new Error(t('errorAnalysisFailed'))
  }
}

/**
 * 验证 API Key 格式
 * @param apiKey - API Key 字符串
 * @param strict - 是否使用严格验证（默认 false）
 * @returns 验证结果对象
 */
export function validateApiKey(
  apiKey: string | undefined | null,
  strict: boolean = false
): { valid: boolean; error?: string } {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API 密钥不能为空' }
  }
  
  if (strict) {
    // OpenAI Key: sk-... 长度约51字符
    const trimmedKey = apiKey.trim()
    if (!trimmedKey.startsWith('sk-')) {
      return { 
        valid: false, 
        error: 'API 密钥格式不正确，OpenAI API Key 通常以 "sk-" 开头' 
      }
    }
    if (trimmedKey.length < 48) {
      return { 
        valid: false, 
        error: 'API 密钥长度不足，请检查是否完整复制' 
      }
    }
  }
  
  return { valid: true }
}

/**
 * 验证 Base URL 格式
 * @param baseUrl - Base URL 字符串
 * @returns 是否有效
 */
export function validateBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
