/**
 * Chrome Storage 封装服务
 * 用于持久化存储设置和历史记录
 */

// 设置接口
export interface Settings {
  apiProvider: 'gemini' | 'openai'
  geminiApiKey: string
  geminiBaseUrl: string
  geminiModel: string
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
  language: 'auto' | 'zh' | 'en' | 'ja' | 'ko'
  timeout: number // 秒
  enabled: boolean
}

// 历史记录项接口
export interface HistoryItem {
  md5: string // 压缩后图片的MD5哈希
  prompt: string // 逆向生成的提示词
  thumbnailUrl: string // 缩略图（base64或URL）
  sourceUrl?: string // 原图网络地址
  createdAt: number // 时间戳
  isFromHistory?: boolean // 标记是否来自历史记录
}

// 默认设置
export const DEFAULT_SETTINGS: Settings = {
  apiProvider: 'gemini',
  geminiApiKey: '',
  geminiBaseUrl: 'https://generativelanguage.googleapis.com',
  geminiModel: 'gemini-3-flash-preview',
  openaiApiKey: '',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'gemini-3-flash-preview',
  language: 'auto',
  timeout: 180, // 3分钟
  enabled: true,
}

// 历史记录最大数量
export const MAX_HISTORY_ITEMS = 50

// 存储键名
const STORAGE_KEYS = {
  SETTINGS: 'image-prompt-settings',
  HISTORY: 'image-prompt-history',
}

/**
 * 获取存储的设置
 */
export async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
      const settings = result[STORAGE_KEYS.SETTINGS] as Settings | undefined
      resolve(settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS)
    })
  })
}

/**
 * 保存设置
 */
export async function setSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  const updated = { ...current, ...settings }
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * 重置设置为默认值
 */
export async function resetSettings(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * 获取历史记录
 */
export async function getHistory(): Promise<HistoryItem[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.HISTORY], (result) => {
      const history = result[STORAGE_KEYS.HISTORY] as HistoryItem[] | undefined
      resolve(history || [])
    })
  })
}

/**
 * 通过MD5查找历史记录
 */
export async function findHistoryByMD5(md5: string): Promise<HistoryItem | null> {
  const history = await getHistory()
  return history.find((item) => item.md5 === md5) || null
}

/**
 * 保存历史记录（自动限制50条）
 */
export async function saveHistory(item: HistoryItem): Promise<void> {
  const history = await getHistory()
  
  // 检查是否已存在相同MD5的记录
  const existingIndex = history.findIndex((h) => h.md5 === item.md5)
  
  if (existingIndex >= 0) {
    // 更新已存在的记录（移到最前面）
    history.splice(existingIndex, 1)
    history.unshift(item)
  } else {
    // 添加新记录到开头
    history.unshift(item)
  }
  
  // 限制最多50条
  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS)
  
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: trimmedHistory }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * 清空历史记录
 */
export async function clearHistory(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * 删除单条历史记录
 */
export async function deleteHistoryItem(md5: string): Promise<void> {
  const history = await getHistory()
  const filteredHistory = history.filter((item) => item.md5 !== md5)
  
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: filteredHistory }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}
