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
  /** 图片在页面上的最小显示边长（像素），用于过滤头像/小图标 */
  IMAGE_MIN_RENDER_SIZE: 72,
  /** 图片在页面上的最小显示面积（像素），用于过滤头像/小图标 */
  IMAGE_MIN_RENDER_AREA: 6400,
  /** 按钮展示所需的最小可视宽度（像素） */
  OVERLAY_MIN_VISIBLE_WIDTH: 40,
  /** 按钮展示所需的最小可视高度（像素） */
  OVERLAY_MIN_VISIBLE_HEIGHT: 40,
  /** 按钮展示所需的最小可视面积（像素） */
  OVERLAY_MIN_VISIBLE_AREA: 1600,

  // ========== 缩略图配置 ==========
  /** 缩略图最大尺寸（像素），用于限制预览图大小 */
  MAX_THUMBNAIL_SIZE: 256,
  /** 分析请求图片最大边长（像素），用于控制内存与带宽 */
  MAX_ANALYZE_IMAGE_EDGE: 1536,
  /** 页面中最多激活的按钮覆盖层数量 */
  MAX_ACTIVE_OVERLAYS: 48,
  /** 近视口区域建议维持的激活覆盖层数量（超过会回收远端 idle 覆盖层） */
  MAX_NEARBY_OVERLAYS: 24,
  /** 待观察（懒创建）的图片最大数量 */
  MAX_PENDING_IMAGES: 120,
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

  // ========== 任务调度配置（毫秒） ==========
  /** 防抖延迟时间（毫秒），用于优化频繁操作 */
  DEBOUNCE_MS: 150,
  /** 单次 DOM 变更批处理中最多扫描的图片数量 */
  MAX_IMAGES_SCAN_PER_BATCH: 80,

  // ========== 存储限制配置 ==========
  /** 历史记录最大保存条数 */
  MAX_HISTORY_ITEMS: 50,
} as const
