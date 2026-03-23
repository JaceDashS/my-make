import type {ThemeMode} from '../../../shared/shell-model';

import type {MobileShellPalette} from '../model/types';

export const LIGHT_PALETTE: MobileShellPalette = {
  appBg: '#f4fff6',
  border: '#dcefe1',
  card: '#ffffff',
  menuText: '#d8f3dc',
  muted: '#f7fff8',
  primary: '#52b788',
  primaryText: '#ffffff',
  sidebarItem: '#b7e4c7',
  sidebarItemText: '#081c15',
  soft: '#e9fff0',
  text: '#081c15',
  textMuted: '#355847',
  overlay: 'rgba(8, 28, 21, 0.42)',
  menuCard: '#1b4332',
};

export const DARK_PALETTE: MobileShellPalette = {
  appBg: '#08140d',
  border: '#244130',
  card: '#102017',
  menuText: '#b7e4c7',
  muted: '#15261d',
  primary: '#52b788',
  primaryText: '#08140d',
  sidebarItem: '#52b788',
  sidebarItemText: '#08140d',
  soft: '#1b3125',
  text: '#effff4',
  textMuted: '#b7d8c0',
  overlay: 'rgba(0, 0, 0, 0.56)',
  menuCard: '#030805',
};

export function getMobileShellPalette(theme: ThemeMode): MobileShellPalette {
  return theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
}
