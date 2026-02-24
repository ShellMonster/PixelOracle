/**
 * Chrome Extension 消息通信层
 * 提供类型安全的消息发送和监听功能
 */

import { logger } from '../utils/logger'

// ==================== 消息类型定义 ====================

// 消息类型常量
export const MessageType = {
  // 图片分析相关
  ANALYZE_IMAGE: 'ANALYZE_IMAGE',       // 请求分析图片
  ANALYZE_RESULT: 'ANALYZE_RESULT',     // 分析结果返回
  
  // 设置相关
  GET_SETTINGS: 'GET_SETTINGS',         // 获取设置
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',   // 更新设置
  
  // 历史记录相关
  GET_HISTORY: 'GET_HISTORY',           // 获取历史记录
  SAVE_HISTORY: 'SAVE_HISTORY',         // 保存历史记录
  DELETE_HISTORY: 'DELETE_HISTORY',     // 删除历史记录
  CLEAR_HISTORY: 'CLEAR_HISTORY',       // 清空历史记录
  
  // 工具消息
  PING: 'PING',                         // 心跳检测
  GET_PAGE_IMAGES: 'GET_PAGE_IMAGES',   // 获取页面图片
} as const

// 消息类型（从常量推导）
type MessageTypeValue = typeof MessageType[keyof typeof MessageType]

// ==================== 消息载荷类型定义 ====================

// 分析图片请求（Content -> Background）
export interface AnalyzeImageMessage {
  type: typeof MessageType.ANALYZE_IMAGE
  imageData: string  // Data URL 格式的图片数据
  thumbnailUrl?: string  // 缩略图（可选）
}

// 分析结果响应（Background -> Content）
export interface AnalyzeResultMessage {
  type: typeof MessageType.ANALYZE_RESULT
  success: boolean
  prompt?: string        // 生成的提示词
  error?: string         // 错误信息
  isFromHistory?: boolean // 是否来自历史记录缓存
  md5?: string           // 图片MD5（用于去重）
}

// 获取设置请求
export interface GetSettingsMessage {
  type: typeof MessageType.GET_SETTINGS
}

// 更新设置请求
export interface UpdateSettingsMessage {
  type: typeof MessageType.UPDATE_SETTINGS
  settings: Record<string, unknown>
}

// 获取历史记录请求
export interface GetHistoryMessage {
  type: typeof MessageType.GET_HISTORY
}

// 保存历史记录请求
export interface SaveHistoryMessage {
  type: typeof MessageType.SAVE_HISTORY
  item: {
    md5: string
    prompt: string
    thumbnailUrl: string
  }
}

// 删除历史记录请求
export interface DeleteHistoryMessage {
  type: typeof MessageType.DELETE_HISTORY
  md5: string
}

// 清空历史记录请求
export interface ClearHistoryMessage {
  type: typeof MessageType.CLEAR_HISTORY
}

// 心跳检测
export interface PingMessage {
  type: typeof MessageType.PING
}

// 获取页面图片请求
export interface GetPageImagesMessage {
  type: typeof MessageType.GET_PAGE_IMAGES
}

// ==================== 联合类型 ====================

// 所有请求消息类型
export type RequestMessage =
  | AnalyzeImageMessage
  | GetSettingsMessage
  | UpdateSettingsMessage
  | GetHistoryMessage
  | SaveHistoryMessage
  | DeleteHistoryMessage
  | ClearHistoryMessage
  | PingMessage
  | GetPageImagesMessage

// 所有响应消息类型
export type ResponseMessage = AnalyzeResultMessage

// 通用响应结构
export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ==================== 消息发送函数 ====================

/**
 * 发送消息到 Background Script 并等待响应
 * 类型安全的消息发送封装
 * 
 * @param message - 要发送的消息对象
 * @param timeout - 超时时间（毫秒），默认 130 秒
 * @returns 响应数据的 Promise
 * @throws 当超时或通信失败时抛出错误
 */
