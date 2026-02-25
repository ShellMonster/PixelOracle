/**
 * 提示词弹窗组件模块
 * 负责显示逆向生成的提示词内容
 * 使用 Shadow DOM 隔离样式，支持复制功能
 */

import { t } from '../utils/i18n'

/**
 * PromptPopup 类
 * 在按钮旁边显示一个弹窗，展示 AI 生成的提示词
 * 
 * 功能特性：
 * - 白色背景，圆角8px，阴影效果
 * - 定位在按钮右侧
 * - 内容包含：标题"提示词" + prompt文本 + 复制按钮
 * - 淡入动画效果
 * - 使用 Shadow DOM 完全隔离样式
 * - 支持一键复制到剪贴板
 */
export class PromptPopup {
  // Shadow DOM 根节点
  private shadowRoot: ShadowRoot;
  
  // 弹窗容器元素
  private container: HTMLElement;
  
  // 弹窗内容元素
  private popup: HTMLElement;
  
  // 关闭按钮
  private closeButton: HTMLButtonElement;
  
  // 复制按钮
  private copyButton: HTMLButtonElement;
  
  // 提示词文本容器
  private promptText: HTMLElement;
  
  // 当前显示的提示词内容
  private currentPrompt: string = '';
  
  // 弹窗是否可见
  private isVisible = false;
  
  // 关闭回调
  private onCloseCallback: (() => void) | null = null;
  
  // 点击外部关闭的处理函数
  private outsideClickHandler: (e: MouseEvent) => void;

  // 当前锚点元素（用于跟随定位）
  private anchorElement: HTMLElement | null = null;
  private positionSyncRafId: number | null = null;
  private positionSyncHandler: () => void;
  private isPositionSyncing = false;
  private isTemporarilyHidden = false;

  // 加载态计时器
  private loadingTimerId: number | null = null;
  private loadingStartedAt = 0;

  /**
   * 构造函数
   */
  constructor() {
    // 创建容器元素
    this.container = document.createElement('div');
    this.container.className = 'image-prompt-popup-container';
    
    // 创建 Shadow DOM
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
    
    // 绑定外部点击处理函数
    this.outsideClickHandler = this.handleOutsideClick.bind(this);
    this.positionSyncHandler = this.schedulePositionSync.bind(this);
    
    // 初始化
    this.popup = this.createPopup();
    this.closeButton = this.createCloseButton();
    this.copyButton = this.createCopyButton();
    this.promptText = this.createPromptText();
    
    this.init();
  }

  /**
   * 初始化组件
   */
  private init(): void {
    // 注入样式
    this.injectStyles();
    
    // 组装弹窗结构
    this.assemblePopup();
    
    // 添加到 Shadow DOM
    this.shadowRoot.appendChild(this.popup);
    
    // 添加到 body
    document.body.appendChild(this.container);
    
    // 初始隐藏
    this.hide();
    
    // 绑定事件
    this.bindEvents();
  }

  /**
   * 创建弹窗主元素
   */
  private createPopup(): HTMLElement {
    const popup = document.createElement('div');
    popup.className = 'prompt-popup';
    return popup;
  }

