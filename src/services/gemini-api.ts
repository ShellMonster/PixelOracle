import { t } from '../utils/i18n'

/**
 * Gemini Vision API 服务
 * 用于调用 Google Gemini API 分析图片并生成逆向提示词
 */

// API 配置常量
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const DEFAULT_TIMEOUT = 120000; // 默认超时时间：120秒（毫秒）

// 支持的语言代码类型
type LanguageCode = 'auto' | 'zh' | 'en' | 'ja' | 'ko';

// Gemini API 请求体类型定义
interface GeminiRequest {
  contents: Array<{
    parts: Array<
      | { text: string }
      | { inline_data: { mime_type: string; data: string } }
    >;
  }>;
}

// Gemini API 响应体类型定义
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

/**
 * 根据语言代码生成对应的提示词文本
 * @param language 语言代码 (auto/zh/en/ja/ko)
 * @returns 提示词文本
 */
function buildPromptText(language: LanguageCode): string {
  // 语言到提示词的映射
  const promptMap: Record<LanguageCode, string> = {
    auto: `Analyze this image carefully and generate a detailed prompt that could recreate it using AI image generation tools (like Midjourney, DALL-E, or Stable Diffusion).

Please include:
1. Main subject description
2. Art style and technique
3. Color palette and lighting
4. Composition and perspective
5. Mood and atmosphere
6. Any notable details

Provide the prompt in the same language as any text visible in the image, or English if no text is present.`,

    zh: `请仔细分析这张图片，生成一个详细的提示词，用于AI图像生成工具（如Midjourney、DALL-E或Stable Diffusion）重新创作。

请包含以下内容：
1. 主要主体描述
2. 艺术风格和技法
3. 色彩搭配和光影效果
4. 构图和视角
5. 氛围和情感
6. 其他值得注意的细节

请用中文输出提示词。`,

    en: `Analyze this image carefully and generate a detailed prompt that could recreate it using AI image generation tools (like Midjourney, DALL-E, or Stable Diffusion).

Please include:
1. Main subject description
2. Art style and technique
3. Color palette and lighting
4. Composition and perspective
5. Mood and atmosphere
6. Any notable details

Please output the prompt in English.`,

    ja: `この画像を仔细に分析し、AI画像生成ツール（Midjourney、DALL-E、Stable Diffusionなど）で再作成できる詳細なプロンプトを生成してください。

以下を含めてください：
1. メインの被写体の説明
2. アートスタイルと技法
3. カラーパレットとライティング
4. 構図とパースペクティブ
5. 雰囲気とムード
6. 注目すべき詳細

プロンプトは日本語で出力してください。`,

    ko: `이 이미지를 주의 깊게 분석하고 AI 이미지 생성 도구(Midjourney, DALL-E, Stable Diffusion 등)로 재생성할 수 있는 상세한 프롬프트를 생성해 주세요.

다음을 포함해 주세요:
1. 주요 피사체 설명
2. 예술 스타일과 기법
3. 색상 팔레트와 조명
4. 구도와 원근감
5. 분위기와 무드
6. 주목할 만한 세부 사항

프롬프트는 한국어로 출력해 주세요.`
  };

  return promptMap[language] || promptMap.en;
}

/**
 * 调用 Gemini Vision API 分析图片并生成逆向提示词
 * 
 * @param imageBase64 图片的 Base64 编码数据（不含 data:image/xxx;base64, 前缀）
 * @param mimeType 图片的 MIME 类型（如 image/jpeg, image/png, image/webp）
 * @param language 输出语言代码（auto/zh/en/ja/ko）
 * @param apiKey Gemini API 密钥
 * @param timeout 超时时间（毫秒），默认 120 秒
 * @returns 生成的逆向提示词
 * @throws Error 当 API 调用失败或响应格式错误时抛出异常
 */
export async function reversePrompt(
  imageBase64: string,
  mimeType: string,
  language: LanguageCode,
  apiKey: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<string> {
  // 参数校验
  if (!imageBase64 || !imageBase64.trim()) {
    throw new Error(t('errorImageDataEmpty'));
  }

  if (!mimeType || !mimeType.trim()) {
    throw new Error(t('errorMimeTypeEmpty'));
  }

  const keyValidation = validateGeminiApiKey(apiKey)
  if (!keyValidation.valid) {
    throw new Error(keyValidation.error || 'API 密钥无效')
  }

  // 构建请求 URL
  const url = `${GEMINI_API_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;

  // 构建请求体
  const requestBody: GeminiRequest = {
    contents: [
      {
        parts: [
          { text: buildPromptText(language) },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64
            }
          }
        ]
      }
    ]
  };

  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // 发送 API 请求
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    // 清除超时定时器
    clearTimeout(timeoutId);

    // 检查 HTTP 响应状态
    if (!response.ok) {
      // 尝试解析错误信息
      let errorMessage = `API 请求失败 (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // 无法解析错误响应，使用默认消息
        errorMessage = await response.text() || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // 解析响应 JSON
    const data: GeminiResponse = await response.json();

    // 检查 API 返回的错误
    if (data.error) {
      throw new Error(data.error.message || t('errorApiUnknown'));
    }

    // 提取生成的文本
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText || !generatedText.trim()) {
      throw new Error(t('errorApiInvalidResponse'));
    }

    return generatedText.trim();

  } catch (error) {
    // 清除超时定时器（确保在异常情况下也能清除）
    clearTimeout(timeoutId);

    // 处理超时错误
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时，请稍后重试（超时时间：${timeout / 1000} 秒）`);
    }

    // 处理网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(t('errorNetworkFailed'));
    }

    // 重新抛出其他错误（包括我们自定义的错误消息）
    throw error;
  }
}

/**
 * 获取支持的语言列表
 * @returns 支持的语言代码和名称
 */
export function getSupportedLanguages(): Array<{ code: LanguageCode; name: string }> {
  return [
    { code: 'auto', name: t('langAuto') },
    { code: 'zh', name: t('langZh') },
    { code: 'en', name: t('langEn') },
    { code: 'ja', name: t('langJa') },
    { code: 'ko', name: t('langKo') }
  ];
}

/**
 * 验证 MIME 类型是否被 Gemini API 支持
 * @param mimeType MIME 类型
 * @returns 是否支持
 */
export function isSupportedMimeType(mimeType: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ];
  return supportedTypes.includes(mimeType.toLowerCase());
}


/**
 * 验证 Gemini API Key 格式
 * @param apiKey - API Key 字符串
 * @returns 验证结果，包含是否有效和错误消息
 */
export function validateGeminiApiKey(apiKey: string | undefined | null): { 
  valid: boolean
  error?: string 
} {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API 密钥不能为空' }
  }
  
  // Gemini API Key 通常以 AIza 开头，长度约39字符
  const trimmedKey = apiKey.trim()
  if (!trimmedKey.startsWith('AIza')) {
    return { 
      valid: false, 
      error: 'API 密钥格式不正确，Gemini API Key 通常以 "AIza" 开头' 
    }
  }
  
  if (trimmedKey.length < 35) {
    return { 
      valid: false, 
      error: 'API 密钥长度不足，请检查是否完整复制' 
    }
  }
  
  return { valid: true }
}