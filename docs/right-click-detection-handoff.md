# Right-Click Detection Handoff (v2)

## 1. 한 줄 요약

`StudentSkinSection.tsx`의 Preference Points picker board에서 **우클릭(button === 2)이 감지되지 않는다.** 좌/중/우 클릭 모두 `button: undefined`, `activeButtonRef: 0`으로 동일하게 찍힌다.

---

## 2. 파일 위치

모든 코드는 아래 한 파일에 있다:

```
client/src/domains/student-options/StudentSkinSection.tsx
```

---

## 3. 기대 동작

1. Board 영역에서 우클릭 → `activeTool`이 `'range'`로 전환
2. 우클릭 드래그 → 선택된 포인트에서 커서까지의 HCL 거리를 range로 설정
3. 우클릭 해제 → `'select'` 모드로 복귀
4. 콘솔에 `[student-skin-focus] picker-right-click` 로그 출력

---

## 4. 현재 증상

**좌/중/우 클릭 모두 아래와 같은 로그만 나온다:**

```
[student-skin-focus] board-interaction {
  phase: 'grant',
  button: undefined,
  buttonLabel: 'unknown',
  buttons: undefined,
  activeButtonRef: 0,
  activeButtonLabel: 'left',
  activeTool: 'select',
  effectiveTool: 'select',
  ...
}
```

**절대 나오지 않는 로그:**
- `board-pointer-down` (직접 DOM addEventListener로 등록 시도 — 실패)
- `board-mouse-down` (RN onPointerDown/onMouseDown prop으로 등록 — 호출 안 됨)
- `board-dom-listeners-attached` (boardDomEl을 못 얻어서 등록 자체 실패)
- `picker-right-click`

---

## 5. Board View 이벤트 아키텍처 (현재)

Board View는 `<View ref={boardRef} ...>` (line ~2047)이고, 3가지 계층의 이벤트 핸들러가 걸려있다:

### 5.1 RN Responder 시스템 (유일하게 호출되는 것)

```tsx
// line ~2067-2077
onResponderGrant={e => handleBoardInteraction(e, 'grant')}
onResponderMove={e => handleBoardInteraction(e, 'move')}
onStartShouldSetResponder={() => {
  if (isRightHeldRef.current) return false;
  if (typeof boardRef.current?.focus === 'function') {
    boardRef.current.focus();
  }
  return safeSelectedIndex !== null;
}}
```

이것만 동작함. 하지만 `event.nativeEvent`에 `button`/`buttons` 필드가 없음.

### 5.2 RN DOM prop 바인딩 (호출 안 됨)

```tsx
// line ~2061-2065
{...({onMouseDown: handleBoardMouseDown, onMouseUp: handleBoardMouseUp} as any)}
{...({onMouseMove: handleBoardMouseMove} as any)}
{...({onPointerDown: handleBoardMouseDown, onPointerUp: handleBoardMouseUp} as any)}
{...({onPointerMove: handleBoardMouseMove} as any)}
```

`handleBoardMouseDown`은 `resolvePointerButton(nativeEvent)`으로 button을 읽고, `logFocusEvent('board-mouse-down', ...)`을 찍도록 되어 있다. **하지만 한 번도 호출된 적이 없다.**

### 5.3 직접 DOM addEventListener (등록 자체 실패)

```tsx
// line ~1489-1520 (useEffect 내부)
const attachBoardListeners = () => {
  const el = getBoardDomEl();         // ← 항상 null 반환
  if (!el?.addEventListener) {
    retryTimer = setTimeout(attachBoardListeners, 100);  // 무한 재시도
    return;
  }
  el.addEventListener('pointerdown', onBoardPointerDown);
  el.addEventListener('contextmenu', onBoardContextMenu);
};
```

`getBoardDomEl()`이 null을 반환하므로 등록 자체가 되지 않는다.

---

## 6. getBoardDomEl() 문제

```tsx
// line ~1307-1313
const getBoardDomEl = () => {
  const rawBoardEl = boardRef.current;
  if (!rawBoardEl) return null;
  return rawBoardEl.getBoundingClientRect
    ? rawBoardEl
    : (rawBoardEl as any)._hostNode ?? null;
};
```

`boardRef`는 `useRef<any>(null)` (line 1236)이고, `<View ref={boardRef}>` (line ~2047)로 연결된다.

