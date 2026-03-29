import type { PendingMemberRecord } from '../../shared/lib/pendingMembersApi';
import { buildProfileSlots, buildSlots, TABLE_PAGE_SIZE } from './pendingApprovalModel';
import type { PendingMemberSlot, ProfileSlotSource } from './pendingApprovalTypes';

type PendingApprovalPresentation = {
  memberCount: number;
  slots: PendingMemberSlot[];
  visibleSlots: PendingMemberSlot[];
};

export function buildPendingApprovalPresentation(
  rows: PendingMemberRecord[],
  isProfileApplied: boolean,
  profileSlotSource: ProfileSlotSource,
): PendingApprovalPresentation {
  const slots = isProfileApplied
    ? buildProfileSlots(rows, profileSlotSource)
    : buildSlots(rows);
  const visibleSlots = slots.filter(slot => slot.hasMember);

  return {
    memberCount: visibleSlots.length,
    slots,
    visibleSlots,
  };
}

export function getPendingApprovalSummaryText(
  memberCount: number,
  language: 'ja' | 'en',
) {
  if (memberCount === 0) {
    return language === 'ja'
      ? '現在表示できる承認待ちメンバーはありません。'
      : 'No pending members are currently loaded.';
  }

  return language === 'ja'
    ? `確認対象の承認待ちメンバーが ${memberCount} 件あります。`
    : `${memberCount} pending member${memberCount === 1 ? '' : 's'} ready for review.`;
}

export function paginatePendingApprovalSlots(
  visibleSlots: PendingMemberSlot[],
  currentPage: number,
) {
  return visibleSlots.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );
}

export function getPendingApprovalTotalPages(visibleSlotCount: number) {
  return Math.max(1, Math.ceil(Math.max(1, visibleSlotCount) / TABLE_PAGE_SIZE));
}
