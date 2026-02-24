/**
 * Content Script 主入口
 * 整合图片检测器、按钮覆盖层和提示词弹窗组件
 * 负责协调各模块工作，处理用户交互
 */

import { ImageDetector } from './image-detector'
import { ButtonOverlay } from './button-overlay'
import { PromptPopup } from './prompt-popup'
import { logger } from '../utils/logger'

// 用于存储图片到按钮覆盖层的映射
const overlayMap = new Map<HTMLImageElement, ButtonOverlay>()

// 全局弹窗实例（复用同一个弹窗）
let globalPopup: PromptPopup | null = null

// 是否正在分析中（防止重复点击）
let isAnalyzing = false

/**
 * 获取或创建全局弹窗实例
 */
function getGlobalPopup(): PromptPopup {
  if (!globalPopup) {
    globalPopup = new PromptPopup()
    globalPopup.onClose(() => {
      // 弹窗关闭时，重置所有按钮状态
      resetAllButtonStates()
    })
  }
  return globalPopup
}

/**
 * 重置所有按钮状态为 idle
 */
function resetAllButtonStates(): void {
  // 遍历所有已注册的按钮覆盖层
  overlayMap.forEach((overlay) => {
    if (overlay.getState() !== 'idle') {
      overlay.setState('idle')
    }
  })
}

/**
 * 处理按钮点击事件
 * @param img - 被点击的图片元素
 * @param overlay - 对应的按钮覆盖层
 */
async function handleButtonClick(
  img: HTMLImageElement,
  overlay: ButtonOverlay
): Promise<void> {
  // 防止重复点击
  if (isAnalyzing) {
    return
  }
  
  isAnalyzing = true
  overlay.setState('loading')
  
  const popup = getGlobalPopup()
  
  // 显示弹窗（先显示加载状态）
  const buttonElement = overlay.getButtonElement?.() || document.body
  popup.show(buttonElement, '')
  popup.showLoading()
  
  try {
    // 获取图片的 Data URL
    const imageDataUrl = await getImageDataUrl(img)
    
    // 发送到 background script 进行分析
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_IMAGE',
      imageData: imageDataUrl,
    })
    
    if (response.success && response.prompt) {
      // 分析成功
      popup.setPrompt(response.prompt)
      overlay.setState('success')
    } else {
      // 分析失败
      const errorMessage = response.error || '分析失败，请重试'
      popup.showError(errorMessage)
      overlay.setState('idle')
    }
  } catch (error) {
    console.error('[Content Script] 分析图片失败:', error)
    popup.showError(error instanceof Error ? error.message : '分析失败')
    overlay.setState('idle')
  } finally {
    isAnalyzing = false
  }
}

/**
 * 获取图片的 Data URL
 * @param img - 图片元素
 * @returns Data URL 字符串
 */
async function getImageDataUrl(img: HTMLImageElement): Promise<string> {
  // 如果图片是 data URL，直接返回
  if (img.src.startsWith('data:')) {
    return img.src
  }
  
  // 尝试通过 canvas 获取图片数据
  try {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建 canvas 上下文')
    }
    
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.9)
  } catch (error) {
    logger.warn('[Content Script] Canvas 转换失败，尝试直接 fetch:', error)
    
    // Canvas 失败（可能是跨域），尝试 fetch
    const response = await fetch(img.src, {
      mode: 'cors',
      credentials: 'omit',
    })
    
    if (!response.ok) {
      throw new Error(`无法获取图片: ${response.status}`)
    }
    
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('读取图片失败'))
      reader.readAsDataURL(blob)
    })
  }
}

/**
 * 处理检测到的图片
 * @param img - 检测到的图片元素
 */
function handleImageDetected(img: HTMLImageElement): void {
  // 检查是否已存在按钮覆盖层
  if (overlayMap.has(img)) {
    return
  }
  
  // 创建按钮覆盖层
  const overlay = new ButtonOverlay(img)
  
  // 绑定点击事件
  overlay.onClick(() => {
    handleButtonClick(img, overlay)
  })
  
  // 存储映射关系
  overlayMap.set(img, overlay)
  
  // 监听图片移除，清理资源
  observeImageRemoval(img, overlay)
}

/**
 * 监听图片元素是否从 DOM 中移除
 * @param img - 要监听的图片元素
 * @param overlay - 对应的按钮覆盖层
 */
function observeImageRemoval(
  img: HTMLImageElement,
  overlay: ButtonOverlay
): void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        // 检查移除的节点是否是目标图片或其包含目标图片
        if (node === img || (node instanceof Element && node.contains(img))) {
          // 图片被移除，销毁按钮覆盖层
          overlay.destroy()
          overlayMap.delete(img)  // 删除Map条目，防止内存泄漏
          observer.disconnect()
        }
      })
    })
  })
  
  // 监听 document.body 的子节点变化
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

/**
 * 初始化 Content Script
 */
function init(): void {
  logger.log('[Content Script] 初始化图片提示词分析器')
  
  // 创建图片检测器
  const detector = new ImageDetector({
    minWidth: 64,
    minHeight: 64,
    observeMutations: true,
  })
  
  // 注册图片检测回调
  detector.onImageDetected(handleImageDetected)
  
  // 启动检测器
  detector.start()
  
  // 监听来自 popup 或 background 的消息
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_PAGE_IMAGES') {
      // 返回页面中所有符合条件的图片
      const images = Array.from(document.querySelectorAll('img'))
        .filter((img) => img.src && img.naturalWidth >= 64 && img.naturalHeight >= 64)
        .map((img) => ({
          src: img.src,
          alt: img.alt || '',
          width: img.naturalWidth,
          height: img.naturalHeight,
        }))
      
      sendResponse({ images })
      return true
    }
    
    if (message.type === 'PING') {
      // 用于测试连接
      sendResponse({ success: true })
      return true
    }
    
    return false
  })
  
  logger.log('[Content Script] 初始化完成')
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

export {}
