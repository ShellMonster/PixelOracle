/**
 * Content Script 主入口
 * 整合图片检测器、按钮覆盖层和提示词弹窗组件
 * 负责协调各模块工作，处理用户交互
 */

import { ImageDetector } from './image-detector'
import { ButtonOverlay } from './button-overlay'
import { PromptPopup } from './prompt-popup'
import { logger } from '../utils/logger'
import { CONFIG } from '../constants'

// 用于存储图片到按钮覆盖层的映射
const overlayMap = new Map<HTMLImageElement, ButtonOverlay>()
const pendingImages = new Set<HTMLImageElement>()

// 全局位置同步 raf
let positionSyncRafId: number | null = null

// 全局清理 raf
let overlayCleanupRafId: number | null = null

// 全局 DOM 生命周期 observer（单例）
let overlayLifecycleObserver: MutationObserver | null = null
let imageVisibilityObserver: IntersectionObserver | null = null
let overlayProbeCursor = 0

// 全局弹窗实例（复用同一个弹窗）
let globalPopup: PromptPopup | null = null

// 是否正在分析中（防止重复点击）
let isAnalyzing = false

function getDynamicSyncBudget(): { nearby: number; probe: number } {
  const activeCount = overlayMap.size

  if (activeCount >= CONFIG.OVERLAY_BUDGET_LOW_THRESHOLD) {
    return {
      nearby: CONFIG.LOW_SYNC_UPDATES_PER_FRAME,
      probe: CONFIG.LOW_PROBE_UPDATES_PER_FRAME,
    }
  }

  if (activeCount >= CONFIG.OVERLAY_BUDGET_MID_THRESHOLD) {
    return {
      nearby: CONFIG.MID_SYNC_UPDATES_PER_FRAME,
      probe: CONFIG.MID_PROBE_UPDATES_PER_FRAME,
    }
  }

  return {
    nearby: CONFIG.MAX_SYNC_UPDATES_PER_FRAME,
    probe: CONFIG.MAX_PROBE_UPDATES_PER_FRAME,
  }
}

/**
 * 统一调度 overlay 位置更新（避免多实例重复监听）
 */
function scheduleOverlayPositionSync(): void {
  if (document.visibilityState === 'hidden') return
  if (overlayMap.size === 0) return
  if (positionSyncRafId !== null) return
  positionSyncRafId = window.requestAnimationFrame(() => {
    positionSyncRafId = null
    rebalanceOverlayPool()
    const entries = Array.from(overlayMap.entries())
    if (entries.length === 0) return
    const budget = getDynamicSyncBudget()

    // 1) 非 idle 覆盖层优先同步（交互中）
    for (const [, overlay] of entries) {
      if (overlay.getState() !== 'idle') {
        overlay.syncPosition()
      }
    }

    // 2) 近视口 idle 覆盖层按预算同步
    let nearbyBudget = budget.nearby
    for (const [img, overlay] of entries) {
      if (nearbyBudget <= 0) break
      if (overlay.getState() !== 'idle') continue
      if (!overlay.isInViewport() && !isNearViewport(img)) continue
      overlay.syncPosition()
      nearbyBudget -= 1
    }

    // 3) 远端 idle 覆盖层按小预算轮询探测，避免滚动到新区域时延迟过大
    const idleFarEntries = entries.filter(([img, overlay]) => {
      if (overlay.getState() !== 'idle') return false
      return !overlay.isInViewport() && !isNearViewport(img)
    })
    if (idleFarEntries.length > 0) {
      let probeBudget = Math.min(budget.probe, idleFarEntries.length)
      let index = overlayProbeCursor % idleFarEntries.length
      while (probeBudget > 0) {
        const [, overlay] = idleFarEntries[index]
        overlay.syncPosition()
        probeBudget -= 1
        index = (index + 1) % idleFarEntries.length
      }
      overlayProbeCursor = index
    } else {
      overlayProbeCursor = 0
    }
  })
}

/**
 * 启动全局位置同步监听（仅注册一次）
 */
