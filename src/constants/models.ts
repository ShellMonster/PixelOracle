/**
 * AI模型常量
 * 定义项目中使用的各种AI模型标识符和API基础URL
 */

/**
 * 支持的AI模型列表
 * 用于图片分析和提示词生成
 */
export const MODELS = {
  /** Google Gemini 模型配置 */
  GEMINI: {
    /** Gemini Flash 模型 - 快速响应，适合实时分析 */
    FLASH: 'gemini-2.0-flash',
  },
  /** OpenAI 模型配置 */
  OPENAI: {
    /** GPT-4o 模型 - 高质量分析，支持多模态 */
    GPT4O: 'gpt-4o',
    /** GPT-4o Mini 模型 - 轻量级，成本更低 */
    GPT4O_MINI: 'gpt-4o-mini',
  },
} as const

/**
 * Gemini API 基础URL
 * 用于构建Gemini API请求地址
 */
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
