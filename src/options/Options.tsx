import { useState, useEffect, useCallback } from 'react'
import { t } from '../utils/i18n'
import { 
  Settings, 
  Save, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Key, 
  Globe, 
  Clock, 
  Languages, 
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { reversePrompt as geminiReverse } from '../services/gemini-api'
import { reversePrompt as openaiReverse } from '../services/openai-api'

// Toast提示组件
function Toast({ 
  message, 
  type, 
  onClose 
}: { 
  message: string; 
  type: 'success' | 'error' | 'info'; 
  onClose: () => void 
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type]

  const Icon = {
    success: CheckCircle,
    error: XCircle,
    info: AlertCircle
  }[type]

  return (
    <div className={`fixed top-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white z-50 animate-in slide-in-from-right ${bgColor}`}>
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

// 输入框组件
function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon: Icon,
  required = false,
  hint
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  icon: React.ElementType
  required?: boolean
  hint?: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-blue-600"
          >
            {showPassword ? t('hide') : t('show')}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

// 选择框组件
function SelectField({
  label,
  value,
  onChange,
  options,
  icon: Icon
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  icon: React.ElementType
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// 滑块组件
function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  icon: Icon
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  unit: string
  icon: React.ElementType
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
        <span className="ml-auto text-sm text-blue-600 font-semibold">
          {value} {unit}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  )
}

// 主组件
function Options() {
  // 从store获取设置和方法
  const {
    apiProvider,
    geminiApiKey,
    openaiApiKey,
    openaiBaseUrl,
    language,
    timeout,
    loadSettings,
    setApiProvider,
    setGeminiApiKey,
    setOpenaiApiKey,
    setOpenaiBaseUrl,
    setLanguage,
    setTimeout: setTimeoutValue
  } = useSettingsStore()

  // 本地状态
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 加载设置
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await loadSettings()
      setIsLoading(false)
    }
    init()
  }, [loadSettings])

  // 显示Toast
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
  }, [])

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // 验证当前Provider的API Key
    if (apiProvider === 'gemini' && !geminiApiKey.trim()) {
      newErrors.geminiApiKey = t('errorGeminiApiKeyRequired')
    }

    if (apiProvider === 'openai') {
      if (!openaiApiKey.trim()) {
        newErrors.openaiApiKey = t('errorOpenaiApiKeyRequired')
      }
      if (!openaiBaseUrl.trim()) {
        newErrors.openaiBaseUrl = t('errorOpenaiBaseUrlRequired')
      } else {
        try {
          const url = new URL(openaiBaseUrl)
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            newErrors.openaiBaseUrl = t('errorInvalidUrlProtocol')
          }
        } catch {
          newErrors.openaiBaseUrl = t('errorInvalidUrl')
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 保存设置
  const handleSave = async () => {
    if (!validateForm()) {
      showToast(t('errorCheckForm'), 'error')
      return
    }

    setIsSaving(true)
    try {
      // 所有更改已经通过store的方法实时保存了
      // 这里只是给用户一个反馈
      await new Promise(resolve => setTimeout(resolve, 500))
      showToast(t('settingsSaved'), 'success')
    } catch (error) {
      showToast(t('errorSaveFailed'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // 测试连接
  const handleTestConnection = async () => {
    if (!validateForm()) {
      showToast(t('errorCheckForm'), 'error')
      return
    }

    setIsTesting(true)
    showToast(t('testingConnection'), 'info')

    try {
      // 使用一张简单的测试图片（1x1像素的透明PNG）
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      
      if (apiProvider === 'gemini') {
        await geminiReverse(
          testImageBase64,
          'image/png',
          'zh',
          geminiApiKey,
          timeout * 1000
        )
      } else {
        await openaiReverse(
          testImageBase64,
          'image/png',
          'zh',
          openaiApiKey,
          openaiBaseUrl,
          'gpt-4o',
          timeout
        )
      }
      
      showToast(t('connectionTestSuccess'), 'success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('connectionTestFailed')
      showToast(errorMessage, 'error')
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Settings className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('settings')}</h1>
            <p className="text-gray-500 text-sm">{t('settingsSubtitle')}</p>
          </div>
        </div>

        {/* API配置卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">{t('apiConfig')}</h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* API Provider 选择 */}
            <SelectField
              label={t('apiProvider')}
              value={apiProvider}
              onChange={(value) => setApiProvider(value as 'gemini' | 'openai')}
              options={[
                { value: 'gemini', label: 'Google Gemini' },
                { value: 'openai', label: t('openaiCompatible') }
              ]}
              icon={Sparkles}
            />

            {/* Gemini API Key */}
            {apiProvider === 'gemini' && (
              <InputField
                label="Gemini API Key"
                value={geminiApiKey}
                onChange={setGeminiApiKey}
                type="password"
                placeholder={t('placeholderGeminiApiKey')}
                icon={Key}
                required
                hint={t('hintGeminiApiKey')}
              />
            )}
            {errors.geminiApiKey && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.geminiApiKey}
              </p>
            )}

            {/* OpenAI 配置 */}
            {apiProvider === 'openai' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <InputField
                  label="OpenAI API Key"
                  value={openaiApiKey}
                  onChange={setOpenaiApiKey}
                  type="password"
                  placeholder="sk-..."
                  icon={Key}
                  required
                />
                {errors.openaiApiKey && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.openaiApiKey}
                  </p>
                )}

                <InputField
                  label="OpenAI Base URL"
                  value={openaiBaseUrl}
                  onChange={setOpenaiBaseUrl}
                  placeholder="https://api.openai.com/v1"
                  icon={Globe}
                  required
                  hint={t('hintOpenaiApi')}
                />
                {errors.openaiBaseUrl && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.openaiBaseUrl}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 高级设置卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">{t('advancedSettings')}</h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 输出语言 */}
            <SelectField
              label={t('outputLanguage')}
              value={language}
              onChange={(value) => setLanguage(value as 'auto' | 'zh' | 'en' | 'ja' | 'ko')}
              options={[
                { value: 'auto', label: t('langAuto') },
                { value: 'zh', label: t('langZh') },
                { value: 'en', label: t('langEn') },
                { value: 'ja', label: t('langJa') },
                { value: 'ko', label: t('langKo') }
              ]}
              icon={Languages}
            />

            {/* 超时时间 */}
            <SliderField
              label={t('requestTimeout')}
              value={timeout}
              onChange={setTimeoutValue}
              min={60}
              max={300}
              step={10}
              unit={t('seconds')}
              icon={Clock}
            />
            <p className="text-xs text-gray-500">
              {t('hintTimeout')}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl font-medium transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {t('saveSettings')}
              </>
            )}
          </button>

          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 rounded-xl font-medium transition-colors"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('testing')}
              </>
            ) : (
              <>
                <TestTube className="w-5 h-5" />
                {t('testConnection')}
              </>
            )}
          </button>
        </div>

        {/* 说明文字 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>{t('usageTips')}</strong></p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>{t('tip1')}</li>
                <li>{t('tip2')}</li>
                <li>{t('tip3')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Toast提示 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default Options
