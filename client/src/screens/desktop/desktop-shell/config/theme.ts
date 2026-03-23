import type {ThemeMode} from '../../../shared/shell-model';

import type {DesktopShellPalette} from '../model/types';

export const LIGHT_PALETTE: DesktopShellPalette = {
  appBg: '#f4fff6',
  border: '#dcefe1',
  card: '#ffffff',
  muted: '#f7fff8',
  primary: '#52b788',
  primaryText: '#ffffff',
  sidebar: '#1b4332',
  sidebarItem: '#b7e4c7',
  sidebarItemText: '#081c15',
  sidebarText: '#d8f3dc',
  soft: '#e9fff0',
  text: '#081c15',
  textMuted: '#355847',
};

export const DARK_PALETTE: DesktopShellPalette = {
  appBg: '#08140d',
  border: '#244130',
  card: '#102017',
  muted: '#15261d',
  primary: '#52b788',
  primaryText: '#08140d',
  sidebar: '#030805',
  sidebarItem: '#52b788',
  sidebarItemText: '#08140d',
  sidebarText: '#b7e4c7',
  soft: '#1b3125',
  text: '#effff4',
  textMuted: '#b7d8c0',
};

export function getDesktopShellPalette(theme: ThemeMode): DesktopShellPalette {
  return theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
}
