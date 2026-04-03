// Re-export the desktop AccountFeatureSection unchanged.
// webpack.electron.js aliases 'react-native' to rn-compat/index.tsx so all
// RN primitives used inside the shared tree are replaced with DOM shims.
export { AccountFeatureSection as default } from '../../../src/screens/desktop/desktop-shell/pages/account/AccountFeatureSection';
export type { AccountTexts } from '../../../src/screens/desktop/desktop-shell/pages/account/AccountFeatureSection';
