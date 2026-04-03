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
    approveWithTeacher: '講師を選んで承認',
    approving: '承認中...',
    cancel: 'キャンセル',
    email: 'メール',
    loadingTeachers: '講師一覧を読み込んでいます...',
    member: 'メンバー',
    name: '名前',
    next: '次へ',
    notice: '',
    page: 'ページ',
    pending: '承認待ち',
    phone: '電話番号',
    prev: '前へ',
    profile: 'プロフィール',
    selectTeacher: '講師を選択',
    studentTeacherHelp: '学生を承認するには、この塾に所属する講師を 1 人選んでください。',
    studentTeacherTitle: '学生承認',
    role: '権限',
    search: '検索',
    teacherField: '担当講師',
    teacherRequired: '講師を選択してください。',
    title: '承認待ち',
    waiting: '対象外',
  },
  en: {
    action: 'Action',
    approve: 'Approve',
    approveWithTeacher: 'Approve with teacher',
    approving: 'Approving...',
    cancel: 'Cancel',
    email: 'Email',
    loadingTeachers: 'Loading teacher options...',
    member: 'Member',
    name: 'Name',
    next: 'Next',
    notice: '',
    page: 'Page',
    pending: 'Pending',
    phone: 'Phone',
    prev: 'Prev',
    profile: 'Profile',
    selectTeacher: 'Select teacher',
    studentTeacherHelp:
      'Choose one active teacher in this academy before approving the student.',
    studentTeacherTitle: 'Approve Student',
    role: 'Role',
    search: 'Search',
    teacherField: 'Teacher',
    teacherRequired: 'Please choose a teacher.',
    title: 'Pending Approval',
    waiting: 'Waiting',
  },
} as const satisfies Record<
  LanguageMode,
  {
    action: string;
    approve: string;
    approveWithTeacher: string;
    approving: string;
    cancel: string;
    email: string;
    loadingTeachers: string;
    member: string;
    name: string;
    next: string;
    notice: string;
    page: string;
    pending: string;
    phone: string;
    prev: string;
    profile: string;
    selectTeacher: string;
    role: string;
    search: string;
    studentTeacherHelp: string;
    studentTeacherTitle: string;
    teacherField: string;
    teacherRequired: string;
    title: string;
    waiting: string;
  }
>;

export type PendingApprovalFieldLabels =
  (typeof FIELD_LABELS)[LanguageMode];

export type PendingApprovalUiLabels =
  (typeof MEMBERS_LABELS)[LanguageMode];
