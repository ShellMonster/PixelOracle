/**
 * 统一日志工具
 * 生产环境 log 方法静默，仅保留 warn 和 error
 */

// 判断是否为开发环境
// Chrome Extension 构建后没有 NODE_ENV，使用自定义判断
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'

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
 * - log: 开发环境输出，生产环境静默
 * - warn: 始终输出警告
 * - error: 始终输出错误
 */
export const logger: Logger = {
  log: isDev ? console.log.bind(console) : () => {},
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

export default logger
