# PixelOracle

<div align="center">
  <img src="public/icons/icon128.png" alt="PixelOracle Logo" width="128" height="128">
  
  **AI 驱动的图片提示词逆向分析工具**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore/)
  
  **语言 / Language:** [简体中文](README.zh-CN.md) | [English](README.md)
</div>

---

## 📖 简介

PixelOracle 是一款 Chrome 浏览器扩展，使用 AI 视觉技术分析图片并提取可能用于生成该图片的提示词。非常适合学习提示词工程、理解 AI 艺术生成，以及逆向分析创意工作流程。

## ✨ 功能特性

- 🔮 **AI 驱动分析** - 使用 Gemini Vision 或 OpenAI Vision 分析图片
- 🌍 **多语言支持** - 支持 5 种语言（英语、简体中文、繁体中文、日语、韩语）
- 💾 **历史管理** - 保存和管理最多 50 条分析记录
- ⚡ **快速轻量** - 对浏览体验影响极小
- 🔒 **隐私优先** - API 密钥本地存储，不向第三方发送数据

## 🚀 安装

### 从源码安装

1. 克隆仓库：

1. 克隆仓库：
   ```bash
   git clone https://github.com/ShellMonster/PixelOracle.git
   cd PixelOracle
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 构建扩展：
   ```bash
   npm run build
   ```

4. 在 Chrome 中加载：
   - 打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `dist` 文件夹

## ⚙️ 配置

### API 密钥

PixelOracle 需要以下任一 API 密钥：

**Google Gemini（推荐）**
1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 创建 API 密钥
3. 在扩展设置中粘贴密钥

**OpenAI / 兼容 API**
1. 从 OpenAI 或兼容提供商获取 API 密钥
2. 在设置中输入 API 密钥和基础 URL
3. 支持 OpenAI、Azure OpenAI 和兼容 API

### 设置选项

| 设置 | 说明 | 默认值 |
|------|------|--------|
| API 服务商 | Gemini 或 OpenAI | Gemini |
| 输出语言 | 生成提示词的语言 | 自动检测 |
| 请求超时 | API 响应最大等待时间 | 180 秒 |

## 📱 使用方法

1. 访问任意包含图片的网页
2. 点击图片上的魔法棒图标（✨）
3. 等待 AI 分析图片
4. 在弹窗中查看提取的提示词
5. 一键复制提示词

## 🌍 支持的语言

| 语言 | 代码 |
|------|------|
| English | en |
| 简体中文 | zh-CN |
| 繁體中文 | zh-TW |
| 日本語 | ja |
| 한국어 | ko |

扩展会自动检测您的浏览器语言。

## 🛠 技术栈

- **框架**: React 18
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **扩展**: Chrome Extension Manifest V3
- **状态管理**: Zustand
- **构建工具**: Vite
- **AI**: Gemini Vision API, OpenAI Vision API

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- Google Gemini API
- OpenAI API
- 所有贡献者和用户

---

<div align="center">
  由 ShellMonster 用 ❤️ 制作
</div>