function startGlobalPositionSync(): void {
  const handler = () => scheduleOverlayPositionSync()
  window.addEventListener('scroll', handler, { passive: true })
  document.addEventListener('scroll', handler, { passive: true, capture: true })
  window.addEventListener('resize', handler)
  window.visualViewport?.addEventListener('scroll', handler, { passive: true })
  window.visualViewport?.addEventListener('resize', handler)
}

/**
 * 调度清理已从 DOM 移除的图片 overlay
 */
function scheduleOverlayCleanup(): void {
  if (overlayCleanupRafId !== null) return
  overlayCleanupRafId = window.requestAnimationFrame(() => {
    overlayCleanupRafId = null

    // 清理待观察队列里已经失效的图片
    pendingImages.forEach((img) => {
      if (!img.isConnected) {
        pendingImages.delete(img)
        imageVisibilityObserver?.unobserve(img)
      }
    })

    let hasOverlayRemoved = false
    overlayMap.forEach((overlay, img) => {
      if (!img.isConnected) {
        overlay.destroy()
        overlayMap.delete(img)
        hasOverlayRemoved = true
      }
    })

    if (hasOverlayRemoved) {
      promotePendingImages(12)
    }
  })
}

/**
 * 启动 overlay 生命周期监听（单例）
 */
function startOverlayLifecycleObserver(): void {
  if (overlayLifecycleObserver) return
  overlayLifecycleObserver = new MutationObserver(() => {
    scheduleOverlayCleanup()
  })
  overlayLifecycleObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

function ensureImageVisibilityObserver(): void {
  if (imageVisibilityObserver) return
  imageVisibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const img = entry.target as HTMLImageElement
        if (!pendingImages.has(img)) continue

        if (createOverlayForImage(img)) {
          pendingImages.delete(img)
          imageVisibilityObserver?.unobserve(img)
        }
      }
    },
    {
      root: null,
      rootMargin: '300px',
      threshold: 0.01,
    }
  )
}

function isNearViewport(img: HTMLImageElement): boolean {
  const rect = img.getBoundingClientRect()
  const margin = 300
  return (
    rect.bottom >= -margin &&
    rect.top <= window.innerHeight + margin &&
    rect.right >= -margin &&
    rect.left <= window.innerWidth + margin
  )
}

function createOverlayForImage(img: HTMLImageElement): boolean {
  if (!img.isConnected) return false
  if (overlayMap.has(img)) return true
  if (overlayMap.size >= CONFIG.MAX_ACTIVE_OVERLAYS) return false

  const overlay = new ButtonOverlay(img)
  overlay.onClick(() => {
    handleButtonClick(img, overlay)
  })
  overlayMap.set(img, overlay)
  scheduleOverlayPositionSync()
  return true
}

function promotePendingImages(maxPromote: number): void {
  if (overlayMap.size >= CONFIG.MAX_ACTIVE_OVERLAYS) return
  let promoted = 0

  for (const img of pendingImages) {
    if (promoted >= maxPromote) break
    if (overlayMap.size >= CONFIG.MAX_ACTIVE_OVERLAYS) break
    if (!img.isConnected) {
      pendingImages.delete(img)
      imageVisibilityObserver?.unobserve(img)
      continue
    }
    if (!isNearViewport(img)) continue
    if (createOverlayForImage(img)) {
      pendingImages.delete(img)
      imageVisibilityObserver?.unobserve(img)
      promoted += 1
    }
  }
}

/**
 * 维持近视口 overlay 池：回收远端 idle overlay，降低滚动时更新成本
 */
