import type {LanguageMode} from '../../../shared/shell-model';

export const MOBILE_SHELL_LABELS = {
  ja: {
    allChecks: '全ヘルスチェック実行',
    allChecksHint: 'ローカル、Docker、クラウドの順で確認します。',
    cloud: 'クラウドサーバー',
    devHealth: '開発ヘルス',
    devHealthBody:
      '現在のモバイルクライアントから各サーバー接続を確認します。',
    dark: 'ダーク',
    docker: 'Dockerサーバー',
    env: '環境',
    general: '一般設定',
    invalid: 'モック認証情報が正しくありません。admin / 1111 を使ってください。',
    language: '言語',
    lastChecked: '最終確認',
    light: 'ライト',
    local: 'ローカルサーバー',
    locked: '保護設定は現在ロックされています。',
    login: 'ログイン',
    loginId: 'ログインID',
    mockBody:
      'このUI専用アカウントは本番認証フロー実装後に削除する必要があります。',
    mockTitle: '仮モックログイン',
    password: 'パスワード',
    protectedControls: '保護コントロール',
    protectedLocked:
      '一時的なモックアカウントでサインインするまでロックされています。',
    protectedSignin: '保護設定にサインイン',
    protectedUnlocked: '現在のモックセッションで開放されています。',
    result: '結果',
    settings: '設定',
    signIn: 'サインイン',
    signOut: 'サインアウト',
    theme: 'テーマ',
    unlocked: '一時的なモックアカウントで保護設定を開きました。',
  },
  en: {
    allChecks: 'Run All Health Checks',
    allChecksHint: 'Run local, Docker, and cloud checks in sequence.',
    cloud: 'Cloud Server',
    devHealth: 'Dev Health',
    devHealthBody:
      'Check connectivity to each server from the mobile client.',
    dark: 'Dark',
    docker: 'Docker Server',
    env: 'Env',
    general: 'General',
    invalid: 'Invalid mock credentials. Use admin / 1111.',
    language: 'Language',
    lastChecked: 'Last checked',
    light: 'Light',
    local: 'Local Server',
    locked: 'Protected settings are currently locked.',
    login: 'Login',
    loginId: 'Login ID',
    mockBody:
      'This UI-only account must be removed after the real auth flow is implemented.',
    mockTitle: 'Temporary mock login',
    password: 'Password',
    protectedControls: 'Protected controls',
    protectedLocked: 'Locked until you sign in with the temporary mock account.',
    protectedSignin: 'Sign in to protected settings',
    protectedUnlocked: 'Unlocked for the current mock session.',
    result: 'Result',
    settings: 'Settings',
    signIn: 'Sign in',
    signOut: 'Sign out',
    theme: 'Theme',
    unlocked: 'Protected settings unlocked with the temporary mock account.',
  },
} as const;

export function getMobileShellLabels(language: LanguageMode) {
  return MOBILE_SHELL_LABELS[language];
}
