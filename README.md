# PixelOracle

<div align="center">
  <img src="public/icons/icon128.png" alt="PixelOracle Logo" width="128" height="128">
  
  **AI-Powered Image Prompt Reverse Engineering**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore/)
  
  **Language / 语言:** [English](README.md) | [简体中文](README.zh-CN.md)
</div>

---

## 📖 Overview

PixelOracle is a Chrome extension that uses AI vision technology to analyze images and extract the prompts that were likely used to generate them. Perfect for learning prompt engineering, understanding AI art generation, and reverse-engineering creative workflows.

## ✨ Features

- 🔮 **AI-Powered Analysis** - Uses Gemini Vision or OpenAI Vision to analyze images
- 🌍 **Multi-Language Support** - Available in 5 languages (English, Simplified Chinese, Traditional Chinese, Japanese, Korean)
- 💾 **History Management** - Save and manage up to 50 analyzed prompts
- ⚡ **Fast & Lightweight** - Minimal impact on browsing experience
- 🔒 **Privacy First** - API keys stored locally, no data sent to third parties

## 🚀 Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/ShellMonster/PixelOracle.git
   cd PixelOracle
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## ⚙️ Configuration

### API Keys

PixelOracle requires an API key from either:

**Google Gemini (Recommended)**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Paste it in the extension settings

**OpenAI / Compatible APIs**
1. Get an API key from OpenAI or a compatible provider
2. Enter the API key and base URL in settings
3. Supports OpenAI, Azure OpenAI, and compatible APIs

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| API Provider | Gemini or OpenAI | Gemini |
| Output Language | Language for generated prompts | Auto-detect |
| Request Timeout | Maximum wait time for API response | 180 seconds |

## 📱 Usage

1. Navigate to any webpage with images
2. Click the magic wand icon (✨) on any image
3. Wait for the AI to analyze the image
4. View the extracted prompt in the popup
5. Copy the prompt with one click

## 🌍 Supported Languages

| Language | Code |
|----------|------|
| English | en |
| 简体中文 | zh-CN |
| 繁體中文 | zh-TW |
| 日本語 | ja |
| 한국어 | ko |

The extension automatically detects your browser language.

## 🛠 Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Extension**: Chrome Extension Manifest V3
- **State**: Zustand
- **Build**: Vite
- **AI**: Gemini Vision API, OpenAI Vision API

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini API
- OpenAI API
- All contributors and users

---

<div align="center">
  Made with ❤️ by ShellMonster
</div>
