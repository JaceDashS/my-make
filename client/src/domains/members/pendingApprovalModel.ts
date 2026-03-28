import type { PendingMemberRecord } from '../../shared/lib/pendingMembersApi';

import { logPendingApprovalEvent } from './pendingApprovalLogging';
import type {
  PendingMemberSlot,
  ProfileSlotSource,
} from './pendingApprovalTypes';

export const CHART_ROW_SLOTS = 12;
export const TABLE_PAGE_SIZE = 5;

export function formatPhoneQuery(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (!digits) {
    return '';
  }

  if (digits.startsWith('02')) {
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 5) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }
    if (digits.length <= 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function formatCreatedAt(value: string) {
  logPendingApprovalEvent('formatCreatedAt:start', {
    value,
  });
  if (!value) {
    logPendingApprovalEvent('formatCreatedAt:empty', {
      value,
    });
    return '-';
  }

  const date = new Date(value);
  logPendingApprovalEvent('formatCreatedAt:date-created', {
    iso: value,
    time: date.getTime(),
  });
  if (Number.isNaN(date.getTime())) {
    logPendingApprovalEvent('formatCreatedAt:invalid-date', {
      value,
    });
    return value;
  }

  logPendingApprovalEvent('formatCreatedAt:before-manual-format', {
    iso: value,
  });
  const pad2 = (numberValue: number) => String(numberValue).padStart(2, '0');
  const formatted = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate(),
  )} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(
    date.getUTCSeconds(),
  )} UTC`;
  logPendingApprovalEvent('formatCreatedAt:after-manual-format', {
    formatted,
    iso: value,
  });
  return formatted;
}

export function buildEmptySlots(): PendingMemberSlot[] {
  logPendingApprovalEvent('buildEmptySlots:start', {
    slotCount: CHART_ROW_SLOTS,
  });
  return Array.from({ length: CHART_ROW_SLOTS }, () => ({
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
  }));
}

export function buildSlots(members: PendingMemberRecord[]): PendingMemberSlot[] {
  logPendingApprovalEvent('buildSlots:start', {
    memberCount: members.length,
    members,
  });
  const slots = buildEmptySlots();
  members.slice(0, CHART_ROW_SLOTS).forEach((member, index) => {
    logPendingApprovalEvent('buildSlots:item:start', {
      index,
      member,
    });
    const createdAtLabel = formatCreatedAt(member.createdAt);
    logPendingApprovalEvent('buildSlots:item:formatted', {
      createdAtLabel,
      index,
      rawCreatedAt: member.createdAt,
    });
    slots[index] = {
      academyCode: '',
      academyName: '',
      createdAtLabel,
      displayName: member.displayName ?? '',
      email: member.email ?? '',
      hasMember: true,
      loginId: member.loginId ?? '',
      mode: 'pending',
      phone: member.phone ?? '',
      roleCode: member.roleCode ?? '',
    };
    logPendingApprovalEvent('buildSlots:item:done', {
      index,
      slot: slots[index],
    });
  });
  logPendingApprovalEvent('buildSlots:complete', {
    memberCount: members.length,
    modes: slots.map(slot => slot.mode).join(','),
  });
  return slots;
}

export function buildProfileSlots(
  members: PendingMemberRecord[],
  profile: ProfileSlotSource,
): PendingMemberSlot[] {
  logPendingApprovalEvent('buildProfileSlots:start', {
    memberCount: members.length,
    profile,
  });
  logPendingApprovalEvent('buildProfileSlots:before-buildSlots', {
    memberCount: members.length,
  });
  const slots = buildSlots(members);
  logPendingApprovalEvent('buildProfileSlots:after-buildSlots', {
    firstSlot: slots[0],
    modes: slots.map(slot => slot.mode).join(','),
  });
  logPendingApprovalEvent('buildProfileSlots:before-profile-slot-write', {
    profile,
  });
  slots[0] = {
    academyCode: profile.academyCode,
    academyName: profile.academyName,
    createdAtLabel: '',
    displayName: profile.displayName,
    email: '',
    hasMember: true,
    loginId: profile.loginId,
    mode: 'profile',
    phone: profile.phone ?? '',
    roleCode: profile.roleCode,
  };
  logPendingApprovalEvent('buildProfileSlots:after-profile-slot-write', {
    firstSlot: slots[0],
    modes: slots.map(slot => slot.mode).join(','),
  });
  return slots;
}
