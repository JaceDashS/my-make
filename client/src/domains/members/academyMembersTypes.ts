import type {SearchField, ShellPaletteLike} from './pendingApprovalTypes';

export type {SearchField, ShellPaletteLike};

export type AcademyMemberStatus = 'ACTIVE' | 'HOLD' | 'INACTIVE';
export type AcademyMemberStatusFilter = 'ALL' | AcademyMemberStatus;

export type AcademyMemberSlot = {
  academyCode: string;
  academyName: string;
  createdAtLabel: string;
  displayName: string;
  email: string;
  hasMember: boolean;
  loginId: string;
  mode: 'empty' | 'member';
  phone: string;
  roleCode: string;
  statusCode: AcademyMemberStatus | '';
};

export type AcademyMemberSearchViewState = {
  errorMessage: string;
  noticeMessage: string;
};

export type AcademyMemberChartViewState = {
  memberCount: number;
  slots: AcademyMemberSlot[];
};
