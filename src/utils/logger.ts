/**
 * 统一日志工具
 * 生产环境 log 方法静默，仅保留 warn 和 error
 */

/**
 * Logger 接口
 */
interface Logger {
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/**
 * 统一日志对象
 * - log: 生产环境静默（Chrome Extension 打包后无开发环境检测）
 * - warn: 始终输出警告
 * - error: 始终输出错误
 */
export const logger: Logger = {
  log: () => {},  // 生产环境静默
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

export default logger
