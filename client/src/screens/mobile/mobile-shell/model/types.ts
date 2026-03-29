import type {ShellPalette} from '../../../shared/shell-model';

export type MobileShellPalette = ShellPalette & {
  menuText: string;
  overlay: string;
  menuCard: string;
};

export type MobileMenuSection =
  | import('../../../shared/shell-model').SettingsSection
  | import('../../../shared/shell-model').AccountSection
  | import('../../../shared/shell-model').MembersSection;
