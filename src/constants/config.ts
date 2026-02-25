/**
 * 项目配置常量
 * 包含图片检测、UI尺寸、超时配置、存储限制等常量定义
 */

export const CONFIG = {
  // ========== 图片检测配置 ==========
  /** 最小图片宽高（像素），小于此尺寸的图片将被忽略 */
  IMAGE_MIN_SIZE: 96,
  /** 最小图片面积（像素），过小图片不展示按钮 */
  IMAGE_MIN_AREA: 12000,

  // ========== UI尺寸配置 ==========
  /** 按钮尺寸（像素） */
  BUTTON_SIZE: 28,
  /** 按钮偏移量（像素），用于定位按钮位置 */
  BUTTON_OFFSET: 4,
  /** 图标尺寸（像素） */
  ICON_SIZE: 16,
  /** 弹窗宽度（像素） */
  POPUP_WIDTH: 320,
  /** 弹窗最大高度（像素） */
  POPUP_MAX_HEIGHT: 400,
  /** 弹窗边距（像素） */
  POPUP_MARGIN: 8,

  // ========== 缩略图配置 ==========
  /** 缩略图最大尺寸（像素），用于限制预览图大小 */
  MAX_THUMBNAIL_SIZE: 256,
  /** 分析请求图片最大边长（像素），用于控制内存与带宽 */
  MAX_ANALYZE_IMAGE_EDGE: 2048,
  /** 页面中最多激活的按钮覆盖层数量 */
  MAX_ACTIVE_OVERLAYS: 80,
  /** 近视口区域建议维持的激活覆盖层数量（超过会回收远端 idle 覆盖层） */
  MAX_NEARBY_OVERLAYS: 24,
  /** 待观察（懒创建）的图片最大数量 */
  MAX_PENDING_IMAGES: 300,
  /** 每帧最多同步的近视口 idle 覆盖层数量 */
  MAX_SYNC_UPDATES_PER_FRAME: 16,
  /** 每帧用于轮询远端 idle 覆盖层的探测数量 */
  MAX_PROBE_UPDATES_PER_FRAME: 6,
  /** 进入中档预算的激活覆盖层阈值 */
  OVERLAY_BUDGET_MID_THRESHOLD: 24,
  /** 进入低档预算的激活覆盖层阈值 */
  OVERLAY_BUDGET_LOW_THRESHOLD: 48,
  /** 中档每帧同步预算 */
  MID_SYNC_UPDATES_PER_FRAME: 12,
  /** 低档每帧同步预算 */
  LOW_SYNC_UPDATES_PER_FRAME: 8,
  /** 中档每帧探测预算 */
  MID_PROBE_UPDATES_PER_FRAME: 4,
  /** 低档每帧探测预算 */
  LOW_PROBE_UPDATES_PER_FRAME: 2,

  // ========== 超时配置（毫秒） ==========
  /** 默认请求超时时间（3分钟） */
  DEFAULT_TIMEOUT_MS: 180000,
  /** 消息通信超时时间（2分10秒） */
  MESSAGE_TIMEOUT_MS: 130000,
  /** Tab消息超时时间（30秒） */
  TAB_MESSAGE_TIMEOUT_MS: 30000,
  /** 防抖延迟时间（毫秒），用于优化频繁操作 */
  DEBOUNCE_MS: 100,

  // ========== 存储限制配置 ==========
  /** 历史记录最大保存条数 */
  MAX_HISTORY_ITEMS: 50,
} as const
