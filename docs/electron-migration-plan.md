# React Native Windows → React + Electron 마이그레이션 계획

## 배경

현재 Windows 빌드는 `react-native-windows` 0.82.1을 사용한다. 다음 문제들이 있다:

- pointer event (button/buttons) 미전달 버그 (RNW #15827)
- `onPointerDown` 등 DOM prop이 wire-up 안 됨
- `ReactNativeElement` ref에 `addEventListener` 미제공
- C++ Turbo Module 유지보수 부담 (PointerWheelModule.cpp 등)
- Visual Studio + vcxproj 빌드 복잡도

Electron + React (DOM)으로 전환하면 표준 DOM 이벤트, 표준 CSS, 표준 브라우저 API를 그대로 사용할 수 있다.

## 전제 조건

- Android/iOS는 기존 React Native 유지
- Windows만 Electron으로 전환
- 서버(Go)는 변경 없음
- 공유 로직(hooks, 도메인 모델)은 최대한 재사용

## 현재 구조

```
client/
  src/
    app/
      App.windows.tsx          → WindowsDesktopShell 로드
      App.android.tsx          → MobileAppShell 로드
      navigation/
        AppNavigator.windows.tsx
        AppNavigator.android.tsx
    screens/
      desktop/
        WindowsDesktopShell.tsx   ← Windows 전용 shell
        desktop-shell/pages/...
      mobile/
        MobileAppShell.tsx        ← Android/iOS 전용 shell
        mobile-shell/pages/...
      shared/
        useManagedAppShell.ts     ← 공유 상태 관리 hook
        useAccountShellController.ts
        shell-labels.ts
        account-section-model.ts
    domains/
      members/                    ← 비즈니스 로직
      student-options/            ← 비즈니스 로직
    shared/
      lib/accountApi.ts           ← API 호출
      components/ActionButton.tsx
      ui/windowsFocusProps.ts
    config/
      runtime/dev-host.ts
    types/
  windows/                        ← 삭제 대상 (C++ native)
    MyMakeClient/
      MyMakeClient.cpp
      MyMakeClient.vcxproj
      PointerWheelModule.cpp
```

## 목표 구조

```
client/
  src/                            ← 기존 RN 코드 (Android/iOS)
    (기존과 동일)
  electron/                       ← 신규 Electron 앱
    main.ts                       ← Electron main process
    preload.ts                    ← preload script
    index.html                    ← renderer entry HTML
  src-web/                        ← 신규 React DOM 코드 (Windows/Electron용)
    main.tsx                      ← React DOM entry point
    App.tsx                       ← Electron용 App
    screens/
      desktop/
        WindowsDesktopShell.tsx   ← React DOM 버전
    (domains, shared는 src/와 공유)
  webpack.electron.js             ← Electron renderer 번들 설정
  (기존 metro, babel 등은 RN용으로 유지)
```

---

## Phase 1: Electron 기본 셸 구축

### Step 1.1: Electron + React DOM 의존성 추가

`client/package.json`에 Electron, React DOM, webpack 관련 의존성을 추가한다.

추가할 devDependencies:
- `electron`
- `webpack`, `webpack-cli`, `webpack-dev-server`
- `ts-loader`
- `html-webpack-plugin`

추가할 dependencies:
- `react-dom` (현재 `react`만 있음)

**확인 포인트:** `npm install` 후 에러 없이 설치되는지.

### Step 1.2: Electron main process 작성

`client/electron/main.ts` 생성.

- BrowserWindow 생성 (1440x810, 기존 RNW 창 크기와 동일)
- preload.ts 연결
- 개발 모드: `localhost:3001` (webpack-dev-server) 로드
- 프로덕션 모드: 로컬 `index.html` 로드

**확인 포인트:** `npx electron .` 으로 빈 창이 뜨는지.

### Step 1.3: React DOM entry point 작성

`client/src-web/main.tsx` 생성.

- `ReactDOM.createRoot` 로 `<App />` 렌더
- 최소한의 `<div>Hello from Electron</div>`만 표시

`client/electron/index.html` 생성.

- webpack 번들을 로드하는 HTML

**확인 포인트:** Electron 창에 "Hello from Electron"이 보이는지.

### Step 1.4: webpack 설정

`client/webpack.electron.js` 생성.

- entry: `src-web/main.tsx`
- output: `dist-electron/renderer/`
- TypeScript 로더
- HTML 플러그인
- dev-server: port 3001

**확인 포인트:** `npx webpack serve --config webpack.electron.js`로 React 앱이 브라우저에서 뜨는지.

### Step 1.5: 개발 스크립트 추가

`client/package.json`에 추가:
- `"electron:dev"`: webpack-dev-server + electron 동시 실행
- `"electron:build"`: webpack 프로덕션 빌드 + electron-builder 패키징

루트 `package.json`에 추가:
- `"dev:electron"`: client electron:dev + server 동시 실행

**확인 포인트:** `npm run dev:electron`으로 Electron 앱 + 서버가 동시 기동되는지.

---

## Phase 2: 공유 코드 분리

### Step 2.1: 플랫폼 무관 코드 식별

아래 모듈들은 React Native API를 사용하지 않거나 최소한으로 사용한다:

**즉시 공유 가능 (RN 의존 없음):**
- `src/domains/student-options/studentPreferencePointModel.ts` — 순수 타입 + 로직
- `src/domains/student-options/hclColorRaster.ts` — 순수 계산
- `src/screens/shared/shell-labels.ts` — 상수
- `src/screens/shared/account-section-model.ts` — 타입
- `src/shared/lib/accountApi.ts` — fetch 호출 (RN의 fetch와 DOM fetch 호환)
- `src/config/runtime/dev-host.ts` — 순수 문자열
- `src/types/` — 타입 정의

**경량 어댑터 필요:**
- `src/screens/shared/useManagedAppShell.ts` — Alert, NativeModules 사용 부분만 분기
- `src/screens/shared/useAccountShellController.ts` — 위와 유사

**확인 포인트:** 위 파일들의 import를 분석해서 실제 RN 의존성을 확인한다.

### Step 2.2: 공유 디렉토리 구조 설정

`client/src/` 안의 플랫폼 무관 코드를 `client/src-shared/`로 추출한다.

```
client/
  src-shared/                    ← 플랫폼 무관 코드
    domains/
      student-options/
        studentPreferencePointModel.ts
        hclColorRaster.ts
      members/
        (순수 로직만)
    lib/
      accountApi.ts
    config/
      dev-host.ts
    types/
    hooks/
      useManagedAppShell.ts      ← RN 의존 제거 버전
    labels/
      shell-labels.ts
  src/                           ← RN 전용 (Android/iOS)
    (src-shared를 import)
  src-web/                       ← React DOM 전용 (Electron)
    (src-shared를 import)
```

**확인 포인트:** 기존 RN 빌드(Android)가 깨지지 않는지 `npm run android` 또는 `npm test`로 확인.

### Step 2.3: tsconfig 경로 alias 설정

`client/tsconfig.json`에 paths alias 추가:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["./src-shared/*"]
    }
  }
}
```

metro.config.js와 webpack.electron.js 양쪽에서 이 alias를 해석하도록 설정.

**확인 포인트:** `@shared/domains/...` import가 metro와 webpack 양쪽에서 해석되는지.

---

## Phase 3: Desktop Shell을 React DOM으로 포팅

### Step 3.1: UI 기본 컴포넌트 매핑 레이어

React Native 컴포넌트를 React DOM으로 1:1 매핑하는 얇은 래퍼를 작성한다.

`client/src-web/compat/rn-compat.tsx`:

| RN 컴포넌트 | DOM 매핑 |
|---|---|
| `View` | `<div>` |
| `Text` | `<span>` |
| `Pressable` | `<button>` or `<div onClick>` |
| `ScrollView` | `<div style={{overflow: 'auto'}}>` |
| `TextInput` | `<input>` or `<textarea>` |
| `Image` | `<img>` |
| `Alert.alert()` | `window.confirm()` or 커스텀 modal |
| `Animated.Value` | CSS transition 또는 framer-motion |

**확인 포인트:** 각 래퍼 컴포넌트가 기본 렌더링되는지 storybook이나 단순 페이지에서 확인.

### Step 3.2: WindowsDesktopShell 포팅

`client/src-web/screens/desktop/WindowsDesktopShell.tsx` 작성.

기존 `src/screens/desktop/WindowsDesktopShell.tsx`의 구조를 유지하되:
- `View` → `<div>`
- `Text` → `<span>`
- `Pressable` → `<button>`
- `Animated.Value` → CSS transition
- `SafeAreaView` → 제거 (Electron에서 불필요)
- `NativeModules` → 제거

이 단계에서는 사이드바 + 메인 패널 레이아웃만 동작하면 된다.

**확인 포인트:** Electron에서 사이드바가 보이고 페이지 전환이 되는지.

### Step 3.3: Settings 페이지 포팅

`desktop-shell/pages/settings/` 하위 컴포넌트들을 DOM 버전으로 작성.

- `GeneralSection` — 테마/언어 토글
- `DevHealthSection` — 서버 health 표시

**확인 포인트:** Settings 페이지에서 테마 전환, health 상태 표시가 동작하는지.

### Step 3.4: Account 페이지 포팅

`desktop-shell/pages/account/` 하위 컴포넌트들을 DOM 버전으로 작성.

- 로그인 폼
- 프로필 표시/수정
- AccountSectionV2

**확인 포인트:** 로그인 → 프로필 표시 → 수정 흐름이 동작하는지.

### Step 3.5: Members 페이지 포팅

`desktop-shell/pages/members/` 하위 컴포넌트들을 DOM 버전으로 작성.

- 멤버 목록 테이블
- 검색/필터
- 상태 변경

**확인 포인트:** 멤버 목록 표시와 검색이 동작하는지.

---

## Phase 4: Student Options 포팅 (핵심)

### Step 4.1: StudentSkinSection — 기본 UI

기존 `StudentSkinSection.tsx`에서 피부색 L/C/H 슬라이더, 텍스트 입력, 저장 버튼을 DOM으로 재작성.

핵심 변경:
- `PanResponder` → 표준 `onPointerDown/Move/Up` + `setPointerCapture`
- RN `Animated` → CSS 또는 직접 state
- `NativeModules` → 제거 (PointerWheelModule 불필요, `wheel` 이벤트 직접 사용)

**확인 포인트:** L/C/H 슬라이더 드래그, 텍스트 입력, 저장이 동작하는지.

### Step 4.2: StudentSkinSection — Preference Points picker

picker board를 `<canvas>` 또는 DOM `<div>` 기반으로 재작성.

핵심 변경:
- 좌클릭: point 선택/이동 → `e.button === 0`
- 우클릭: range 설정 → `e.button === 2` ← **이 문제가 해결됨**
- 중클릭: 줌 → `e.button === 1`
- 휠: 줌 → `wheel` 이벤트
- context menu 억제 → `onContextMenu={e => e.preventDefault()}`

**확인 포인트:** 좌/중/우 클릭이 정확히 구분되고, 각 tool이 동작하는지.

### Step 4.3: HCL Color Raster 렌더링

`hclColorRaster.ts`의 `buildHclPickerImageDataUri()`는 순수 계산이므로 그대로 사용.

DOM에서는 `<img src={dataUri}>` 대신 `<canvas>`에 직접 그릴 수도 있다 (성능 향상).

**확인 포인트:** picker에 색상 래스터가 정상 렌더되는지.

---

## Phase 5: Native Module 제거 및 Electron IPC

### Step 5.1: PointerWheelModule 제거

`PointerWheelModule.cpp`가 하던 일:
- WM_MOUSEWHEEL/WM_MOUSEHWHEEL 캡처 → JS로 전달

Electron에서는 표준 `wheel` 이벤트로 대체. 네이티브 모듈 불필요.

**확인 포인트:** wheel 줌이 Electron에서 동작하는지.

### Step 5.2: Electron IPC 설정 (필요 시)

현재 앱에서 native 기능이 필요한 부분이 있으면 Electron IPC로 대체:
- 파일 시스템 접근
- 시스템 알림
- 창 제어 (최소화, 최대화, 닫기)

현재 코드 기준 OS-level native 기능 사용이 적으므로, 이 단계는 경량.

**확인 포인트:** 창 제어 버튼이 동작하는지.

---

## Phase 6: 스타일 및 UX 정리

### Step 6.1: 스타일 시스템 결정

현재 RN에서는 `StyleSheet.create()` + inline object를 사용한다. DOM에서의 선택지:

- **옵션 A**: CSS Modules — 파일 분리, 클래스 기반
- **옵션 B**: inline style 유지 — RN과 최대한 비슷한 구조
- **옵션 C**: Tailwind — 유틸리티 기반

초기에는 **옵션 B (inline style)**로 가되, RN의 flexbox 기본값 차이만 보정:
- RN 기본: `flexDirection: 'column'` → DOM 기본: `flexDirection: 'row'`
- `src-web/compat/rn-compat.tsx`에서 기본 `flexDirection: 'column'` 적용

**확인 포인트:** 레이아웃이 기존 RNW 버전과 동일하게 보이는지.

### Step 6.2: 다크/라이트 테마

기존 팔레트 시스템을 CSS custom properties로 변환.

```css
:root[data-theme="dark"] {
  --color-primary: #...;
  --color-text: #...;
}
```

**확인 포인트:** 테마 전환이 동작하는지.

---

## Phase 7: 테스트 및 빌드

### Step 7.1: 기존 테스트 유지 확인

`client/__tests__/` 하위 테스트가 RN 환경에서 계속 통과하는지 확인.

공유 모듈 이동으로 인한 import 경로 변경만 수정.

**확인 포인트:** `npm test` 통과.

### Step 7.2: Electron용 테스트 추가

`src-web/` 코드에 대한 테스트. jest 환경을 `jsdom`으로 설정.

별도 jest config: `jest.config.electron.js`.

**확인 포인트:** Electron용 테스트가 통과.

### Step 7.3: Electron 프로덕션 빌드

`electron-builder` 설정 추가.

- Windows: NSIS installer 또는 portable exe
- 아이콘, 앱 이름 등 메타 설정

**확인 포인트:** 빌드된 exe가 실행되는지.

---

## Phase 8: RNW 코드 정리

### Step 8.1: Windows 전용 코드 제거

삭제 대상:
- `client/windows/` 전체 디렉토리
- `client/src/app/App.windows.tsx`
- `client/src/app/navigation/AppNavigator.windows.tsx`
- `client/src/shared/ui/windowsFocusProps.ts`

**확인 포인트:** Android/iOS 빌드가 여전히 동작하는지.

### Step 8.2: react-native-windows 의존성 제거

`client/package.json`에서 `react-native-windows` 삭제.

metro.config.js에서 Windows 관련 blockList 제거.

**확인 포인트:** `npm install` 클린 설치 후 RN 빌드 동작.

### Step 8.3: 개발 스크립트 정리

`scripts/run-dev.js`에서 `windows` 모드를 `electron`으로 교체.

루트 `package.json`에서 `dev:windows`를 `dev:electron`으로 교체.

**확인 포인트:** `npm run dev:electron`이 정상 기동.

---

## 체크리스트 요약

| Phase | 핵심 산출물 | 검증 |
|-------|-------------|------|
| 1 | Electron 빈 창 + React DOM 렌더 | Hello World 표시 |
| 2 | src-shared 분리, alias 설정 | RN 빌드 + Electron 빌드 양쪽 통과 |
| 3 | Desktop Shell DOM 버전 | 사이드바, 페이지 전환, 로그인 동작 |
| 4 | Student Options DOM 버전 | **우클릭 range 동작 확인** |
| 5 | Native Module 제거 | wheel, 창 제어 동작 |
| 6 | 스타일, 테마 | 기존과 동일한 UI |
| 7 | 테스트, 프로덕션 빌드 | exe 실행 |
| 8 | RNW 코드 삭제 | Android 빌드 정상 |

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| RN 전용 라이브러리 의존 (clipper-lib 등) | 포팅 불가 | clipper-lib, martinez는 순수 JS → 문제 없음 |
| Animated API 깊은 사용 | 포팅 복잡 | 현재는 사이드바 애니메이션 정도 → CSS transition으로 충분 |
| safe-area-context | Electron에서 불필요 | 제거 |
| `react-native` import가 공유 코드에 남아있음 | 빌드 에러 | Step 2.1에서 철저히 분리 |
