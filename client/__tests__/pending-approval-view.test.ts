import { buildPendingApprovalPresentation, getPendingApprovalSummaryText, getPendingApprovalTotalPages, paginatePendingApprovalSlots } from '../src/domains/members/pendingApprovalView';

describe('pending approval view helpers', () => {
  const rows = [
    {
      createdAt: '2026-01-01T00:00:00Z',
      displayName: 'Member One',
      email: 'one@example.com',
      loginId: 'member-1',
      phone: '010-1111-1111',
      roleCode: 'STUDENT',
    },
    {
      createdAt: '2026-01-02T00:00:00Z',
      displayName: 'Member Two',
      email: 'two@example.com',
      loginId: 'member-2',
      phone: '010-2222-2222',
      roleCode: 'STUDENT',
    },
  ];

  test('derives memberCount from visible slots so overlay cannot drift from rendered rows', () => {
    const result = buildPendingApprovalPresentation(rows, true, {
      academyCode: 'A100',
      academyName: 'Academy',
      displayName: 'Root User',
      loginId: 'root',
      phone: '010-0000-0000',
      roleCode: 'ROOT',
    });

    expect(result.visibleSlots).toHaveLength(2);
    expect(result.memberCount).toBe(2);
    expect(result.visibleSlots[0].mode).toBe('profile');
  });

  test('builds summary text from memberCount', () => {
    expect(getPendingApprovalSummaryText(0, 'en')).toBe(
      'No pending members are currently loaded.',
    );
    expect(getPendingApprovalSummaryText(2, 'en')).toBe(
      '2 pending members ready for review.',
    );
  });

  test('paginates visible slots with shared page size rules', () => {
    const visibleSlots = Array.from({ length: 6 }, (_, index) => ({
      academyCode: '',
      academyName: '',
      createdAtLabel: '',
      displayName: `Member ${index + 1}`,
      email: '',
      hasMember: true,
      loginId: `member-${index + 1}`,
      mode: 'pending' as const,
      phone: '',
      roleCode: 'STUDENT',
    }));

    expect(getPendingApprovalTotalPages(visibleSlots.length)).toBe(2);
    expect(paginatePendingApprovalSlots(visibleSlots, 2)).toHaveLength(1);
  });
});
