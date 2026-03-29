import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { useShellNavigation } from '../src/screens/shared/useShellNavigation';

type HarnessSection =
  | 'general'
  | 'dev-health'
  | 'login'
  | 'register'
  | 'pending-approval'
  | 'academy-members'
  | 'preset'
  | 'available-schedule'
  | 'reservation-view'
  | 'student-options'
  | 'reservation';

type NavigationSnapshot = ReturnType<typeof useShellNavigation<HarnessSection>>;
type HookProps = {
  allowMembersOverride?: boolean;
  canAccessMembersPage: boolean;
  closeMenu?: () => void;
  initialPage?: 'settings' | 'account' | 'members';
  initialSection: HarnessSection;
  isAuthenticated: boolean;
  resetAccountUi: () => void;
  showStudentAccountItems: boolean;
  showTeacherAccountItems: boolean;
};

function renderHook(props: HookProps) {
  let snapshot: NavigationSnapshot | null = null;

  function NavigationHarness(innerProps: HookProps) {
    snapshot = useShellNavigation<HarnessSection>(innerProps);
    return null;
  }

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NavigationHarness {...props} />);
  });

  return {
    get snapshot() {
      if (!snapshot) {
        throw new Error('hook snapshot unavailable');
      }

      return snapshot;
    },
    update(nextProps: typeof props) {
      ReactTestRenderer.act(() => {
        renderer!.update(<NavigationHarness {...nextProps} />);
      });
    },
  };
}

describe('useShellNavigation', () => {
  test('falls back to account/login when members page is blocked', () => {
    const closeMenu = jest.fn();
    const hook = renderHook({
      canAccessMembersPage: false,
      closeMenu,
      initialSection: 'general' as HarnessSection,
      isAuthenticated: false,
      resetAccountUi: jest.fn(),
      showStudentAccountItems: false,
      showTeacherAccountItems: false,
    });

    ReactTestRenderer.act(() => {
      hook.snapshot.selectPage('members', { closeMenuOnSelect: true });
    });

    expect(hook.snapshot.page).toBe('account');
    expect(hook.snapshot.section).toBe('login');
    expect(closeMenu).toHaveBeenCalled();
  });

  test('resets account ui when entering account or auth sections', () => {
    const resetAccountUi = jest.fn();
    const hook = renderHook({
      canAccessMembersPage: true,
      initialSection: 'general' as HarnessSection,
      isAuthenticated: false,
      resetAccountUi,
      showStudentAccountItems: false,
      showTeacherAccountItems: false,
    });

    ReactTestRenderer.act(() => {
      hook.snapshot.selectPage('account');
    });

    expect(hook.snapshot.page).toBe('account');
    expect(hook.snapshot.section).toBe('login');
    expect(resetAccountUi).toHaveBeenCalledTimes(1);

    ReactTestRenderer.act(() => {
      hook.snapshot.selectSection('register');
    });

    expect(hook.snapshot.section).toBe('register');
    expect(resetAccountUi).toHaveBeenCalledTimes(2);
  });

  test('keeps members route available when override is enabled', () => {
    const hook = renderHook({
      allowMembersOverride: true,
      canAccessMembersPage: false,
      initialSection: 'general' as HarnessSection,
      isAuthenticated: false,
      resetAccountUi: jest.fn(),
      showStudentAccountItems: false,
      showTeacherAccountItems: false,
    });

    ReactTestRenderer.act(() => {
      hook.snapshot.selectPage('members');
    });

    expect(hook.snapshot.canShowMembersPage).toBe(true);
    expect(hook.snapshot.page).toBe('members');
    expect(hook.snapshot.section).toBe('pending-approval');
  });

  test('recomputes account section from role-specific menu flags', () => {
    const hook = renderHook({
      canAccessMembersPage: true,
      initialPage: 'account',
      initialSection: 'preset' as HarnessSection,
      isAuthenticated: true,
      resetAccountUi: jest.fn(),
      showStudentAccountItems: false,
      showTeacherAccountItems: true,
    });

    expect(hook.snapshot.accountSection).toBe('preset');

    hook.update({
      canAccessMembersPage: true,
      initialPage: 'account',
      initialSection: 'student-options' as HarnessSection,
      isAuthenticated: true,
      resetAccountUi: jest.fn(),
      showStudentAccountItems: true,
      showTeacherAccountItems: false,
    });

    expect(hook.snapshot.accountSection).toBe('student-options');
  });
});
