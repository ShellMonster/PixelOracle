# PixelOracle

<div align="center">
  <img src="public/icons/icon128.png" alt="PixelOracle Logo" width="128" height="128">
  
  **AI 기반 이미지 프롬프트 역분석 도구**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore/)
  
  **언어 / Language:** [한국어](README.ko.md) | [日本語](README.ja.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [English](README.md)
</div>

---

## 📖 개요

PixelOracle은 AI 비전 기술을 사용하여 이미지를 분석하고 이미지 생성에 사용된 것으로 추정되는 프롬프트를 추출하는 Chrome 확장 프로그램입니다. 프롬프트 엔지니어링 학습, AI 아트 생성 이해, 크리에이티브 워크플로우 역분석에 완벽합니다.

## ✨ 기능

- 🔮 **AI 기반 분석** - Gemini Vision 또는 OpenAI Vision을 사용하여 이미지 분석
- 🌍 **다국어 지원** - 5개 언어 지원 (영어, 중국어 간체, 중국어 번체, 일본어, 한국어)
- 💾 **기록 관리** - 최대 50개의 분석된 프롬프트 저장 및 관리
- ⚡ **빠르고 가벼움** - 브라우징 경험에 미치는 영향 최소화
- 🔒 **개인정보 보호 우선** - API 키는 로컬에 저장, 제3자에게 데이터 전송 없음

## 🚀 설치

### 소스에서 설치

1. 저장소 클론:
   ```bash
   git clone https://github.com/ShellMonster/PixelOracle.git
   cd PixelOracle
   ```

2. 의존성 설치:
   ```bash
   npm install
   ```

3. 확장 프로그램 빌드:
   ```bash
   npm run build
   ```

4. Chrome에 로드:
   - `chrome://extensions/` 열기
   - "개발자 모드" 활성화
   - "압축해제된 확장 프로그램을 로드합니다" 클릭
   - `dist` 폴더 선택

## ⚙️ 설정

### API 키

PixelOracle은 다음 중 하나의 API 키가 필요합니다:

**Google Gemini (권장)**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) 방문
2. API 키 생성
3. 확장 프로그램 설정에 붙여넣기

**OpenAI / 호환 API**
1. OpenAI 또는 호환 제공업체에서 API 키 획득
2. 설정에서 API 키와 베이스 URL 입력
3. OpenAI, Azure OpenAI 및 호환 API 지원

### 설정 옵션

| 설정 | 설명 | 기본값 |
|------|------|--------|
| API 제공업체 | Gemini 또는 OpenAI | Gemini |
| 출력 언어 | 생성된 프롬프트의 언어 | 자동 감지 |
| 요청 타임아웃 | API 응답 최대 대기 시간 | 180초 |

## 📱 사용법

1. 이미지가 있는 웹페이지로 이동
2. 이미지 위의 마법 지팡이 아이콘(✨) 클릭
3. AI가 이미지를 분석할 때까지 대기
4. 팝업에서 추출된 프롬프트 확인
5. 원클릭으로 프롬프트 복사

## 🌍 지원 언어

| 언어 | 코드 |
|------|------|
| English | en |
| 简体中文 | zh-CN |
| 繁體中文 | zh-TW |
| 日本語 | ja |
| 한국어 | ko |

확장 프로그램은 브라우저 언어를 자동으로 감지합니다.

## 🛠 기술 스택

- **프레임워크**: React 18
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **확장 프로그램**: Chrome Extension Manifest V3
- **상태 관리**: Zustand
- **빌드 도구**: Vite
- **AI**: Gemini Vision API, OpenAI Vision API

## 🤝 기여

기여를 환영합니다! 자유롭게 Pull Request를 제출해 주세요.

1. 이 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시 (`git push origin feature/AmazingFeature`)
5. Pull Request 열기

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 라이선스됩니다 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사

- Google Gemini API
- OpenAI API
- 모든 기여자와 사용자

---

<div align="center">
  ShellMonster가 ❤️를 담아 제작
</div>
