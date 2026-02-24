# PixelOracle

<div align="center">
  <img src="public/icons/icon128.png" alt="PixelOracle Logo" width="128" height="128">
  
  **AI画像プロンプト逆解析ツール**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore/)
  
  **言語 / Language:** [日本語](README.ja.md) | [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md)
</div>

---

## 📖 概要

PixelOracleは、AIビジョン技術を使用して画像を分析し、その画像の生成に使用された可能性のあるプロンプトを抽出するChrome拡張機能です。プロンプトエンジニアリングの学習、AIアート生成の理解、クリエイティブなワークフローの逆解析に最適です。

## ✨ 機能

- 🔮 **AI駆動分析** - Gemini VisionまたはOpenAI Visionを使用して画像を分析
- 🌍 **多言語対応** - 5つの言語（英語、簡体字中国語、繁体字中国語、日本語、韓国語）に対応
- 💾 **履歴管理** - 最大50件の分析結果を保存・管理
- ⚡ **高速・軽量** - ブラウジング体験への影響を最小限に抑制
- 🔒 **プライバシー重視** - APIキーはローカルに保存、サードパーティにデータを送信しない

## 🚀 インストール

### ソースから

1. リポジトリをクローン：
   ```bash
   git clone https://github.com/ShellMonster/PixelOracle.git
   cd PixelOracle
   ```

2. 依存関係をインストール：
   ```bash
   npm install
   ```

3. 拡張機能をビルド：
   ```bash
   npm run build
   ```

4. Chromeに読み込む：
   - `chrome://extensions/` を開く
   - 「デベロッパーモード」を有効にする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist` フォルダを選択

## ⚙️ 設定

### APIキー

PixelOracleには以下のいずれかのAPIキーが必要です：

**Google Gemini（推奨）**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. APIキーを作成
3. 拡張機能の設定に貼り付け

**OpenAI / 互換API**
1. OpenAIまたは互換プロバイダーからAPIキーを取得
2. 設定でAPIキーとベースURLを入力
3. OpenAI、Azure OpenAI、互換APIに対応

### 設定オプション

| 設定 | 説明 | デフォルト |
|------|------|------------|
| APIプロバイダー | GeminiまたはOpenAI | Gemini |
| 出力言語 | 生成されるプロンプトの言語 | 自動検出 |
| リクエストタイムアウト | API応答の最大待機時間 | 180秒 |

## 📱 使い方

1. 画像を含む任意のWebページに移動
2. 画像上の魔法の杖アイコン（✨）をクリック
3. AIが画像を分析するのを待つ
4. ポップアップで抽出されたプロンプトを表示
5. ワンクリックでプロンプトをコピー

## 🌍 対応言語

| 言語 | コード |
|------|------|
| English | en |
| 简体中文 | zh-CN |
| 繁體中文 | zh-TW |
| 日本語 | ja |
| 한국어 | ko |

拡張機能はブラウザの言語を自動的に検出します。

## 🛠 技術スタック

- **フレームワーク**: React 18
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **拡張機能**: Chrome Extension Manifest V3
- **状態管理**: Zustand
- **ビルドツール**: Vite
- **AI**: Gemini Vision API, OpenAI Vision API

## 🤝 貢献

貢献を歓迎します！お気軽にPull Requestを提出してください。

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. Pull Requestを開く

## 📄 ライセンス

このプロジェクトはMITライセンスの下でライセンスされています - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- Google Gemini API
- OpenAI API
- すべての貢献者とユーザー

---

<div align="center">
  ShellMonster が ❤️ を込めて作成
</div>
