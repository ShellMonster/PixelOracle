/**
 * 图片检测器模块
 * 负责监听页面中的图片元素，筛选出符合尺寸要求的图片
 * 使用 MutationObserver 监听 DOM 变化，动态检测新加载的图片
 */

import { logger } from '../utils/logger'
import { CONFIG } from '../constants'

// 图片检测器的配置选项接口
interface ImageDetectorOptions {
  // 最小宽度阈值（默认64px）
  minWidth?: number;
  // 最小高度阈值（默认64px）
  minHeight?: number;
  // 是否监听动态加载的图片（默认true）
  observeMutations?: boolean;
}

// 图片检测回调函数类型
type ImageDetectedCallback = (img: HTMLImageElement) => void;

/**
 * ImageDetector 类
 * 用于检测页面中符合尺寸要求的图片元素
 * 
 * 工作原理：
 * 1. 扫描页面中现有的 <img> 标签
 * 2. 使用 MutationObserver 监听 DOM 变化，检测新添加的图片
 * 3. 维护 WeakSet 避免重复处理同一张图片
 * 4. 通过回调函数通知调用者新检测到的图片
 */
export class ImageDetector {
  // 配置选项
  private options: Required<ImageDetectorOptions>;
  
  // WeakSet 用于存储已处理的图片，使用 WeakSet 的好处是：
  // - 不会阻止图片被垃圾回收
  // - 图片从 DOM 移除后自动从集合中消失
  private processedImages: WeakSet<HTMLImageElement> = new WeakSet();
  
  // MutationObserver 实例，用于监听 DOM 变化
  private observer: MutationObserver | null = null;
  
  // 防抖定时器，用于优化频繁的 DOM 变化处理
  private debounceTimer: number | null = null;
  
  // 存储注册的回调函数数组
  private callbacks: ImageDetectedCallback[] = [];
  
  // 标记是否正在监听中
  private isObserving = false;

  /**
   * 构造函数
   * @param options - 检测器配置选项
   */
  constructor(options: ImageDetectorOptions = {}) {
    this.options = {
      minWidth: options.minWidth ?? 64,      // 默认最小宽度64像素
      minHeight: options.minHeight ?? 64,    // 默认最小高度64像素
      observeMutations: options.observeMutations ?? true,  // 默认开启动态监听
    };
  }

  /**
   * 启动图片检测
   * 1. 扫描页面现有图片
   * 2. 启动 MutationObserver 监听新图片
   */
  public start(): void {
    if (this.isObserving) {
      logger.warn('[ImageDetector] 检测器已在运行中');
      return;
    }

    // 首先扫描页面中现有的图片
    this.scanExistingImages();

    // 如果配置了动态监听，启动 MutationObserver
    if (this.options.observeMutations) {
      this.startMutationObserver();
    }

    this.isObserving = true;
    logger.log('[ImageDetector] 图片检测器已启动');
  }

  /**
   * 停止图片检测
   * 断开 MutationObserver 连接，停止监听 DOM 变化
   */
  public stop(): void {
    // 清理防抖定时器
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isObserving = false;
    logger.log('[ImageDetector] 图片检测器已停止');
  }

  /**
   * 注册图片检测回调函数
   * 当检测到符合条件的图片时，会调用所有注册的回调
   * @param callback - 回调函数，接收检测到的图片元素
   */
  public onImageDetected(callback: ImageDetectedCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 移除已注册的回调函数
   * @param callback - 要移除的回调函数
   */
  public offImageDetected(callback: ImageDetectedCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 手动触发扫描页面现有图片
   * 可用于页面初始化或需要重新扫描的场景
   */
  public scanExistingImages(): void {
    // 获取页面中所有的 <img> 标签
    const images = document.querySelectorAll('img');
    
    images.forEach((img) => {
      this.processImage(img);
    });
  }

  /**
   * 处理单个图片元素
   * 检查图片是否符合条件，如果符合则触发回调
   * @param img - 要处理的图片元素
   */
  private processImage(img: HTMLImageElement): void {
    // 检查是否已经处理过该图片（使用 WeakSet 去重）
    if (this.processedImages.has(img)) {
      return;
    }

    // 检查图片是否加载完成且有有效尺寸
    // naturalWidth 和 naturalHeight 是图片的原始尺寸
    if (!img.complete || img.naturalWidth === 0) {
      // 图片尚未加载完成，添加 load 事件监听器
      img.addEventListener('load', () => {
        this.checkAndNotify(img);
      }, { once: true });  // once: true 表示只触发一次后自动移除监听器
      return;
    }

    // 图片已加载完成，直接检查
    this.checkAndNotify(img);
  }

  /**
   * 检查图片尺寸并通知回调
   * @param img - 要检查的图片元素
   */
  private checkAndNotify(img: HTMLImageElement): void {
    // 再次检查是否已处理（防止重复）
    if (this.processedImages.has(img)) {
      return;
    }

    // 检查图片尺寸是否满足最小要求
    const meetsRequirements = 
      img.naturalWidth >= this.options.minWidth &&
      img.naturalHeight >= this.options.minHeight;

    if (meetsRequirements) {
      // 将图片标记为已处理
      this.processedImages.add(img);
      
      // 触发所有注册的回调函数
      this.callbacks.forEach((callback) => {
        try {
          callback(img);
        } catch (error) {
          console.error('[ImageDetector] 回调函数执行出错:', error);
        }
      });
    }
  }

  /**
   * 启动 MutationObserver 监听 DOM 变化
   * 当有新元素添加到页面时，检查其中是否包含符合条件的图片
   */
  private startMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      // 防抖处理：清除之前的定时器
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
      }
      
      // 设置新的定时器，延迟执行处理逻辑
      this.debounceTimer = window.setTimeout(() => {
        this.debounceTimer = null;
        
        mutations.forEach((mutation) => {
          // 遍历所有新增的节点
          mutation.addedNodes.forEach((node) => {
            // 只处理元素节点（跳过文本节点、注释节点等）
            if (node.nodeType !== Node.ELEMENT_NODE) {
              return;
            }

            const element = node as Element;

            // 情况1：新增节点本身就是 <img> 标签
            if (element.tagName === 'IMG') {
              this.processImage(element as HTMLImageElement);
              return;
            }

            // 情况2：新增节点包含 <img> 子元素
            // 使用 querySelectorAll 查找所有嵌套的图片
            const nestedImages = element.querySelectorAll('img');
            nestedImages.forEach((img) => {
              this.processImage(img);
            });
          });
        });
      }, CONFIG.DEBOUNCE_MS);
    });

    // 开始监听整个文档的子树变化
    this.observer.observe(document.body, {
      childList: true,      // 监听子节点的增删
      subtree: true,        // 监听整个子树，而不仅仅是直接子节点
    });
  }

  /**
   * 检查检测器是否正在运行
   * @returns 是否正在监听
   */
  public get isRunning(): boolean {
    return this.isObserving;
  }

  /**
   * 获取当前配置选项
   * @returns 配置选项的副本
   */
  public getOptions(): Required<ImageDetectorOptions> {
    return { ...this.options };
  }
}

// 导出类型定义
export type { ImageDetectorOptions, ImageDetectedCallback };
