import {
  createPendingApprovalState,
  pendingApprovalReducer,
} from '../src/domains/members/pendingApprovalReducer';

describe('pending approval reducer', () => {
  test('syncs notice only when there is no error', () => {
    const initial = createPendingApprovalState('Initial');

    expect(
      pendingApprovalReducer(initial, {
        type: 'sync_notice',
        noticeMessage: 'Updated',
      }).noticeMessage,
    ).toBe('Updated');

    expect(
      pendingApprovalReducer(
        {
          ...initial,
          errorMessage: 'Error',
        },
        {
          type: 'sync_notice',
          noticeMessage: 'Ignored',
        },
      ).noticeMessage,
    ).toBe('Initial');
  });

  test('resets rows and feedback on reset_results', () => {
    const initial = {
      ...createPendingApprovalState('Initial'),
      noticeMessage: 'Done',
      rows: [
        {
          createdAt: '2026-01-01T00:00:00Z',
          displayName: 'Member',
          loginId: 'member-1',
          roleCode: 'STUDENT',
        },
      ],
    };

    const next = pendingApprovalReducer(initial, {
      type: 'reset_results',
      errorMessage: 'Blocked',
    });

    expect(next.rows).toEqual([]);
    expect(next.noticeMessage).toBe('');
    expect(next.errorMessage).toBe('Blocked');
  });

  test('removes approved member on approve_succeeded', () => {
    const initial = {
      ...createPendingApprovalState('Initial'),
      rows: [
        {
          createdAt: '2026-01-01T00:00:00Z',
          displayName: 'Member One',
          loginId: 'member-1',
          roleCode: 'STUDENT',
        },
        {
          createdAt: '2026-01-02T00:00:00Z',
          displayName: 'Member Two',
          loginId: 'member-2',
          roleCode: 'STUDENT',
        },
      ],
    };

    const next = pendingApprovalReducer(initial, {
      type: 'approve_succeeded',
      loginId: 'member-1',
      noticeMessage: 'Approved',
    });

    expect(next.rows).toHaveLength(1);
    expect(next.rows[0].loginId).toBe('member-2');
    expect(next.noticeMessage).toBe('Approved');
  });
});
