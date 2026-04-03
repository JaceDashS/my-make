import {
  canAccessMembersShellPage,
  getDefaultSectionForPage,
  resolveAccountSection,
  resolveGuardedMembersRoute,
  resolvePageSelection,
} from '../src/screens/shared/shell-routing';

describe('shell routing', () => {
  test('returns default sections for top-level pages', () => {
    expect(getDefaultSectionForPage('settings')).toBe('general');
    expect(getDefaultSectionForPage('account')).toBe('login');
    expect(getDefaultSectionForPage('members')).toBe('pending-approval');
  });

  test('grants members access only to authenticated root/admin users', () => {
    expect(canAccessMembersShellPage(true, 'ROOT')).toBe(true);
    expect(canAccessMembersShellPage(true, 'ADMIN')).toBe(true);
    expect(canAccessMembersShellPage(true, 'TEACHER')).toBe(false);
    expect(canAccessMembersShellPage(false, 'ROOT')).toBe(false);
  });

  test('falls back to account login when members page is blocked', () => {
    expect(
      resolvePageSelection({
        canAccessMembersPage: false,
        canAccessInventoryPage: false,
        nextPage: 'members',
      }),
    ).toEqual({
      page: 'account',
      section: 'login',
    });
  });

  test('guards current members route when permission is lost', () => {
    expect(
      resolveGuardedMembersRoute({
        canAccessMembersPage: false,
        canAccessInventoryPage: false,
        currentPage: 'members',
        fallbackSection: 'login',
      }),
    ).toEqual({
      page: 'account',
      section: 'login',
    });
  });

  test('keeps register visible only when explicitly allowed for unauthenticated flow', () => {
    expect(
      resolveAccountSection({
        allowRegisterWhenUnauthenticated: true,
        currentSection: 'register',
        isAuthenticated: false,
        showStudentReservationItem: false,
        showStudentAccountItems: false,
        showTeacherReservationItem: false,
        showTeacherAccountItems: false,
      }),
    ).toBe('register');

    expect(
      resolveAccountSection({
        allowRegisterWhenUnauthenticated: false,
        currentSection: 'register',
        isAuthenticated: true,
        showStudentReservationItem: false,
        showStudentAccountItems: false,
        showTeacherReservationItem: false,
        showTeacherAccountItems: false,
      }),
    ).toBe('login');
  });
});
