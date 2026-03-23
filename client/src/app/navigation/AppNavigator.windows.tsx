import React from 'react';

import {WindowsDesktopShell} from '../../screens/desktop/WindowsDesktopShell';

// Windows は固定サイドバー前提のデスクトップシェルを使う。
export function AppNavigator() {
  return <WindowsDesktopShell />;
}
