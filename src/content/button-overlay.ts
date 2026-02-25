import { t } from '../utils/i18n'
import { CONFIG } from '../constants/config'

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

  // 最近一次定位后是否在视口范围内
  private inViewport = false;
  
  // 关联的目标图片元素
  private targetImage: HTMLImageElement;
  
  // 点击回调函数
  private onClickCallback: (() => void) | null = null;

  // 上次渲染位置缓存（避免无变化重复写样式）
  private lastLeft = -1;
  private lastTop = -1;
  private lastVisible = false;

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
    
    // 固定布局属性一次性设置，避免 updatePosition 重复写入
    this.container.style.position = 'fixed';
    this.container.style.left = '0';
    this.container.style.top = '0';
    this.container.style.willChange = 'transform';
    this.container.style.width = '28px';
    this.container.style.height = '28px';
    this.container.style.pointerEvents = 'auto';

    // 设置初始位置
    this.updatePosition();
    
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
        color: white;
        stroke: currentColor;
        fill: none;
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
   * 更新按钮位置
   * 根据目标图片的位置计算按钮应该显示的位置
   */
  private updatePosition(): void {
    // 获取图片的位置信息
    const rect = this.targetImage.getBoundingClientRect();

    // 计算图片与视口的可见交集，避免只露出极小区域时按钮被钳制到左上角
    const visibleLeft = Math.max(rect.left, 0);
    const visibleTop = Math.max(rect.top, 0);
    const visibleRight = Math.min(rect.right, window.innerWidth);
    const visibleBottom = Math.min(rect.bottom, window.innerHeight);
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const visibleArea = visibleWidth * visibleHeight;
    
    // 检查图片是否在视口内
    if (
      rect.width === 0 ||
      rect.height === 0 ||
      rect.bottom <= 0 ||
      rect.top >= window.innerHeight ||
      rect.right <= 0 ||
      rect.left >= window.innerWidth ||
      visibleWidth < CONFIG.OVERLAY_MIN_VISIBLE_WIDTH ||
      visibleHeight < CONFIG.OVERLAY_MIN_VISIBLE_HEIGHT ||
      visibleArea < CONFIG.OVERLAY_MIN_VISIBLE_AREA
    ) {
      this.inViewport = false;
      if (this.lastVisible) {
        this.container.style.display = 'none';
        this.lastVisible = false;
      }
      return;
    }
    
    this.inViewport = true;
    if (!this.lastVisible) {
      this.container.style.display = 'block';
      this.lastVisible = true;
    }
    
    // 计算按钮位置：图片左下角，偏移 4px
    // 使用 fixed 定位，相对于视口
    const buttonSize = 28;
    const offset = 4;
    
    const left = Math.min(Math.max(rect.left + offset, 4), window.innerWidth - buttonSize - 4);
    const top = Math.min(Math.max(rect.bottom - buttonSize - offset, 4), window.innerHeight - buttonSize - 4);
    
    if (this.lastLeft !== left || this.lastTop !== top) {
      this.container.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      this.lastLeft = left;
      this.lastTop = top;
    }
  }

  /**
   * 由外部统一调度位置更新（全局滚动/resize驱动）
   */
  public syncPosition(): void {
    this.updatePosition();
  }

  /**
   * 获取最近一次定位后的可见状态
   */
  public isInViewport(): boolean {
    return this.inViewport;
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
   * 获取闲置状态的 Sparkles 图标（与参考项目风格一致）
   */
  private getIdleIcon(): string {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/>
        <path d="M3 5h4"/>
        <path d="M19 17v4"/>
        <path d="M17 19h4"/>
      </svg>
    `;
  }

  /**
   * 获取加载状态的旋转图标 SVG
   */
  private getLoadingIcon(): string {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" opacity="0.25"/>
        <path d="M22 12a10 10 0 0 0-10-10"/>
      </svg>
    `;
  }

  /**
   * 获取成功状态的感叹号图标 SVG
   */
  private getSuccessIcon(): string {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
