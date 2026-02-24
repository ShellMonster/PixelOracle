// Background Service Worker for Chrome Extension
// 处理扩展后台任务，如消息转发、图片分析、历史记录管理等

import { getSettings, findHistoryByMD5, saveHistory, HistoryItem } from '../services/storage'
import { reversePrompt as geminiReversePrompt } from '../services/gemini-api'
import { reversePrompt as openaiReversePrompt } from '../services/openai-api'
import { calculateMD5, compressImage, dataURLtoBlob, imageToDataURL } from '../utils/image-utils'
import { CONFIG } from '../constants'
import { logger } from '../utils/logger'



// 分析图片请求消息
interface AnalyzeImageMessage {
  type: 'ANALYZE_IMAGE'
  imageData: string // data URL 格式，如 data:image/jpeg;base64,...
}

// 响应消息
interface AnalyzeResponse {
  success: boolean
  prompt?: string
  error?: string
  isFromHistory?: boolean
}



logger.log('Image Prompt Analyzer: Background service worker started')

/**
 * 从 data URL 中解析出 MIME 类型和 Base64 数据
 * @param dataURL - data URL 格式字符串
 * @returns 包含 mimeType 和 base64 的对象
 */
function parseDataURL(dataURL: string): { mimeType: string; base64: string } {
  // data URL 格式: data:image/jpeg;base64,xxxxx
  const matches = dataURL.match(/^data:([^;]+);base64,(.+)$/)
  
  if (!matches) {
    throw new Error('无效的图片数据格式，请确保上传的是有效的图片')
  }
  
  return {
    mimeType: matches[1], // 如 image/jpeg
    base64: matches[2],   // 纯 base64 数据
  }
}

/**
 * 创建超时 Promise
 * @param ms - 超时时间（毫秒）
 * @returns 永远不会 resolve 的 Promise（会 reject）
 */
function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`请求超时，服务器在 ${ms / 1000} 秒内未响应，请稍后重试`))
    }, ms)
  })
}

/**
 * 处理图片分析请求
 * @param imageData - data URL 格式的图片数据
 * @returns 分析结果
 */
async function handleAnalyzeImage(imageData: string): Promise<AnalyzeResponse> {
  try {
    // 1. 解析 data URL，提取 MIME 类型和 base64 数据
    const { mimeType, base64 } = parseDataURL(imageData)
    
    // 2. 计算 MD5 哈希值（用于历史记录匹配）
    const md5 = calculateMD5(base64)
    logger.log('Image MD5:', md5)
    
    // 3. 查询历史记录，看是否已分析过相同图片
    const existingHistory = await findHistoryByMD5(md5)
    
    if (existingHistory) {
      // 命中历史记录，直接返回结果
      logger.log('Found in history:', md5)
      return {
        success: true,
        prompt: existingHistory.prompt,
        isFromHistory: true,
      }
    }
    
    // 4. 未命中历史记录，获取用户设置
    const settings = await getSettings()
    
    // 检查 API Key 是否已配置
    if (settings.apiProvider === 'gemini' && !settings.geminiApiKey) {
      return {
        success: false,
        error: '请先在设置页面配置 Gemini API Key',
      }
    }
    
    if (settings.apiProvider === 'openai' && !settings.openaiApiKey) {
      return {
        success: false,
        error: '请先在设置页面配置 OpenAI API Key',
      }
    }
    
    // 5. 根据配置的 API 提供商调用对应的 API
    const timeoutMs = (settings.timeout || 180) * 1000 // 转换为毫秒
    let prompt: string
    
    if (settings.apiProvider === 'gemini') {
      // 调用 Gemini API（timeout 参数是毫秒）
      const apiPromise = geminiReversePrompt(
        base64,
        mimeType,
        settings.language,
        settings.geminiApiKey,
        timeoutMs
      )
      
      // 使用 Promise.race 实现超时控制
      prompt = await Promise.race([
        apiPromise,
        createTimeoutPromise(timeoutMs),
      ])
    } else {
      // 调用 OpenAI API（timeout 参数是秒）
      const apiPromise = openaiReversePrompt(
        base64,
        mimeType,
        settings.language,
        settings.openaiApiKey,
        settings.openaiBaseUrl || 'https://api.openai.com/v1',
        'gpt-4o', // 默认使用 gpt-4o 模型
        settings.timeout || 180 // timeout 参数是秒
      )
      
      // 使用 Promise.race 实现超时控制
      prompt = await Promise.race([
        apiPromise,
        createTimeoutPromise(timeoutMs),
      ])
    }
    
    // 6. 压缩缩略图并保存到历史记录
    let thumbnailUrl: string
    try {
      // 将 dataURL 转换为 Blob
      const imageBlob = dataURLtoBlob(imageData)
      // 压缩到缩略图尺寸（256px）
      const compressedBlob = await compressImage(imageBlob, CONFIG.MAX_THUMBNAIL_SIZE)
      // 转回 dataURL 作为缩略图
      thumbnailUrl = await imageToDataURL(compressedBlob)
    } catch (error) {
      logger.warn('Failed to compress thumbnail, using original:', error)
      thumbnailUrl = imageData // 压缩失败时使用原图
    }

    const historyItem: HistoryItem = {
      md5,
      prompt,
      thumbnailUrl,
      createdAt: Date.now(),
    }
    
    await saveHistory(historyItem)
    logger.log('Saved to history:', md5)
    
    // 7. 返回成功结果
    return {
      success: true,
      prompt,
      isFromHistory: false,
    }
    
  } catch (error) {
    // 错误处理：返回用户友好的错误消息
    console.error('Analyze image error:', error)
    
    let errorMessage = '分析失败，请稍后重试'
    
    if (error instanceof Error) {
      // 如果是超时错误
      if (error.message.includes('超时') || error.name === 'AbortError') {
        errorMessage = '请求超时，请检查网络连接或稍后重试'
      }
      // 如果是网络错误
      else if (error.message.includes('网络') || error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络设置后重试'
      }
      // 如果是 API 错误（已经包含友好消息）
      else if (error.message.includes('API') || error.message.includes('密钥')) {
        errorMessage = error.message
      }
      // 其他已知错误
      else {
        errorMessage = error.message
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
}

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    logger.log('Extension installed')
  } else if (details.reason === 'update') {
    logger.log('Extension updated')
  }
})

// 监听来自 content script 或 popup 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  logger.log('Background received message:', message)
  
  // 根据消息类型处理
  if (message.type === 'ANALYZE_IMAGE') {
    const typedMessage = message as AnalyzeImageMessage
    
    // 异步处理图片分析
    handleAnalyzeImage(typedMessage.imageData)
      .then((response) => {
        sendResponse(response)
      })
      .catch((error) => {
        console.error('Unexpected error:', error)
        sendResponse({
          success: false,
          error: '发生未知错误，请稍后重试',
        })
      })
    
    return true // 保持消息通道开启以进行异步响应
  }
  
  return false
})

export {}
