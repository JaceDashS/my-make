import type {HealthCheckResult, HealthCheckTarget} from '../../shared/lib/healthCheck';

export type AppPage = 'settings' | 'account';
export type SettingsSection = 'general' | 'dev-health';
// `profile` はセクションとして作らないこと。
// ログイン後も account > login の中で表示を切り替え、別セクション・別ルートへ分離しない。
export type AccountSection = 'login' | 'register';
export type LanguageMode = 'ja' | 'en';
export type ThemeMode = 'light' | 'dark';

export type TargetState = {
  checkedAt: string | null;
  message: string;
  result: HealthCheckResult | null;
};

export const INITIAL_TARGET_STATE: Record<HealthCheckTarget, TargetState> = {
  local: {checkedAt: null, message: '', result: null},
  docker: {checkedAt: null, message: '', result: null},
  render: {checkedAt: null, message: '', result: null},
};
