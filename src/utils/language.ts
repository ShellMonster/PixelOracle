export type PromptLanguage = 'auto' | 'zh' | 'en' | 'ja' | 'ko'

function normalizeLocaleToPromptLanguage(locale: string): Exclude<PromptLanguage, 'auto'> {
  const value = String(locale || '').toLowerCase()
  if (value.startsWith('zh')) return 'zh'
  if (value.startsWith('ja')) return 'ja'
  if (value.startsWith('ko')) return 'ko'
  return 'en'
}

export function resolvePromptLanguage(language: PromptLanguage): Exclude<PromptLanguage, 'auto'> {
  if (language !== 'auto') return language

  const uiLanguage = globalThis.chrome?.i18n?.getUILanguage?.()
  if (uiLanguage) return normalizeLocaleToPromptLanguage(uiLanguage)

  const navLanguage = globalThis.navigator?.language
  if (navLanguage) return normalizeLocaleToPromptLanguage(navLanguage)

  return 'en'
}

