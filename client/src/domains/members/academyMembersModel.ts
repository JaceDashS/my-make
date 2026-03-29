import type {AcademyMemberRecord} from '../../shared/lib/pendingMembersApi';

import {
  CHART_ROW_SLOTS,
  formatCreatedAt,
  TABLE_PAGE_SIZE,
} from './pendingApprovalModel';
import type {
  AcademyMemberChartViewState,
  AcademyMemberSlot,
  AcademyMemberStatusFilter,
} from './academyMembersTypes';

export {TABLE_PAGE_SIZE};

export function buildEmptyAcademyMemberSlots(): AcademyMemberSlot[] {
  return Array.from({length: CHART_ROW_SLOTS}, () => ({
    academyCode: '',
    academyName: '',
    createdAtLabel: '',
    displayName: '',
    email: '',
    hasMember: false,
    loginId: '',
    mode: 'empty' as const,
    phone: '',
    roleCode: '',
    statusCode: '',
  }));
}

export function buildAcademyMemberSlots(
  members: AcademyMemberRecord[],
): AcademyMemberSlot[] {
  const slots = buildEmptyAcademyMemberSlots();

  members.slice(0, CHART_ROW_SLOTS).forEach((member, index) => {
    slots[index] = {
      academyCode: member.academyCode ?? '',
      academyName: member.academyName ?? '',
      createdAtLabel: formatCreatedAt(member.createdAt),
      displayName: member.displayName ?? '',
      email: member.email ?? '',
      hasMember: true,
      loginId: member.loginId ?? '',
      mode: 'member',
      phone: member.phone ?? '',
      roleCode: member.roleCode ?? '',
      statusCode: member.statusCode,
    };
  });

  return slots;
}

export function buildAcademyMemberChartState(
  members: AcademyMemberRecord[],
): AcademyMemberChartViewState {
  return {
    memberCount: members.length,
    slots: buildAcademyMemberSlots(members),
  };
}

export function filterSlotsByStatus(
  slots: AcademyMemberSlot[],
  statusFilter: AcademyMemberStatusFilter,
) {
  return slots.filter(slot => {
    if (!slot.hasMember) {
      return false;
    }

    if (statusFilter === 'ALL') {
      return true;
    }

    return slot.statusCode === statusFilter;
  });
}