  /**
   * 创建关闭按钮
   */
  private createCloseButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'close-button';
    button.setAttribute('aria-label', t('close'));
    button.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    `;
    return button;
  }

  /**
   * 创建复制按钮
   */
  private createCopyButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
      <span>${t('copy')}</span>
    `;
    return button;
  }

  /**
   * 创建提示词文本容器
   */
  private createPromptText(): HTMLElement {
    const text = document.createElement('div');
    text.className = 'prompt-text';
    return text;
  }

  /**
   * 组装弹窗结构
   */
  private assemblePopup(): void {
    // 创建头部区域
    const header = document.createElement('div');
    header.className = 'popup-header';
    
    const title = document.createElement('h3');
    title.className = 'popup-title';
    title.textContent = t('reversePrompt');
    
    header.appendChild(title);
    header.appendChild(this.closeButton);
    
    // 创建内容区域
    const content = document.createElement('div');
    content.className = 'popup-content';
    content.appendChild(this.promptText);
    
    // 创建底部区域（复制按钮）
    const footer = document.createElement('div');
    footer.className = 'popup-footer';
    footer.appendChild(this.copyButton);
    
    // 组装弹窗
    this.popup.appendChild(header);
    this.popup.appendChild(content);
    this.popup.appendChild(footer);
  }

  /**
   * 注入 Shadow DOM 样式
   */
  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* 弹窗主容器 */
      .prompt-popup {
        /* 布局 */
        display: flex;
        flex-direction: column;
        
        /* 尺寸 */
        width: 320px;
        max-width: calc(100vw - 32px);
        max-height: 400px;
        
        /* 外观 */
        background-color: #ffffff;
        border-radius: 8px;
        
        /* 阴影效果 */
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15),
                    0 8px 24px rgba(0, 0, 0, 0.1);
        
        /* 层级 - 最高优先级 */
        z-index: 2147483647;
        
        /* 动画 */
        opacity: 0;
        transform: scale(0.95) translateY(-8px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        
        /* 防止继承页面样式 */
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #1f2937;
      }
      
      /* 显示状态 */
      .prompt-popup.visible {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      
      /* 头部区域 */
      .popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      /* 标题 */
      .popup-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #111827;
      }
      
      /* 关闭按钮 */
      .close-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        margin: 0;
        background: transparent;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.15s ease;
      }
      
      .close-button:hover {
        background-color: #f3f4f6;
      }
      
      .close-button svg {
        width: 16px;
        height: 16px;
        fill: #6b7280;
      }
      
      .close-button:hover svg {
        fill: #374151;
      }
      
      /* 内容区域 */
      .popup-content {
        flex: 1;
        padding: 12px 16px;
        overflow-y: auto;
        min-height: 60px;
        max-height: 280px;
      }
      
      /* 提示词文本 */
      .prompt-text {
        font-size: 13px;
        line-height: 1.6;
        color: #374151;
        white-space: pre-wrap;
        word-break: break-word;
      }
      
      /* 底部区域 */
      .popup-footer {
        display: flex;
        justify-content: flex-end;
        padding: 12px 16px;
        border-top: 1px solid #e5e7eb;
        gap: 8px;
      }
      
      /* 复制按钮 */
      .copy-button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background-color: #3b82f6;
        color: white;
        font-size: 13px;
        font-weight: 500;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      
      .copy-button:hover {
        background-color: #2563eb;
      }
      
      .copy-button:active {
        transform: scale(0.98);
      }
      
      .copy-button svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
      }
      
      /* 复制成功状态 */
      .copy-button.copied {
        background-color: #22c55e;
      }
      
      .copy-button.copied:hover {
        background-color: #16a34a;
      }
      
      /* 加载状态 */
      .loading-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        color: #6b7280;
        font-size: 13px;
      }
      
      /* 错误状态 */
      .error-message {
        padding: 12px;
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #dc2626;
        font-size: 13px;
      }
      
      /* 滚动条样式 */
      .popup-content::-webkit-scrollbar {
        width: 6px;
      }
      
      .popup-content::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .popup-content::-webkit-scrollbar-thumb {
        background-color: #d1d5db;
        border-radius: 3px;
      }
      
      .popup-content::-webkit-scrollbar-thumb:hover {
        background-color: #9ca3af;
      }
      
      /* 确保容器不影响布局 */
      :host {
        position: fixed;
        pointer-events: none;
        z-index: 2147483647;
      }
    `;
    
    this.shadowRoot.appendChild(style);
  }

  /**
   * 绑定事件监听器
   */
  private bindEvents(): void {
    // 关闭按钮点击
    this.closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    // 复制按钮点击
    this.copyButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleCopy();
    });

    // 阻止弹窗内部点击事件冒泡（避免触发外部点击关闭）
    this.popup.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * 处理外部点击事件
   */
  private handleOutsideClick(e: MouseEvent): void {
    // 如果点击的是弹窗外部，则关闭弹窗
    if (this.isVisible && !this.container.contains(e.target as Node)) {
      this.hide();
    }
  }

  /**
   * 处理复制操作
   */
  private async handleCopy(): Promise<void> {
    if (!this.currentPrompt) {
      return;
    }

    try {
      // 使用 Clipboard API 复制文本
      await navigator.clipboard.writeText(this.currentPrompt);
      
      // 显示复制成功状态
      this.showCopySuccess();
    } catch (error) {
      console.error('[PromptPopup] 复制失败:', error);
      
      // 降级方案：使用传统的复制方法
      this.fallbackCopy();
    }
  }

  /**
   * 复制成功的视觉反馈
   */
  private showCopySuccess(): void {
    // 保存原始内容
    const originalHTML = this.copyButton.innerHTML;
    
    // 更改按钮样式和内容
    this.copyButton.classList.add('copied');
    this.copyButton.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      <span>${t('copied')}</span>
    `;
    
    // 2秒后恢复原始状态
    setTimeout(() => {
      this.copyButton.classList.remove('copied');
      this.copyButton.innerHTML = originalHTML;
    }, 2000);
  }

  /**
   * 降级复制方案（兼容旧浏览器）
   */
  private fallbackCopy(): void {
    // 创建临时文本域
    const textarea = document.createElement('textarea');
    textarea.value = this.currentPrompt;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    
    try {
      // 选择文本并执行复制命令
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      
      if (successful) {
        this.showCopySuccess();
      } else {
        console.error('[PromptPopup] 复制命令执行失败');
      }
    } catch (error) {
      console.error('[PromptPopup] 降级复制失败:', error);
    } finally {
      // 清理临时元素
      document.body.removeChild(textarea);
    }
  }

  /**
   * 显示弹窗
   * @param anchorElement - 作为定位锚点的元素（通常是按钮）
   * @param prompt - 要显示的提示词内容
   */
  public show(anchorElement: HTMLElement, prompt: string): void {
    this.anchorElement = anchorElement;
    this.currentPrompt = prompt;
    this.promptText.textContent = prompt;
    
    // 计算弹窗位置
    this.updatePosition(anchorElement);
    
    // 显示容器
    this.container.style.display = 'block';
    this.container.style.pointerEvents = 'auto';
    this.isTemporarilyHidden = false;
    
    // 触发动画
    requestAnimationFrame(() => {
      this.popup.classList.add('visible');
    });
    
    this.isVisible = true;
    
    // 添加外部点击监听（延迟添加，避免立即触发）
    setTimeout(() => {
      document.addEventListener('click', this.outsideClickHandler);
    }, 0);

    this.startPositionSync();
  }

  /**
   * 隐藏弹窗
   */
  public hide(): void {
    this.stopLoadingTimer();
    this.stopPositionSync();

    if (!this.isVisible) {
      return;
    }
    
    // 移除动画类
    this.popup.classList.remove('visible');
    
    // 延迟隐藏容器（等待动画完成）
    setTimeout(() => {
      this.container.style.display = 'none';
      this.container.style.pointerEvents = 'none';
    }, 200);
    
    this.isVisible = false;
    
    // 移除外部点击监听
    document.removeEventListener('click', this.outsideClickHandler);
    this.anchorElement = null;
    
    // 触发关闭回调
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  /**
   * 更新弹窗位置
   * @param anchorElement - 锚点元素
   */
  private updatePosition(anchorElement: HTMLElement): void {
    const anchorRect = anchorElement.getBoundingClientRect();
    this.updatePositionByRect(anchorRect);
  }

  private updatePositionByRect(anchorRect: DOMRect): void {
    const popupWidth = 320;
    const popupHeight = Math.min(400, this.popup.offsetHeight || 200);
    
    // 默认显示在按钮右侧
    let left = anchorRect.right + 8;
    let top = anchorRect.top;
    
    // 检查是否超出视口右侧
    if (left + popupWidth > window.innerWidth - 16) {
      // 超出右侧，显示在按钮左侧
      left = anchorRect.left - popupWidth - 8;
    }
    
    // 确保不超出左侧
    if (left < 16) {
      left = 16;
    }
    
    // 检查是否超出视口底部
    if (top + popupHeight > window.innerHeight - 16) {
      // 向上调整
      top = window.innerHeight - popupHeight - 16;
    }
    
    // 确保不超出顶部
    if (top < 16) {
      top = 16;
    }
    
    // 应用位置
    this.container.style.position = 'fixed';
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }

  /**
   * 设置关闭回调
   * @param callback - 弹窗关闭时的回调函数
   */
  public onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  /**
   * 显示加载状态（可指定请求起始时间）
   * @param startedAt - 请求开始时间戳（毫秒）
   */
  public showLoadingWithStartTime(startedAt: number): void {
    this.stopLoadingTimer();
    this.loadingStartedAt = startedAt;
    this.renderLoading();
    this.loadingTimerId = window.setInterval(() => {
      this.renderLoading();
    }, 1000);

    this.copyButton.disabled = true;
    this.copyButton.style.opacity = '0.5';
    this.copyButton.style.cursor = 'not-allowed';
  }

  /**
   * 显示错误信息
   * @param error - 错误信息
   */
  public showError(error: string): void {
    this.stopLoadingTimer();
    this.promptText.innerHTML = `
      <div class="error-message">
        ${error}
      </div>
    `;
    
    // 禁用复制按钮
    this.copyButton.disabled = true;
    this.copyButton.style.opacity = '0.5';
    this.copyButton.style.cursor = 'not-allowed';
  }

  /**
   * 设置提示词内容
   * @param prompt - 提示词文本
   */
  public setPrompt(prompt: string): void {
    this.stopLoadingTimer();
    this.currentPrompt = prompt;
    this.promptText.textContent = prompt;
    
    // 启用复制按钮
    this.copyButton.disabled = false;
    this.copyButton.style.opacity = '1';
    this.copyButton.style.cursor = 'pointer';
  }

  /**
   * 获取当前提示词
   */
  public getPrompt(): string {
    return this.currentPrompt;
  }

  /**
   * 检查弹窗是否可见
   */
  public getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * 销毁组件
   */
  public destroy(): void {
    this.stopLoadingTimer();
    this.stopPositionSync();

    // 移除外部点击监听
    document.removeEventListener('click', this.outsideClickHandler);
    
    // 移除容器
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  private renderLoading(): void {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.loadingStartedAt) / 1000));
    this.promptText.innerHTML = `
      <div class="loading-indicator">
        <span>${t('analyzingImage')} (${elapsedSeconds}${t('seconds')})</span>
      </div>
    `;
  }

  private stopLoadingTimer(): void {
    if (this.loadingTimerId !== null) {
      clearInterval(this.loadingTimerId);
      this.loadingTimerId = null;
    }
  }

  private schedulePositionSync(): void {
    if (!this.isVisible) return;
    if (!this.anchorElement) return;
    if (this.positionSyncRafId !== null) return;

    this.positionSyncRafId = window.requestAnimationFrame(() => {
      this.positionSyncRafId = null;
      if (!this.isVisible || !this.anchorElement) return;
      if (!this.anchorElement.isConnected) {
        this.hide();
        return;
      }

      const anchorRect = this.anchorElement.getBoundingClientRect();
      if (!this.isAnchorInViewport(anchorRect)) {
        this.setTemporaryHidden(true);
        return;
      }

      this.setTemporaryHidden(false);
      this.updatePositionByRect(anchorRect);
    });
  }

  private isAnchorInViewport(rect: DOMRect): boolean {
    if (rect.width < 2 || rect.height < 2) {
      return false;
    }
    return (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    );
  }

  private setTemporaryHidden(hidden: boolean): void {
    if (this.isTemporarilyHidden === hidden) return;
    this.isTemporarilyHidden = hidden;
    if (hidden) {
      this.container.style.display = 'none';
      this.container.style.pointerEvents = 'none';
      return;
    }
    this.container.style.display = 'block';
    this.container.style.pointerEvents = 'auto';
  }

  private startPositionSync(): void {
    if (this.isPositionSyncing) return;
    this.isPositionSyncing = true;
    window.addEventListener('scroll', this.positionSyncHandler, { passive: true });
    document.addEventListener('scroll', this.positionSyncHandler, { passive: true, capture: true });
    window.addEventListener('resize', this.positionSyncHandler);
    window.visualViewport?.addEventListener('scroll', this.positionSyncHandler, { passive: true });
    window.visualViewport?.addEventListener('resize', this.positionSyncHandler);
  }

  private stopPositionSync(): void {
    if (!this.isPositionSyncing) return;
    this.isPositionSyncing = false;
    window.removeEventListener('scroll', this.positionSyncHandler);
    document.removeEventListener('scroll', this.positionSyncHandler, true);
    window.removeEventListener('resize', this.positionSyncHandler);
    window.visualViewport?.removeEventListener('scroll', this.positionSyncHandler);
    window.visualViewport?.removeEventListener('resize', this.positionSyncHandler);
    if (this.positionSyncRafId !== null) {
      cancelAnimationFrame(this.positionSyncRafId);
      this.positionSyncRafId = null;
    }
  }
}
