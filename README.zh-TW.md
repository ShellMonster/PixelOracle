# PixelOracle

<div align="center">
  <img src="public/icons/icon128.png" alt="PixelOracle Logo" width="128" height="128">
  
  **AI 驅動的圖片提示詞逆向分析工具**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore/)
  
  **語言 / Language:** [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [English](README.md) | [日本語](README.ja.md) | [한국어](README.ko.md)
</div>

---

## 📖 簡介

PixelOracle 是一款 Chrome 瀏覽器擴展，使用 AI 視覺技術分析圖片並提取可能用於生成該圖片的提示詞。非常適合學習提示詞工程、理解 AI 藝術生成，以及逆向分析創意工作流程。

## ✨ 功能特性

- 🔮 **AI 驅動分析** - 使用 Gemini Vision 或 OpenAI Vision 分析圖片
- 🌍 **多語言支援** - 支援 5 種語言（英語、簡體中文、繁體中文、日語、韓語）
- 💾 **歷史管理** - 儲存和管理最多 50 條分析記錄
- ⚡ **快速輕量** - 對瀏覽體驗影響極小
- 🔒 **隱私優先** - API 金鑰本地儲存，不向第三方傳送資料

## 🚀 安裝

### 從原始碼安裝

1. 複製儲存庫：
   ```bash
   git clone https://github.com/ShellMonster/PixelOracle.git
   cd PixelOracle
   ```

2. 安裝依賴：
   ```bash
   npm install
   ```

3. 建置擴展：
   ```bash
   npm run build
   ```

4. 在 Chrome 中載入：
   - 開啟 `chrome://extensions/`
   - 啟用「開發人員模式」
   - 點擊「載入未封裝項目」
   - 選擇 `dist` 資料夾

## ⚙️ 設定

### API 金鑰

PixelOracle 需要以下任一 API 金鑰：

**Google Gemini（推薦）**
1. 造訪 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 建立 API 金鑰
3. 在擴展設定中貼上金鑰

**OpenAI / 相容 API**
1. 從 OpenAI 或相容提供商取得 API 金鑰
2. 在設定中輸入 API 金鑰和基礎 URL
3. 支援 OpenAI、Azure OpenAI 和相容 API

### 設定選項

| 設定 | 說明 | 預設值 |
|------|------|--------|
| API 服務商 | Gemini 或 OpenAI | Gemini |
| 輸出語言 | 生成提示詞的語言 | 自動偵測 |
| 請求逾時 | API 回應最大等待時間 | 180 秒 |

## 📱 使用方法

1. 造訪任意包含圖片的網頁
2. 點擊圖片上的魔法棒圖示（✨）
3. 等待 AI 分析圖片
4. 在彈窗中檢視提取的提示詞
5. 一鍵複製提示詞

## 🌍 支援的語言

| 語言 | 代碼 |
|------|------|
| English | en |
| 简体中文 | zh-CN |
| 繁體中文 | zh-TW |
| 日本語 | ja |
| 한국어 | ko |

擴展會自動偵測您的瀏覽器語言。

## 🛠 技術堆疊

- **框架**: React 18
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **擴展**: Chrome Extension Manifest V3
- **狀態管理**: Zustand
- **建置工具**: Vite
- **AI**: Gemini Vision API, OpenAI Vision API

## 🤝 貢獻

歡迎貢獻！請隨時提交 Pull Request。

1. Fork 本儲存庫
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權條款

本專案採用 MIT 授權條款 - 詳情請查看 [LICENSE](LICENSE) 檔案。

## 🙏 致謝

- Google Gemini API
- OpenAI API
- 所有貢獻者和使用者

---

<div align="center">
  由 ShellMonster 用 ❤️ 製作
</div>
