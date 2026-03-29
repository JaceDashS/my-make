import type {LanguageMode} from '../../../shared/shell-model';
import {SHELL_LABELS} from '../../../shared/shell-labels';

export const MOBILE_SHELL_LABELS = {
  ja: {
    ...SHELL_LABELS.ja,
    devHealthBody:
      '現在のモバイルクライアントから各サーバー接続を確認します。',
  },
  en: {
    ...SHELL_LABELS.en,
    devHealthBody: 'Check connectivity to each server from the mobile client.',
  },
};

export function getMobileShellLabels(language: LanguageMode) {
  return MOBILE_SHELL_LABELS[language];
}
