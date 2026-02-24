import { t } from '../utils/i18n'

/**
 * 按钮覆盖组件模块
 * 负责在检测到的图片上显示一个圆形操作按钮
 * 使用 Shadow DOM 隔离样式，避免与页面 CSS 冲突
 */

// 按钮的状态类型
type ButtonState = 'idle' | 'loading' | 'success';

/**
 * ButtonOverlay 类
 * 在目标图片上创建一个悬浮的魔法按钮
 * 
 * 功能特性：
 * - 圆形按钮，淡蓝色背景，带魔杖图标
 * - 定位在图片左下角，绝对定位
 * - 三种状态：idle（闲置）、loading（加载中旋转）、success（成功）
 * - 悬浮显示 tooltip "逆向提示词"
 * - 使用 Shadow DOM 完全隔离样式
 * - 监听窗口 resize 事件，保持按钮位置同步
 */
export class ButtonOverlay {
  // Shadow DOM 根节点
  private shadowRoot: ShadowRoot;
  
  // 按钮容器元素（直接挂载到 body）
  private container: HTMLElement;
  
  // Shadow DOM 内部的按钮元素
  private button: HTMLButtonElement;
  
  // 当前的 tooltip 元素
  private tooltip: HTMLElement | null = null;
  
  // 当前按钮状态
  private state: ButtonState = 'idle';
  
  // 关联的目标图片元素
  private targetImage: HTMLImageElement;
  
  // 点击回调函数
  private onClickCallback: (() => void) | null = null;
  
  // 窗口 resize 事件处理函数（用于移除监听器）
  private resizeHandler: () => void;
  
  // 跟踪图片位置变化的 IntersectionObserver
  private intersectionObserver: IntersectionObserver | null = null;
  
  // 图片属性变化监听器（监听 src、style 等变化）
  private mutationObserver: MutationObserver | null = null;

  /**
   * 构造函数
   * @param targetImage - 要覆盖按钮的目标图片元素
   */
  constructor(targetImage: HTMLImageElement) {
    this.targetImage = targetImage;
    
    // 创建容器元素（挂载到 body，脱离图片的文档流）
    this.container = document.createElement('div');
    this.container.className = 'image-prompt-overlay-container';
    
    // 创建 Shadow DOM
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
    
    // 创建按钮元素
    this.button = this.createButton();
    
    // 绑定 resize 事件处理函数
    this.resizeHandler = this.updatePosition.bind(this);
    
    // 初始化
    this.init();
  }

  /**
   * 初始化组件
   * 创建 Shadow DOM 内容、设置样式、挂载到页面
   */
  private init(): void {
    // 注入 Shadow DOM 样式
    this.injectStyles();
    
    // 将按钮添加到 Shadow DOM
    this.shadowRoot.appendChild(this.button);
    
    // 将容器挂载到 body
    // 使用 fixed 定位相对于视口，不受图片父元素影响
    document.body.appendChild(this.container);
    
    // 设置初始位置
    this.updatePosition();
    
    // 启动位置同步监听
    this.startPositionSync();
    
    // 绑定事件
    this.bindEvents();
  }

  /**
   * 创建按钮元素
   * @returns 配置好的按钮元素
   */
  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'prompt-button';
    button.setAttribute('aria-label', t('reversePrompt'));
    button.setAttribute('title', t('reversePrompt'));
    
    // 设置按钮内容（魔杖图标）
    button.innerHTML = this.getIdleIcon();
    
