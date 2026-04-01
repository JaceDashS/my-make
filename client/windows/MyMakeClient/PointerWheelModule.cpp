#include "pch.h"

#include "NativeModules.h"

using namespace winrt::Microsoft::ReactNative;

struct WindowsPointerWheelModule;

namespace {
static WindowsPointerWheelModule *g_pointerWheelModule{nullptr};
static HWND g_pointerWheelHwnd{nullptr};
static WNDPROC g_previousPointerWheelWndProc{nullptr};

LRESULT CALLBACK PointerWheelWndProc(HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam) noexcept;
} // namespace

REACT_MODULE(WindowsPointerWheelModule, L"PointerWheelModule");
struct WindowsPointerWheelModule {
  REACT_INIT(Initialize);
  void Initialize(ReactContext const & /*reactContext*/) noexcept {
    InstallHook();
  }

  REACT_METHOD(installHook);
  void installHook() noexcept {
    InstallHook();
  }

  REACT_EVENT(EmitPointerWheel, L"WindowsPointerWheelChanged");
  std::function<void(JSValueObject const &)> EmitPointerWheel;

  void HandleWheelMessage(UINT message, WPARAM wParam, LPARAM lParam) noexcept {
    if (!EmitPointerWheel) {
      return;
    }

    POINTS point = MAKEPOINTS(lParam);

    JSValueObject payload;
    payload["ctrlKey"] = (GET_KEYSTATE_WPARAM(wParam) & MK_CONTROL) == MK_CONTROL;
    payload["deltaY"] = static_cast<double>(-GET_WHEEL_DELTA_WPARAM(wParam));
    payload["isHorizontal"] = message == WM_MOUSEHWHEEL;
    payload["pageX"] = static_cast<double>(point.x);
    payload["pageY"] = static_cast<double>(point.y);
    payload["shiftKey"] = (GET_KEYSTATE_WPARAM(wParam) & MK_SHIFT) == MK_SHIFT;

    EmitPointerWheel(payload);
  }

  ~WindowsPointerWheelModule() noexcept {
    if (g_pointerWheelModule == this) {
      UninstallHook();
    }
  }

 private:
  void InstallHook() noexcept {
    if (g_pointerWheelHwnd != nullptr) {
      return;
    }

    HWND hwnd = GetActiveWindow();
    if (hwnd == nullptr) {
      hwnd = GetForegroundWindow();
    }
    if (hwnd == nullptr) {
      return;
    }

    g_previousPointerWheelWndProc =
        reinterpret_cast<WNDPROC>(SetWindowLongPtr(hwnd, GWLP_WNDPROC, reinterpret_cast<LONG_PTR>(PointerWheelWndProc)));
    if (g_previousPointerWheelWndProc == nullptr) {
      return;
    }

    g_pointerWheelHwnd = hwnd;
    g_pointerWheelModule = this;
  }

  void UninstallHook() noexcept {
    if (g_pointerWheelHwnd != nullptr && g_previousPointerWheelWndProc != nullptr) {
      SetWindowLongPtr(
          g_pointerWheelHwnd,
          GWLP_WNDPROC,
          reinterpret_cast<LONG_PTR>(g_previousPointerWheelWndProc));
    }

    g_pointerWheelHwnd = nullptr;
    g_previousPointerWheelWndProc = nullptr;
    g_pointerWheelModule = nullptr;
  }
};

namespace {
LRESULT CALLBACK PointerWheelWndProc(HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam) noexcept {
  if ((message == WM_MOUSEWHEEL || message == WM_MOUSEHWHEEL) && g_pointerWheelModule != nullptr) {
    g_pointerWheelModule->HandleWheelMessage(message, wParam, lParam);
  }

  if (g_previousPointerWheelWndProc != nullptr) {
    return CallWindowProc(g_previousPointerWheelWndProc, hwnd, message, wParam, lParam);
  }

  return DefWindowProc(hwnd, message, wParam, lParam);
}
} // namespace