export async function sendMessage<T = unknown>(
  message: RequestMessage,
  timeout: number = 130000
): Promise<MessageResponse<T>> {
  return new Promise((resolve, reject) => {
    // 设置超时定时器
    const timeoutId = setTimeout(() => {
      reject(new Error(`消息发送超时 (${timeout / 1000} 秒)`))
    }, timeout)

    // 发送消息到 runtime
    chrome.runtime.sendMessage(message, (response) => {
      // 清除超时定时器
      clearTimeout(timeoutId)

      // 检查是否有运行时错误
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || '通信失败'))
        return
      }

      // 检查响应是否存在
      if (response === undefined) {
        reject(new Error('未收到响应'))
        return
      }

      // 返回响应
      resolve(response as MessageResponse<T>)
    })
  })
}

/**
 * 发送消息到指定 Tab（从 Background 发送到 Content Script）
 * 
 * @param tabId - 目标 Tab ID
 * @param message - 要发送的消息
 * @param timeout - 超时时间（毫秒）
 * @returns 响应数据的 Promise
 */
export async function sendMessageToTab<T = unknown>(
  tabId: number,
  message: RequestMessage,
  timeout: number = 30000
): Promise<MessageResponse<T>> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`发送到 Tab ${tabId} 超时`))
    }, timeout)

    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timeoutId)

      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'Tab 通信失败'))
        return
      }

      if (response === undefined) {
        reject(new Error('Tab 未响应'))
        return
      }

      resolve(response as MessageResponse<T>)
    })
  })
}

// ==================== 消息监听函数 ====================

// 消息处理器类型
type MessageHandler<T = unknown> = (
  message: RequestMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse<T>) => void
) => boolean | void

// 已注册的处理器映射
const handlers = new Map<MessageTypeValue, MessageHandler>()

/**
 * 注册消息处理器
 * 用于在 Background Script 中监听特定类型的消息
 * 
 * @param type - 消息类型
 * @param handler - 处理函数
 * @returns 取消注册的函数
 */
export function onMessage<T = unknown>(
  type: MessageTypeValue,
  handler: MessageHandler<T>
): () => void {
  // 存储处理器
  handlers.set(type, handler as MessageHandler)

  // 返回取消注册函数
  return () => {
    handlers.delete(type)
  }
}

/**
 * 初始化全局消息监听器
 * 应在 Background Script 启动时调用一次
 */
export function initMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 验证消息格式
    if (!message || typeof message.type !== 'string') {
      logger.warn('[Messaging] 收到无效消息格式:', message)
      sendResponse({ success: false, error: '无效的消息格式' })
      return false
    }

    // 查找对应的处理器
    const handler = handlers.get(message.type as MessageTypeValue)
    
    if (handler) {
      try {
        // 调用处理器
        const result = handler(message, sender, sendResponse)
        
        // 如果返回 true，表示处理器会异步调用 sendResponse
        // 需要返回 true 保持消息通道开启
        return result === true
      } catch (error) {
        console.error(`[Messaging] 处理消息 ${message.type} 时出错:`, error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '处理消息时发生错误'
        })
        return false
      }
    }

    // 没有找到处理器
    logger.warn(`[Messaging] 未找到消息类型 ${message.type} 的处理器`)
    sendResponse({ success: false, error: `未知的消息类型: ${message.type}` })
    return false
  })
}

// ==================== 工具函数 ====================

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data: T): MessageResponse<T> {
  return { success: true, data }
}

/**
 * 创建错误响应
 */
export function createErrorResponse(error: string): MessageResponse {
  return { success: false, error }
}

/**
 * 检查消息类型是否为分析图片请求
 */
export function isAnalyzeImageMessage(message: unknown): message is AnalyzeImageMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as Record<string, unknown>).type === MessageType.ANALYZE_IMAGE &&
    typeof (message as Record<string, unknown>).imageData === 'string'
  )
}
