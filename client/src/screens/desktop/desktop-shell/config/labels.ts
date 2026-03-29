import type {LanguageMode} from '../../../shared/shell-model';
import {SHELL_LABELS} from '../../../shared/shell-labels';

export const DESKTOP_SHELL_LABELS = {
  ja: {
    ...SHELL_LABELS.ja,
    devHealthBody:
      '現在のデスクトップクライアントから各サーバー接続を確認します。',
    devDisableConditionalVisibility: '条件付き非表示を無効化',
    devDisableConditionalVisibilityHint:
      'チェックするとサインイン後も条件付きで隠れる項目を表示したままにします。',
  },
  en: {
    ...SHELL_LABELS.en,
    devHealthBody: 'Check connectivity to each server from the desktop client.',
    devDisableConditionalVisibility: 'Disable Conditional Hiding',
    devDisableConditionalVisibilityHint:
      'Keep conditionally hidden items visible even after sign-in.',
  },
};

export function getDesktopShellLabels(language: LanguageMode) {
  return DESKTOP_SHELL_LABELS[language];
}
