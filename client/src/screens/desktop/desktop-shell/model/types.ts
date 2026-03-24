export type DesktopShellPalette = {
  appBg: string;
  border: string;
  card: string;
  muted: string;
  primary: string;
  primaryText: string;
  sidebar: string;
  sidebarItem: string;
  sidebarItemText: string;
  sidebarText: string;
  soft: string;
  text: string;
  textMuted: string;
};

export type DesktopMenuSection =
  | import('../../../shared/shell-model').SettingsSection
  | import('../../../shared/shell-model').AccountSection;
