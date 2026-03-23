import React from 'react';

import {MobileAppShell} from '../../screens/mobile/MobileAppShell';

// Android はモバイル向けシェルを使う。
export function AppNavigator() {
  return <MobileAppShell />;
}