**RN-Windows에서 `<View>`의 ref는 RN component instance를 반환하며, DOM element가 아니다.** 따라서:
- `rawBoardEl.getBoundingClientRect` → `undefined` (false)
- `(rawBoardEl as any)._hostNode` → `undefined`
- 결과: `null` 반환

`[board-dom-probe]` 진단 로그를 추가했으나 아직 결과를 확인하지 못했다. 이 로그가 찍히면 `rawExists`, `rawConstructor`, `rawKeys` 등을 보고 DOM element를 꺼내는 방법을 알 수 있다.

---

## 7. 시도한 것과 결과

| 시도 | 결과 |
|------|------|
| `onPointerDown` prop (line 2064) → `handleBoardMouseDown` | 호출 안 됨. `board-mouse-down` 로그 없음 |
| `onMouseDown` prop (line 2061) → `handleBoardMouseDown` | 호출 안 됨 |
| document `addEventListener('pointerdown', ..., {capture:true})` | rect 매칭 실패 또는 미발동 |
| boardDomEl `addEventListener('pointerdown', ...)` | `getBoardDomEl()` null → 등록 실패 |
| `handleBoardInteraction`(responder) 내에서 `resolvePointerButton()` | `event.nativeEvent.button` undefined |
| setTimeout 100ms 재시도 루프로 boardDomEl 대기 | 계속 null, 무한 재시도 |

---

## 8. 근본 원인 분석 (인터넷 조사 결과 포함)

### 8.1 RN Responder는 button 정보를 제공하지 않는다

React Native 공식 문서에서 responder `nativeEvent`의 필드는 `changedTouches`, `identifier`, `locationX`, `locationY`, `pageX`, `pageY`, `target`, `timestamp`, `touches`뿐이다. `button`/`buttons`는 포함되지 않는다.

### 8.2 RNW에 관련 버그가 있다 (microsoft/react-native-windows#15827)

2026-03-23에 보고된 이슈:
- `PointerEvent.button`과 `PointerEvent.buttons`가 JS로 제대로 전달되지 않음
- `onPointerDown`/`onPointerUp`/`onClick` 핸들러가 native event bitset에 등록되지 않아 아예 연결 안 됨
- 수정 포인트: `CompositionEventHandler.cpp`의 button/buttons 매핑, `BaseViewProps.cpp`의 PointerDown/Up 등록

현재 프로젝트 RNW 버전: `^0.82.1` — 이 수정이 포함되지 않았을 가능성이 높다.

### 8.3 boardRef.current에서 DOM element를 꺼낼 수 없다

RN-Windows에서 `<View ref={boardRef}>`의 ref 값이 표준 DOM element가 아니라 RN internal instance이므로 `addEventListener`를 호출할 수 없다. 웹(react-native-web)에서는 ref가 DOM element를 반환하지만, RNW에서는 다른 객체다.

---

## 9. 해결 방향

### 방향 A: RNW 업그레이드/패치 (가장 정석)

`microsoft/react-native-windows#15827` 수정이 포함된 버전으로 업그레이드하면 `onPointerDown` prop이 동작하고 `button`/`buttons`가 채워진다.

**확인할 것:** #15827이 어느 릴리스에 포함됐는지, 또는 직접 `CompositionEventHandler.cpp`/`BaseViewProps.cpp`를 패치할 수 있는지.

### 방향 B: RN-Windows에서 DOM element를 얻는 방법 찾기

`boardRef.current`에서 실제 XAML/DOM element를 꺼내는 API가 있다면 `addEventListener`를 직접 걸 수 있다.

가능한 후보 (미검증):
```tsx
import { findNodeHandle } from 'react-native';
// 또는
import { findDOMNode } from 'react-dom';

const nativeTag = findNodeHandle(boardRef.current);
```

RNW에서 `findNodeHandle`은 숫자(native tag)를 반환하고, 이걸로 실제 DOM element를 얻는 방법이 있는지 조사 필요.

또는 `boardRef.current` 객체의 프로퍼티를 탐색해서 숨겨진 DOM node 접근 경로를 찾아야 한다. 진단 코드가 이미 들어가 있다:

