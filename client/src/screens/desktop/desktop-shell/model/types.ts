import type {ShellPalette} from '../../../shared/shell-model';

export type DesktopShellPalette = ShellPalette & {
  sidebar: string;
  sidebarText: string;
};

export type DesktopMenuSection =
  | import('../../../shared/shell-model').SettingsSection
  | import('../../../shared/shell-model').AccountSection
  | import('../../../shared/shell-model').MembersSection
  | import('../../../shared/shell-model').InventorySection;