function rebalanceOverlayPool(): void {
  if (overlayMap.size <= CONFIG.MAX_NEARBY_OVERLAYS) return

  const candidates: Array<[HTMLImageElement, ButtonOverlay]> = []
  overlayMap.forEach((overlay, img) => {
    if (overlay.getState() !== 'idle') return
    if (isNearViewport(img)) return
    candidates.push([img, overlay])
  })

  for (const [img, overlay] of candidates) {
    if (overlayMap.size <= CONFIG.MAX_NEARBY_OVERLAYS) break
    overlay.destroy()
    overlayMap.delete(img)

    if (img.isConnected && pendingImages.size < CONFIG.MAX_PENDING_IMAGES) {
      ensureImageVisibilityObserver()
      pendingImages.add(img)
      imageVisibilityObserver?.observe(img)
    }
  }
}

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

  const getScaledSize = (width: number, height: number) => {
    const maxEdge = CONFIG.MAX_ANALYZE_IMAGE_EDGE
    const maxCurrentEdge = Math.max(width, height)
    if (maxCurrentEdge <= maxEdge) {
      return { width, height }
    }
    const ratio = maxEdge / maxCurrentEdge
    return {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
    }
  }

  const drawToDataURL = (
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number
  ): string => {
    const { width, height } = getScaledSize(sourceWidth, sourceHeight)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建 canvas 上下文')
    }
    ctx.drawImage(source, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', 0.9)
  }
  
  // 尝试通过 canvas 获取图片数据
  try {
    return drawToDataURL(img, img.naturalWidth, img.naturalHeight)
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
      const blobUrl = URL.createObjectURL(blob)
      const tempImg = new Image()
      tempImg.onload = () => {
        try {
          const dataUrl = drawToDataURL(tempImg, tempImg.naturalWidth, tempImg.naturalHeight)
          resolve(dataUrl)
        } catch (drawError) {
          reject(drawError)
        } finally {
          URL.revokeObjectURL(blobUrl)
        }
      }
      tempImg.onerror = () => {
        URL.revokeObjectURL(blobUrl)
        reject(new Error('读取图片失败'))
      }
      tempImg.src = blobUrl
    })
  }
}

/**
 * 处理检测到的图片
 * @param img - 检测到的图片元素
 */
function handleImageDetected(img: HTMLImageElement): void {
  // 检查是否已存在按钮覆盖层
  if (overlayMap.has(img) || pendingImages.has(img)) {
    return
  }

  // 尽量优先创建近视口图片，减少一次性大量创建
  if (isNearViewport(img) && createOverlayForImage(img)) {
    return
  }

  // 超过待观察上限时，直接跳过最远的一批，避免集合无限增长
  if (pendingImages.size >= CONFIG.MAX_PENDING_IMAGES) {
    return
  }

  ensureImageVisibilityObserver()
  pendingImages.add(img)
  imageVisibilityObserver?.observe(img)
}

/**
 * 初始化 Content Script
 */
function init(): void {
  logger.log('[Content Script] 初始化图片提示词分析器')
  
  // 创建图片检测器
  const detector = new ImageDetector({
    minWidth: CONFIG.IMAGE_MIN_SIZE,
    minHeight: CONFIG.IMAGE_MIN_SIZE,
    minArea: CONFIG.IMAGE_MIN_AREA,
    observeMutations: true,
  })
  
  // 注册图片检测回调
  detector.onImageDetected(handleImageDetected)
  
  // 启动检测器
  detector.start()

  // 启动全局位置同步与生命周期清理（单例）
  startGlobalPositionSync()
  startOverlayLifecycleObserver()
  ensureImageVisibilityObserver()
  
  // 监听来自 popup 或 background 的消息
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_PAGE_IMAGES') {
      // 返回页面中所有符合条件的图片
      const images = Array.from(document.querySelectorAll('img'))
        .filter((img) => {
          if (!img.src) return false
          const meetsSize =
            img.naturalWidth >= CONFIG.IMAGE_MIN_SIZE &&
            img.naturalHeight >= CONFIG.IMAGE_MIN_SIZE &&
            img.naturalWidth * img.naturalHeight >= CONFIG.IMAGE_MIN_AREA
          if (!meetsSize) return false

          try {
            const protocol = new URL(img.currentSrc || img.src, window.location.href).protocol
            return (
              protocol !== 'chrome-extension:' &&
              protocol !== 'moz-extension:' &&
              protocol !== 'chrome:' &&
              protocol !== 'about:'
            )
          } catch {
            return true
          }
        })
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