```tsx
// line ~1496-1508
console.log('[board-dom-probe]', {
  rawExists: !!raw,
  rawType: raw ? typeof raw : 'null',
  rawConstructor: raw?.constructor?.name,
  rawKeys: raw ? Object.keys(raw).slice(0, 20) : [],
  hasBCR: !!raw?.getBoundingClientRect,
  hasHostNode: !!(raw as any)?._hostNode,
  hasNativeNode: !!(raw as any)?._nativeNode,
  hasGetNode: typeof (raw as any)?.getNode === 'function',
  hasSetNativeProps: typeof (raw as any)?.setNativeProps === 'function',
  elExists: !!el,
  elHasAddEventListener: !!el?.addEventListener,
});
```

**이 로그의 출력 결과를 확인하는 것이 다음 단계의 핵심이다.**

### 방향 C: Native Module로 우클릭 이벤트 전달

이미 `client/windows/MyMakeClient/PointerWheelModule.cpp`가 존재한다. 이와 유사하게 `PointerButtonModule`을 만들어서, native 쪽에서 pointer button 이벤트를 캡처한 뒤 `DeviceEventEmitter`로 JS에 전달하는 방식.

### 방향 D: Responder 이벤트에서 간접적으로 우클릭 추론

Responder 이벤트 자체에서는 `button`을 알 수 없지만, `onStartShouldSetResponder` 콜백의 이벤트에 다른 필드가 있을 수 있다. 혹은 `timestamp` 기반으로 같은 시점에 발생한 document-level 이벤트와 매칭하는 hack.

---

## 10. 다음 AI에게 물어볼 질문

> **React Native Windows 0.82에서:**
>
> 1. `<View ref={boardRef}>`의 `boardRef.current`는 어떤 타입의 객체인가? DOM element를 얻으려면 어떤 API/프로퍼티를 사용해야 하는가? (`_nativeNode`, `_internalInstanceHandle`, `findDOMNode`, 기타)
>
> 2. `microsoft/react-native-windows#15827`의 수정은 어느 릴리스에 포함되었는가? 0.82.x에 백포트되었는가?
>
> 3. RNW 0.82에서 `<View onPointerDown={handler}>`가 동작하지 않는 것이 확인된 known issue인가? workaround가 있는가?
>
> 4. RNW에서 특정 View의 underlying XAML/Win32 element에 `addEventListener('pointerdown', ...)`를 걸 수 있는 방법이 있는가?
>
> 5. RNW의 Gesture Responder System에서 `onStartShouldSetResponder` 또는 `onResponderGrant` 콜백의 event 객체에 mouse button 정보에 접근할 수 있는 비공식 필드가 있는가?

---

## 11. 주요 코드 위치 정리

| 라인 | 내용 |
|------|------|
| 129-161 | `resolvePointerButton()`, `describePointerButton()` — button 값을 해석하는 유틸 |
| 1173-1178 | `logSliderEvent()`, `logFocusEvent()` — 콘솔 로그 함수 |
| 1236 | `boardRef = useRef<any>(null)` |
| 1300-1545 | **메인 useEffect** — DOM 이벤트 리스너 등록 (wheel, pointer, contextmenu) |
| 1307-1313 | `getBoardDomEl()` — boardRef에서 DOM element 추출 시도 (현재 실패) |
| 1400-1440 | `onBoardPointerDown()` — 직접 DOM addEventListener용 핸들러 (등록 안 됨) |
| 1442-1477 | `onPointerMove()`, `onPointerUp()` — document-level 드래그/해제 |
| 1489-1520 | `attachBoardListeners()` — boardDomEl에 리스너 등록 시도 + 재시도 루프 |
| 1493-1508 | `[board-dom-probe]` 진단 로그 — **이 출력 확인이 다음 핵심 단계** |
| 1602-1651 | `handleBoardInteraction()` — responder grant/move 핸들러 (button 없이 좌표만) |
| 1751-1779 | `handleBoardMouseDown()` — RN prop용 핸들러 (호출 안 됨) |
| 1781-1797 | `handleBoardMouseUp()` — RN prop용 핸들러 (호출 안 됨) |
| 2047 | `<View ref={boardRef}>` — Board View JSX |
| 2061-2065 | `onMouseDown`, `onPointerDown` 등 RN DOM prop 바인딩 (as any 캐스트) |
| 2067-2077 | `onResponderGrant`, `onStartShouldSetResponder` — responder 바인딩 |

---

## 12. 환경

- `react-native-windows`: `^0.82.1`
- Platform: Windows 11 Pro
- 기존 native module: `client/windows/MyMakeClient/PointerWheelModule.cpp` (wheel 이벤트용)
