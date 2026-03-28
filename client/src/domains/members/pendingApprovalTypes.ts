export type ShellPaletteLike = {
  border: string;
  card: string;
  muted: string;
  primary: string;
  primaryText: string;
  text: string;
  textMuted: string;
};

export type SearchField = 'displayName' | 'email' | 'phone';

export type PendingMemberSlot = {
  academyCode: string;
  academyName: string;
  createdAtLabel: string;
  displayName: string;
  email: string;
  hasMember: boolean;
  loginId: string;
  mode: 'empty' | 'pending' | 'profile';
  phone: string;
  roleCode: string;
};

export type ProfileSlotSource = {
  academyCode: string;
  academyName: string;
  displayName: string;
  loginId: string;
  phone?: string;
  roleCode: string;
};

export type SearchViewState = {
  errorMessage: string;
  noticeMessage: string;
};

export type ChartViewState = {
  memberCount: number;
  slots: PendingMemberSlot[];
};
