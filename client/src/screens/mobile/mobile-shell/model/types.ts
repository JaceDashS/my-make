export type MobileShellPalette = {
  appBg: string;
  border: string;
  card: string;
  menuText: string;
  muted: string;
  primary: string;
  primaryText: string;
  sidebarItem: string;
  sidebarItemText: string;
  soft: string;
  text: string;
  textMuted: string;
  overlay: string;
  menuCard: string;
};

export type MobileMenuSection =
  | import('../../../shared/shell-model').SettingsSection
  | import('../../../shared/shell-model').AccountSection;
