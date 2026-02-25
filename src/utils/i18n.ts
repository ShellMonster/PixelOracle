/**
 * 国际化工具函数
 * 封装 Chrome i18n API，提供类型安全的消息访问
 */
import enMessages from '../../_locales/en/messages.json'
import zhCnMessages from '../../_locales/zh_CN/messages.json'
import zhTwMessages from '../../_locales/zh_TW/messages.json'
import jaMessages from '../../_locales/ja/messages.json'
import koMessages from '../../_locales/ko/messages.json'

type LocaleMessageMap = Record<string, { message?: string }>
const EN_MESSAGES = enMessages as LocaleMessageMap
const ZH_CN_MESSAGES = zhCnMessages as LocaleMessageMap
const ZH_TW_MESSAGES = zhTwMessages as LocaleMessageMap
const JA_MESSAGES = jaMessages as LocaleMessageMap
const KO_MESSAGES = koMessages as LocaleMessageMap

function getFallbackMessagesByUiLanguage(): LocaleMessageMap {
  const lang = chrome.i18n.getUILanguage().toLowerCase()

  if (lang.startsWith('zh-tw') || lang.startsWith('zh-hk') || lang.startsWith('zh-mo')) {
    return ZH_TW_MESSAGES
  }
  if (lang.startsWith('zh')) {
    return ZH_CN_MESSAGES
  }
  if (lang.startsWith('ja')) {
    return JA_MESSAGES
  }
  if (lang.startsWith('ko')) {
    return KO_MESSAGES
  }
  return EN_MESSAGES
}

function fallbackByUiLanguage(key: string): string {
  const localizedFallback = getFallbackMessagesByUiLanguage()[key]?.message
  if (typeof localizedFallback === 'string' && localizedFallback.trim().length > 0) {
    return localizedFallback
  }
  const fallback = EN_MESSAGES[key]?.message
  return typeof fallback === 'string' && fallback.trim().length > 0 ? fallback : key
}

/**
 * 获取本地化消息
 * @param key - 消息键名（对应 messages.json 中的 key）
 * @param substitutions - 替换占位符的字符串或数组
 * @returns 本地化后的消息字符串
 */
export function t(key: string, substitutions?: string | string[]): string {
  const localized = chrome.i18n.getMessage(key, substitutions)
  return localized || fallbackByUiLanguage(key)
}

/**
 * 获取本地化消息（带默认值）
 * @param key - 消息键名
 * @param defaultValue - 找不到消息时的默认值
 * @param substitutions - 替换占位符
 * @returns 本地化后的消息字符串
 */
export function tWithDefault(
  key: string, 
  defaultValue: string, 
  substitutions?: string | string[]
): string {
  const message = chrome.i18n.getMessage(key, substitutions)
  return message || defaultValue || fallbackByUiLanguage(key)
}

/**
 * 获取当前浏览器语言
 * @returns 语言代码（如 'en', 'zh-CN', 'ja' 等）
 */
export function getBrowserLanguage(): string {
  return chrome.i18n.getUILanguage()
}

/**
 * 检查是否支持当前浏览器语言
 * @param supportedLanguages - 支持的语言列表
 * @returns 是否支持
 */
export function isLanguageSupported(supportedLanguages: string[]): boolean {
  const currentLang = getBrowserLanguage()
  return supportedLanguages.includes(currentLang) || 
         supportedLanguages.includes(currentLang.split('-')[0])
}

/**
 * 获取支持的语言列表
 */
export const SUPPORTED_LANGUAGES = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko'] as const
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

// 默认导出
export default {
  t,
  tWithDefault,
  getBrowserLanguage,
  isLanguageSupported,
  SUPPORTED_LANGUAGES,
}