    return button;
  }

  /**
   * 向 Shadow DOM 注入样式
   * 使用 CSS 变量和高 z-index 确保按钮显示在最上层
   */
  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* 按钮基础样式 */
      .prompt-button {
        /* 布局 */
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        
        /* 外观 - 圆形淡蓝色按钮 */
        background-color: #3b82f6;
        border: none;
        border-radius: 50%;
        
        /* 阴影效果 */
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4), 
                    0 4px 12px rgba(0, 0, 0, 0.15);
        
        /* 光标 */
        cursor: pointer;
        
        /* 层级 - 最高优先级 */
        z-index: 2147483647;
        
        /* 过渡动画 */
        transition: all 0.2s ease;
        
        /* 防止继承页面样式 */
        margin: 0;
        padding: 0;
        outline: none;
        
        /* 防止被选中 */
        user-select: none;
        -webkit-user-select: none;
      }
      
      /* 悬浮效果 */
      .prompt-button:hover {
        background-color: #2563eb;
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5), 
                    0 6px 16px rgba(0, 0, 0, 0.2);
      }
      
      /* 点击效果 */
      .prompt-button:active {
        transform: scale(0.95);
      }
      
      /* 加载状态 - 旋转动画 */
      .prompt-button.loading svg {
        animation: spin 1s linear infinite;
      }
      
      /* 成功状态 - 绿色背景 */
      .prompt-button.success {
        background-color: #22c55e;
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4), 
                    0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .prompt-button.success:hover {
        background-color: #16a34a;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.5), 
                    0 6px 16px rgba(0, 0, 0, 0.2);
      }
      
      /* 旋转动画定义 */
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      
      /* 图标样式 */
      .prompt-button svg {
        width: 16px;
        height: 16px;
        fill: white;
        flex-shrink: 0;
      }
      
      /* Tooltip 样式 */
      .prompt-tooltip {
        position: fixed;
        padding: 6px 10px;
        background-color: rgba(0, 0, 0, 0.85);
        color: white;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        z-index: 2147483647;
      }
      
      .prompt-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
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
    // 点击事件
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.onClickCallback && this.state !== 'loading') {
        this.onClickCallback();
      }
    });

    // 鼠标悬浮显示 tooltip
    this.button.addEventListener('mouseenter', () => {
      this.showTooltip();
    });

    // 鼠标离开隐藏 tooltip
    this.button.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  }

  /**
   * 启动位置同步
   * 监听窗口 resize、滚动以及图片位置变化
   */
  private startPositionSync(): void {
    // 监听窗口 resize
    window.addEventListener('resize', this.resizeHandler);
    
    // 监听滚动（使用 passive 提升性能）
    window.addEventListener('scroll', this.resizeHandler, { passive: true });

    // 使用 IntersectionObserver 监听图片可见性变化
    this.intersectionObserver = new IntersectionObserver(
      () => {
        this.updatePosition();
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '50px',
      }
    );
    this.intersectionObserver.observe(this.targetImage);

    // 监听图片属性变化（src 改变可能导致尺寸变化）
    this.mutationObserver = new MutationObserver(() => {
      // 延迟更新，等待图片加载完成
      setTimeout(() => this.updatePosition(), 100);
    });
    this.mutationObserver.observe(this.targetImage, {
      attributes: true,
      attributeFilter: ['src', 'style', 'width', 'height', 'class'],
    });
  }

  /**
   * 更新按钮位置
   * 根据目标图片的位置计算按钮应该显示的位置
   */
  private updatePosition(): void {
    // 获取图片的位置信息
    const rect = this.targetImage.getBoundingClientRect();
    
    // 检查图片是否在视口内
    if (rect.width === 0 || rect.height === 0) {
      this.container.style.display = 'none';
      return;
    }
    
    this.container.style.display = 'block';
    
    // 计算按钮位置：图片左下角，偏移 4px
    // 使用 fixed 定位，相对于视口
    const buttonSize = 28;
    const offset = 4;
    
    const left = rect.left + offset;
    const top = rect.bottom - buttonSize - offset;
    
    // 应用位置到容器
    this.container.style.position = 'fixed';
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
    this.container.style.width = `${buttonSize}px`;
    this.container.style.height = `${buttonSize}px`;
    this.container.style.pointerEvents = 'auto';
  }

  /**
   * 显示 tooltip
   */
  private showTooltip(): void {
    if (this.tooltip) {
      return;
    }
    
    // 在 body 上创建 tooltip（避免 Shadow DOM 的层级问题）
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'prompt-tooltip';
    this.tooltip.textContent = t('reversePrompt');
    
    // 复制 Shadow DOM 的 tooltip 样式
    this.tooltip.style.cssText = `
      position: fixed;
      padding: 6px 10px;
      background-color: rgba(0, 0, 0, 0.85);
      color: white;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 2147483647;
    `;
    
    document.body.appendChild(this.tooltip);
    
    // 计算 tooltip 位置（显示在按钮上方）
    const buttonRect = this.button.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    
    const left = buttonRect.left + (buttonRect.width / 2) - (tooltipRect.width / 2);
    const top = buttonRect.top - tooltipRect.height - 6;
    
    this.tooltip.style.left = `${Math.max(4, left)}px`;
    this.tooltip.style.top = `${Math.max(4, top)}px`;
    
    // 触发动画显示
    requestAnimationFrame(() => {
      if (this.tooltip) {
        this.tooltip.style.opacity = '1';
        this.tooltip.style.transform = 'translateY(0)';
      }
    });
  }

  /**
   * 隐藏 tooltip
   */
  private hideTooltip(): void {
    if (!this.tooltip) {
      return;
    }
    
    this.tooltip.style.opacity = '0';
    this.tooltip.style.transform = 'translateY(4px)';
    
    // 动画结束后移除元素
    setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.remove();
        this.tooltip = null;
      }
    }, 200);
  }

  /**
   * 获取闲置状态的魔杖图标 SVG
   */
  private getIdleIcon(): string {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/>
        <path d="m14 7 3 3"/>
        <path d="M5 6v4"/>
        <path d="M19 14v4"/>
        <path d="M10 2v2"/>
        <path d="M7 8H3"/>
        <path d="M21 16h-4"/>
        <path d="M11 3H9"/>
      </svg>
    `;
  }

  /**
   * 获取加载状态的旋转图标 SVG
   */
  private getLoadingIcon(): string {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        <path d="M12 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" opacity=".3"/>
      </svg>
    `;
  }

  /**
   * 获取成功状态的感叹号图标 SVG
   */
  private getSuccessIcon(): string {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    `;
  }

  /**
   * 设置按钮状态
   * @param state - 要设置的状态
   */
  public setState(state: ButtonState): void {
    this.state = state;
    
    // 移除所有状态类
    this.button.classList.remove('loading', 'success');
    
    // 根据状态设置对应的图标和样式
    switch (state) {
      case 'idle':
        this.button.innerHTML = this.getIdleIcon();
        break;
      case 'loading':
        this.button.classList.add('loading');
        this.button.innerHTML = this.getLoadingIcon();
        break;
      case 'success':
        this.button.classList.add('success');
        this.button.innerHTML = this.getSuccessIcon();
        break;
    }
  }

  /**
   * 注册点击事件回调
   * @param callback - 点击时的回调函数
   */
  public onClick(callback: () => void): void {
    this.onClickCallback = callback;
  }

  /**
   * 销毁组件
   * 清理所有事件监听器和 DOM 元素
   */
  public destroy(): void {
    // 移除事件监听器
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('scroll', this.resizeHandler);
    
    // 断开观察者
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // 隐藏并移除 tooltip
    this.hideTooltip();
    
    // 移除容器元素
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  /**
   * 获取当前状态
   */
  public getState(): ButtonState {
    return this.state;
  }

  /**
   * 获取按钮元素
   * @returns 按钮元素
   */
  public getButtonElement(): HTMLButtonElement {
    return this.button
  }
}

// 导出类型定义
export type { ButtonState };
