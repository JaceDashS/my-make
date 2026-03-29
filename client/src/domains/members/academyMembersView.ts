import {TABLE_PAGE_SIZE} from './academyMembersModel';
import type {AcademyMemberSlot, AcademyMemberStatusFilter} from './academyMembersTypes';

export function getAcademyMemberSummaryText(
  memberCount: number,
  visibleCount: number,
  language: 'ja' | 'en',
) {
  if (visibleCount === 0) {
    return language === 'ja'
      ? '現在表示できる所属メンバーはありません。'
      : memberCount === 0
      ? 'No academy members are currently loaded.'
      : 'No academy members match the current filter.';
  }

  return language === 'ja'
    ? `確認対象の所属メンバーが ${visibleCount} 件あります。`
    : `${visibleCount} academy member${visibleCount === 1 ? '' : 's'} ready to manage.`;
}

export function paginateAcademyMemberSlots(
  visibleSlots: AcademyMemberSlot[],
  currentPage: number,
) {
  return visibleSlots.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );
}

export function getAcademyMemberTotalPages(visibleSlotCount: number) {
  return Math.max(1, Math.ceil(Math.max(1, visibleSlotCount) / TABLE_PAGE_SIZE));
}
