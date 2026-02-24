/**
 * CSS 样式常量
 * 定义按钮、弹窗等组件共享的样式变量
 */

/**
 * 颜色常量
 */
export const COLORS = {
  /** 主色调 - 蓝色 */
  PRIMARY: '#3b82f6',
  /** 主色调悬停 */
  PRIMARY_HOVER: '#2563eb',
  /** 成功色 - 绿色 */
  SUCCESS: '#22c55e',
  /** 成功色悬停 */
  SUCCESS_HOVER: '#16a34a',
  /** 白色 */
  WHITE: '#ffffff',
  /** 黑色（用于透明度） */
  BLACK: '#000000',
  /** 提示框背景色 */
  TOOLTIP_BG: 'rgba(0, 0, 0, 0.85)',
  /** 文字颜色 */
  TEXT_PRIMARY: '#333333',
  /** 次要文字颜色 */
  TEXT_SECONDARY: '#666666',
  /** 边框颜色 */
  BORDER: '#e5e7eb',
} as const

/**
 * 阴影常量
 */
export const SHADOWS = {
  /** 按钮阴影 */
  BUTTON: '0 2px 8px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)',
  /** 弹窗阴影 */
  POPUP: '0 8px 32px rgba(0, 0, 0, 0.2)',
  /** 悬停阴影 */
  HOVER: '0 4px 12px rgba(59, 130, 246, 0.5), 0 8px 24px rgba(0, 0, 0, 0.2)',
} as const

/**
 * 层级常量
 */
export const Z_INDEX = {
  /** 最高层级 - 用于覆盖所有元素 */
  MAX: 2147483647,
} as const

/**
 * 动画常量
 */
export const ANIMATION = {
  /** 默认过渡时间 */
  DURATION: '0.2s',
  /** 缓动函数 */
  EASING: 'ease',
} as const

/**
 * 圆角常量
 */
export const RADIUS = {
  /** 按钮圆角（圆形） */
  BUTTON: '50%',
  /** 弹窗圆角 */
  POPUP: '8px',
  /** 提示框圆角 */
  TOOLTIP: '4px',
} as const
