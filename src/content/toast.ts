/**
 * Toast 提示组件模块
 * 用于显示操作反馈提示，如成功、错误、加载中
 * 使用 Shadow DOM 隔离样式，避免与页面 CSS 冲突
 */

// Toast 提示的类型
type ToastType = 'success' | 'error' | 'loading';

/**
 * Toast 类
 * 在页面右上角显示操作提示消息
 *
 * 功能特性：
 * - 固定在页面右上角显示
 * - 三种类型：success（绿色）、error（红色）、loading（蓝色旋转）
 * - 自动消失：3秒（loading 类型不会自动消失）
 * - 使用 Shadow DOM 完全隔离样式
 * - 提供静态方法快速调用：success、error、loading
 */
export class Toast {
  // Shadow DOM 根节点
  private shadow: ShadowRoot;

  // Toast 容器元素（挂载到 body）
  private container: HTMLElement;

  // Shadow DOM 内部的 Toast 元素
  private toastElement!: HTMLElement;


  // 自动消失的定时器
  private autoHideTimer: number | null = null;

  // 单例实例（用于静态方法）
  private static instance: Toast | null = null;

  // loading 类型的 Toast 实例（需要手动关闭）
  private static loadingInstance: Toast | null = null;

  /**
   * 构造函数
   * 创建 Toast 容器和 Shadow DOM
   */
  constructor() {
    // 创建容器元素
    this.container = document.createElement('div');
    this.container.className = 'image-prompt-toast-container';

    // 创建 Shadow DOM
    this.shadow = this.container.attachShadow({ mode: 'closed' });

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

    // 创建 Toast 元素
    this.toastElement = this.createToastElement();

    // 将 Toast 添加到 Shadow DOM
    this.shadow.appendChild(this.toastElement);

    // 将容器挂载到 body
    document.body.appendChild(this.container);

    // 初始隐藏
    this.hide();
  }

  /**
   * 创建 Toast 元素
   * @returns 配置好的 Toast 元素
   */
  private createToastElement(): HTMLElement {
    const toast = document.createElement('div');
    toast.className = 'toast';

    // 创建图标容器
    const iconContainer = document.createElement('span');
    iconContainer.className = 'toast-icon';
    toast.appendChild(iconContainer);

    // 创建文本容器
    const textContainer = document.createElement('span');
    textContainer.className = 'toast-text';
    toast.appendChild(textContainer);

    return toast;
  }

  /**
   * 向 Shadow DOM 注入样式
   * 定义 Toast 的外观、动画和不同状态的颜色
   */
  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* Toast 基础样式 */
      .toast {
        /* 布局 */
        display: flex;
        align-items: center;
        gap: 8px;

        /* 尺寸 */
        padding: 12px 20px;

        /* 外观 */
        border-radius: 8px;

        /* 阴影效果 */
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

        /* 文字样式 */
        color: white;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

        /* 层级 - 最高优先级 */
        z-index: 2147483647;

        /* 过渡动画 */
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease;

        /* 防止继承页面样式 */
        margin: 0;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
      }

      /* 显示状态 */
      .toast.visible {
        opacity: 1;
        transform: translateX(0);
      }

      /* 成功状态 - 绿色背景 */
      .toast.success {
        background-color: #22c55e;
      }

      /* 错误状态 - 红色背景 */
      .toast.error {
        background-color: #ef4444;
      }

      /* 加载状态 - 蓝色背景 */
      .toast.loading {
        background-color: #3b82f6;
      }

      /* 图标样式 */
      .toast-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .toast-icon svg {
        width: 16px;
        height: 16px;
        fill: white;
      }

      /* 加载状态的旋转动画 */
      .toast.loading .toast-icon svg {
        animation: spin 1s linear infinite;
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

      /* 文本样式 */
      .toast-text {
        line-height: 1.4;
      }

      /* 容器样式 - 固定在右上角 */
      :host {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
      }
    `;

    this.shadow.appendChild(style);
  }

  /**
   * 获取成功状态的图标 SVG
   * @returns 勾选图标 SVG 字符串
   */
  private getSuccessIcon(): string {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    `;
  }

  /**
   * 获取错误状态的图标 SVG
   * @returns 错误图标 SVG 字符串
   */
  private getErrorIcon(): string {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
    `;
  }

  /**
   * 获取加载状态的图标 SVG
   * @returns 加载图标 SVG 字符串
   */
  private getLoadingIcon(): string {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
      </svg>
    `;
  }

  /**
   * 显示 Toast 提示
   * @param message - 要显示的消息文本
   * @param type - Toast 类型：'success' | 'error' | 'loading'
   */
  public show(message: string, type: ToastType): void {
    // 清除之前的自动消失定时器
    this.clearAutoHideTimer();


    // 移除所有类型类名
    this.toastElement.classList.remove('success', 'error', 'loading', 'visible');

    // 添加对应的类型类名和图标
    const iconContainer = this.toastElement.querySelector('.toast-icon');
    const textContainer = this.toastElement.querySelector('.toast-text');

    if (iconContainer && textContainer) {
      textContainer.textContent = message;

      switch (type) {
        case 'success':
          this.toastElement.classList.add('success');
          iconContainer.innerHTML = this.getSuccessIcon();
          break;
        case 'error':
          this.toastElement.classList.add('error');
          iconContainer.innerHTML = this.getErrorIcon();
          break;
        case 'loading':
          this.toastElement.classList.add('loading');
          iconContainer.innerHTML = this.getLoadingIcon();
          break;
      }
    }

    // 显示 Toast
    requestAnimationFrame(() => {
      this.toastElement.classList.add('visible');
    });

    // 非 loading 类型，3秒后自动消失
    if (type !== 'loading') {
      this.autoHideTimer = window.setTimeout(() => {
        this.hide();
      }, 3000);
    }
  }

  /**
   * 隐藏 Toast 提示
   */
  public hide(): void {
    // 清除自动消失定时器
    this.clearAutoHideTimer();

    // 移除显示类，触发退场动画
    this.toastElement.classList.remove('visible');
  }

  /**
   * 清除自动消失定时器
   */
  private clearAutoHideTimer(): void {
    if (this.autoHideTimer !== null) {
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  /**
   * 销毁组件
   * 清理定时器和 DOM 元素
   */
  public destroy(): void {
    // 清除定时器
    this.clearAutoHideTimer();

    // 移除容器元素
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  /**
   * 获取单例实例
   * @returns Toast 单例实例
   */
  private static getInstance(): Toast {
    if (!Toast.instance) {
      Toast.instance = new Toast();
    }
    return Toast.instance;
  }

  /**
   * 显示成功提示
   * @param message - 成功消息文本
   */
  public static success(message: string): void {
    const toast = Toast.getInstance();
    toast.show(message, 'success');
  }

  /**
   * 显示错误提示
   * @param message - 错误消息文本
   */
  public static error(message: string): void {
    const toast = Toast.getInstance();
    toast.show(message, 'error');
  }

  /**
   * 显示加载提示
   * 注意：loading 类型的 Toast 不会自动消失，需要手动调用 hide()
   * @param message - 加载消息文本
   * @returns Toast 实例，用于手动关闭
   */
  public static loading(message: string): Toast {
    // 如果有之前的 loading Toast，先销毁
    if (Toast.loadingInstance) {
      Toast.loadingInstance.destroy();
    }

    // 创建新的 loading Toast 实例
    const toast = new Toast();
    Toast.loadingInstance = toast;
    toast.show(message, 'loading');

    return toast;
  }
}

// 导出类型定义
export type { ToastType };
