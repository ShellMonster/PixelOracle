import { create } from 'zustand'
import { getSettings, setSettings, type Settings, DEFAULT_SETTINGS } from '../services/storage'

interface SettingsState extends Settings {
  isLoading: boolean
  isLoaded: boolean
  
  // Actions
  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<Settings>) => Promise<void>
  resetSettings: () => Promise<void>
  setApiProvider: (provider: 'gemini' | 'openai') => void
  setGeminiApiKey: (key: string) => void
  setOpenaiApiKey: (key: string) => void
  setOpenaiBaseUrl: (url: string) => void
  setLanguage: (language: 'auto' | 'zh' | 'en' | 'ja' | 'ko') => void
  setTimeout: (timeout: number) => void
  setEnabled: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoading: false,
  isLoaded: false,

  loadSettings: async () => {
    if (get().isLoaded) return
    set({ isLoading: true })
    try {
      const settings = await getSettings()
      set({ ...settings, isLoading: false, isLoaded: true })
    } catch (error) {
      console.error('Failed to load settings:', error)
      set({ isLoading: false })
    }
  },

  updateSettings: async (newSettings) => {
    const current = get()
    const updated = { ...current, ...newSettings }
    set(updated)
    try {
      await setSettings(newSettings)
    } catch (error) {
      console.error('Failed to save settings:', error)
      // Revert on error
      set(current)
    }
  },

  resetSettings: async () => {
    try {
      await setSettings(DEFAULT_SETTINGS)
      set({ ...DEFAULT_SETTINGS })
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  },

  setApiProvider: (apiProvider) => get().updateSettings({ apiProvider }),
  setGeminiApiKey: (geminiApiKey) => get().updateSettings({ geminiApiKey }),
  setOpenaiApiKey: (openaiApiKey) => get().updateSettings({ openaiApiKey }),
  setOpenaiBaseUrl: (openaiBaseUrl) => get().updateSettings({ openaiBaseUrl }),
  setLanguage: (language) => get().updateSettings({ language }),
  setTimeout: (timeout) => get().updateSettings({ timeout }),
  setEnabled: (enabled) => get().updateSettings({ enabled }),
}))
