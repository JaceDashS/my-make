import type {LanguageMode} from '../../screens/shared/shell-model';
import type {AcademyMemberStatusFilter, SearchField} from './academyMembersTypes';

export const ACADEMY_MEMBER_FIELD_ORDER: SearchField[] = [
  'phone',
  'displayName',
  'email',
];

export const ACADEMY_MEMBER_FIELD_LABELS = {
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

export const ACADEMY_MEMBER_STATUS_FILTER_ORDER: AcademyMemberStatusFilter[] = [
  'ALL',
  'ACTIVE',
  'HOLD',
  'INACTIVE',
];

export const ACADEMY_MEMBER_STATUS_FILTER_LABELS = {
  ja: {
    ALL: '全員',
    ACTIVE: 'active',
    HOLD: 'hold',
    INACTIVE: '無効',
  },
  en: {
    ALL: 'All',
    ACTIVE: 'Active',
    HOLD: 'Hold',
    INACTIVE: 'Inactive',
  },
} as const satisfies Record<
  LanguageMode,
  Record<AcademyMemberStatusFilter, string>
>;

export const ACADEMY_MEMBERS_LABELS = {
  ja: {
    action: '操作',
    activate: 'activate',
    activating: '処理中...',
    active: 'active',
    all: '全員',
    allMembers: '全員',
    closeEditor: '閉じる',
    deactivate: 'deactivate',
    deactivating: '処理中...',
    editProfile: 'Edit',
    editorLoading: '選択したメンバーのプロフィールを読み込み中です...',
    editorSave: '保存',
    editorSaveSuccess: 'メンバープロフィールを更新しました。',
    email: 'メール',
    editorDraftNotice:
      'ここでは選択したメンバーのプロフィール編集内容を下書きできます。保存連携は次の段階で追加します。',
    editorTitle: 'プロフィール修正',
    hold: 'hold',
    holding: '処理中...',
    inactive: 'deactivate',
    loginId: 'ログインID',
    member: 'メンバー',
    name: '名前',
    next: '次へ',
    notice: '',
    page: 'ページ',
    passIncrement: 'Pass 追加',
    passRemaining: 'Pass Remaining',
    passTotal: 'Pass Total',
    phone: '電話番号',
    prev: '前へ',
    role: '権限',
    search: '検索',
    status: '状態',
    title: '所属メンバー',
  },
  en: {
    action: 'Action',
    activate: 'Activate',
    activating: 'Updating...',
    active: 'Active',
    all: 'All',
    allMembers: 'All',
    closeEditor: 'Close',
    deactivate: 'Deactivate',
    deactivating: 'Updating...',
    editProfile: 'Edit',
    editorLoading: 'Loading the selected member profile...',
    editorSave: 'Save',
    editorSaveSuccess: 'Member profile updated successfully.',
    email: 'Email',
    editorDraftNotice:
      'You can prepare a profile edit draft for the selected member here. Save wiring will be added in a later batch.',
    editorTitle: 'Edit Profile',
    hold: 'Hold',
    holding: 'Updating...',
    inactive: 'Inactive',
    loginId: 'Login ID',
    member: 'Member',
    name: 'Name',
    next: 'Next',
    notice: '',
    page: 'Page',
    passIncrement: 'Add Pass',
    passRemaining: 'Pass Remaining',
    passTotal: 'Pass Total',
    phone: 'Phone',
    prev: 'Prev',
    role: 'Role',
    search: 'Search',
    status: 'Status',
    title: 'Member Management',
  },
} as const;

export type AcademyMembersUiLabels =
  (typeof ACADEMY_MEMBERS_LABELS)[LanguageMode];
