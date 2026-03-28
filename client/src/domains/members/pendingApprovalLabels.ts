import type { LanguageMode } from '../../screens/shared/shell-model';
import type { SearchField } from './pendingApprovalTypes';

export const FIELD_ORDER: SearchField[] = ['phone', 'displayName', 'email'];

export const FIELD_LABELS = {
  ja: {
    displayName: '名前',
    email: 'メール',
    phone: '電話番号',
  },
  en: {
    displayName: 'Name',
    email: 'Email',
    phone: 'Phone',
  },
} as const satisfies Record<LanguageMode, Record<SearchField, string>>;

export const MEMBERS_LABELS = {
  ja: {
    action: '操作',
    approve: '承認',
    approving: '承認中...',
    email: 'メール',
    member: 'メンバー',
    name: '名前',
    next: '次へ',
    notice:
      '電話番号、氏名、メールアドレスで承認待ちメンバーを検索できます。塾に未所属の申請者のみ表示されます。',
    page: 'ページ',
    pending: '承認待ち',
    phone: '電話番号',
    prev: '前へ',
    profile: 'プロフィール',
    role: '権限',
    search: '検索',
    title: '承認待ち',
    waiting: '対象外',
  },
  en: {
    action: 'Action',
    approve: 'Approve',
    approving: 'Approving...',
    email: 'Email',
    member: 'Member',
    name: 'Name',
    next: 'Next',
    notice:
      'Search pending members by phone, name, or email. Only applicants without academy affiliation appear here.',
    page: 'Page',
    pending: 'Pending',
    phone: 'Phone',
    prev: 'Prev',
    profile: 'Profile',
    role: 'Role',
    search: 'Search',
    title: 'Pending Approval',
    waiting: 'Waiting',
  },
} as const satisfies Record<
  LanguageMode,
  {
    action: string;
    approve: string;
    approving: string;
    email: string;
    member: string;
    name: string;
    next: string;
    notice: string;
    page: string;
    pending: string;
    phone: string;
    prev: string;
    profile: string;
    role: string;
    search: string;
    title: string;
    waiting: string;
  }
>;

export type PendingApprovalFieldLabels =
  (typeof FIELD_LABELS)[LanguageMode];

export type PendingApprovalUiLabels =
  (typeof MEMBERS_LABELS)[LanguageMode];
