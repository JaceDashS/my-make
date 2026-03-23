import React from 'react';

import {MobileAppShell} from '../../screens/mobile/MobileAppShell';

// iOS も同じモバイル向けシェルを共有する。
export function AppNavigator() {
  return <MobileAppShell />;
}
