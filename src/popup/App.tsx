import { useState, useEffect, useCallback } from 'react'
import { 
  History, 
  Settings, 
  ExternalLink, 
  Trash2, 
  Copy, 
  Check, 
  Power, 
  PowerOff,
  ChevronDown,
  Sparkles,
  Clock,
  Link as LinkIcon
} from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { getHistory, clearHistory, deleteHistoryItem, type HistoryItem } from '../services/storage'
import { t } from '../utils/i18n'

// Toast提示组件
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-2 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}>
      {message}
    </div>
  )
}

// 格式化时间显示
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于1小时显示"X分钟前"
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return minutes < 1 ? t('timeJustNow') : t('timeMinutesAgo', [String(minutes)])
  }
  
  // 小于24小时显示"X小时前"
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return t('timeHoursAgo', [String(hours)])
  }
  
  // 大于24小时显示日期
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 截断文本
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function getSourceLinkText(sourceUrl?: string): string {
  if (!sourceUrl) return ''
  try {
    const url = new URL(sourceUrl)
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
  } catch {
    return sourceUrl
  }
}

function App() {
  const extensionVersion = chrome.runtime.getManifest().version || '0.0.0'

  // 从store获取设置
  const { 
    apiProvider, 
    enabled, 
    loadSettings, 
    setApiProvider, 
    setEnabled 
  } = useSettingsStore()
  
  // 本地状态
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showProviderDropdown, setShowProviderDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 加载设置和历史记录
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await loadSettings()
      await loadHistory()
      setIsLoading(false)
    }
    init()
  }, [loadSettings])

  // 加载历史记录
  const loadHistory = async () => {
    try {
      const items = await getHistory()
      // 只显示前20条
      setHistory(items.slice(0, 20))
    } catch (error) {
      console.error(t('errorLoadHistory'), error)
    }
  }

  // 显示Toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
  }

  // 复制prompt到剪贴板
  const handleCopyPrompt = useCallback(async (item: HistoryItem) => {
    try {
      await navigator.clipboard.writeText(item.prompt)
      setCopiedId(item.md5)
      showToast(t('copiedToClipboard'))
      setTimeout(() => setCopiedId(null), 1500)
    } catch (error) {
      showToast(t('errorCopyFailed'), 'error')
    }
  }, [])

  // 清空历史记录
  const handleClearHistory = async () => {
    if (!confirm(t('confirmClearHistory'))) {
      return
    }
    
    try {
      await clearHistory()
      setHistory([])
      showToast(t('historyCleared'))
    } catch (error) {
      showToast(t('errorClearFailed'), 'error')
    }
  }

  // 删除单条历史记录
  const handleDeleteHistoryItem = async (md5: string) => {
    try {
      await deleteHistoryItem(md5)
      setHistory((prev) => prev.filter((item) => item.md5 !== md5))
    } catch (error) {
      showToast(t('errorClearFailed'), 'error')
    }
  }

  // 切换API Provider
  const handleProviderChange = async (provider: 'gemini' | 'openai') => {
    await setApiProvider(provider)
    setShowProviderDropdown(false)
    showToast(t('switchedTo', [provider === 'gemini' ? 'Gemini' : 'OpenAI']))
  }

  // 切换启用状态
  const handleToggleEnabled = async () => {
    await setEnabled(!enabled)
    showToast(enabled ? t('extensionDisabled') : t('extensionEnabled'))
  }

  // 打开设置页面
  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage()
  }

  if (isLoading) {
    return (
      <div className="w-80 h-96 bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-80 bg-gray-50 min-h-96 flex flex-col">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-gray-900">{t("appTitle")}</h1>
            <div className="flex items-center justify-between pr-2">
              <p className="text-[10px] text-gray-500">PixelOracle</p>
              <span className="text-[10px] text-gray-400 select-none">
                v{extensionVersion}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={openOptionsPage}
          className="ml-2 p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          title={t("openSettings")}
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* 快捷设置区域 */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 space-y-3">
        {/* API Provider 选择 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{t("aiService")}</span>
          <div className="relative">
            <button
              onClick={() => setShowProviderDropdown(!showProviderDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
            >
              {apiProvider === 'gemini' ? 'Gemini' : 'OpenAI'}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showProviderDropdown && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => handleProviderChange('gemini')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                    apiProvider === 'gemini' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                  }`}
                >
                  Gemini
                </button>
                <button
                  onClick={() => handleProviderChange('openai')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                    apiProvider === 'openai' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                  }`}
                >
                  OpenAI
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 启用/禁用开关 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{t("extensionStatus")}</span>
          <button
            onClick={handleToggleEnabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              enabled 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {enabled ? (
              <>
                <Power className="w-4 h-4" />
                {t('statusEnabled')}
              </>
            ) : (
              <>
                <PowerOff className="w-4 h-4" />
                {t('statusDisabled')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 历史记录区域 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 历史记录标题栏 */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t("historyTitle")}</span>
            <span className="text-xs text-gray-400">({history.length})</span>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              {t('clear')}
            </button>
          )}
        </div>

        {/* 历史记录列表 */}
        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <History className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-sm">{t("noHistory")}</p>
              <p className="text-xs mt-1">{t("noHistoryHint")}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map((item) => (
                <div
                  key={item.md5}
                  onClick={() => handleCopyPrompt(item)}
                  className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer transition-colors group"
                >
                  {/* 缩略图 */}
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-200">
                    {(item.thumbnailUrl || item.sourceUrl) ? (
                      <img
                        src={item.thumbnailUrl || item.sourceUrl}
                        alt="thumbnail"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* 内容区域 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {truncateText(item.prompt, 35)}
                    </p>
                    {item.sourceUrl ? (
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="min-w-0 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          title={item.sourceUrl}
                        >
                          <LinkIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{truncateText(getSourceLinkText(item.sourceUrl), 24)}</span>
                        </a>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTime(item.createdAt)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {formatTime(item.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 操作图标 */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteHistoryItem(item.md5)
                      }}
                      className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title={t('clear')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {copiedId === item.md5 ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 底部链接 */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <button
          onClick={openOptionsPage}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          {t('openFullSettings')}
        </button>
      </div>

      {/* Toast提示 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* 点击外部关闭下拉菜单 */}
      {showProviderDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowProviderDropdown(false)}
        />
      )}
    </div>
  )
}

export default App
