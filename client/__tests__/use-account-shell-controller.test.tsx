import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {
  loginAccount,
  logoutAccount,
  registerMemberAccount,
  updateAccountProfile,
} from '../src/shared/lib/accountApi';
import { getDesktopShellLabels } from '../src/screens/desktop/desktop-shell/config/labels';
import { useAccountShellController } from '../src/screens/shared/useAccountShellController';

jest.mock('../src/shared/lib/accountApi', () => ({
  fetchAccountProfile: jest.fn(),
  loginAccount: jest.fn(),
  logoutAccount: jest.fn(),
  registerMemberAccount: jest.fn(),
  registerRootAccount: jest.fn(),
  updateAccountProfile: jest.fn(),
}));

type HarnessSection = 'login' | 'register';
type ControllerSnapshot = ReturnType<
  typeof useAccountShellController<HarnessSection>
>;

function createProfile(overrides: Record<string, unknown> = {}) {
  return {
    accountCode: 'AC0001',
    academyCode: 'ACD001',
    academyName: 'My Academy',
    details: [
      { key: 'authPolicy', label: 'Auth Policy', value: 'ROOT_ONLY' },
      { key: 'statusCode', label: 'Status', value: 'ACTIVE' },
    ],
    displayName: 'Root Admin',
    email: 'root@example.com',
    expiresAt: '2027-03-24T00:00:00Z',
    licenseCode: 'LICENSE001',
    loginId: 'root-admin',
    message: 'ok',
    note: 'Profile note',
    phone: '010-1234-5678',
    roleCode: 'ROOT',
    status: 'ok',
    ...overrides,
  };
}

function renderHook() {
  const setPage = jest.fn();
  const setSection = jest.fn();
  let snapshot: ControllerSnapshot | null = null;
  const labels = getDesktopShellLabels('en');

  function Harness() {
    snapshot = useAccountShellController<HarnessSection>({
      labels,
      loginSection: 'login',
      profileLoadLogLabel: 'loaded test profile',
      setPage,
      setSection,
    });
    return null;
  }

  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Harness />);
  });

  return {
    get snapshot() {
      if (!snapshot) {
        throw new Error('controller snapshot unavailable');
      }

      return snapshot;
    },
    setPage,
    setSection,
  };
}

describe('useAccountShellController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (logoutAccount as jest.Mock).mockResolvedValue({
      status: 'ok',
      message: 'Signed out successfully.',
    });
  });

  test('localizes login failure into authError', async () => {
    const hook = renderHook();
    (loginAccount as jest.Mock).mockResolvedValue({
      status: 'error',
      message: 'Request failed.',
      error: 'We could not sign you in right now. Please try again.',
    });

    ReactTestRenderer.act(() => {
      hook.snapshot.setLoginId('root-admin');
      hook.snapshot.setPassword('wrong');
    });

    await ReactTestRenderer.act(async () => {
      await hook.snapshot.handleLogin();
    });

    expect(hook.snapshot.authError).toBe(getDesktopShellLabels('en').signInFailed);
    expect(hook.snapshot.isAuthenticated).toBe(false);
  });

  test('handleRegisterTypeChange clears fields and feedback', async () => {
    const hook = renderHook();

    ReactTestRenderer.act(() => {
      hook.snapshot.setLoginId('member01');
      hook.snapshot.setDisplayName('Member One');
      hook.snapshot.setPhone('010-0000-0000');
      hook.snapshot.setPassword('secret');
      hook.snapshot.setConfirmPassword('mismatch');
    });

    await ReactTestRenderer.act(async () => {
      await hook.snapshot.handleRegister();
    });

    expect(hook.snapshot.registerError).toBe(
      getDesktopShellLabels('en').passwordMismatch,
    );

    ReactTestRenderer.act(() => {
      hook.snapshot.handleRegisterTypeChange('root');
    });

    expect(hook.snapshot.registerType).toBe('root');
    expect(hook.snapshot.loginId).toBe('');
    expect(hook.snapshot.displayName).toBe('');
    expect(hook.snapshot.phone).toBe('');
    expect(hook.snapshot.password).toBe('');
    expect(hook.snapshot.confirmPassword).toBe('');
    expect(hook.snapshot.registerError).toBeNull();
    expect(hook.snapshot.registerSuccess).toBeNull();
    expect(hook.snapshot.authError).toBeNull();
    expect(hook.snapshot.authNotice).toBeNull();
  });

  test('enables members page after successful admin login', async () => {
    const hook = renderHook();
    (loginAccount as jest.Mock).mockResolvedValue(
      createProfile({
        loginId: 'admin01',
        roleCode: 'ADMIN',
      }),
    );

    ReactTestRenderer.act(() => {
      hook.snapshot.setLoginId('admin01');
      hook.snapshot.setPassword('secret');
    });

    await ReactTestRenderer.act(async () => {
      await hook.snapshot.handleLogin();
    });

    expect(hook.snapshot.isAuthenticated).toBe(true);
    expect(hook.snapshot.session?.loginId).toBe('admin01');
    expect(hook.snapshot.canAccessMembersPage).toBe(true);
    expect(hook.snapshot.showTeacherAccountItems).toBe(false);
    expect(hook.snapshot.showStudentAccountItems).toBe(false);
    expect(hook.setPage).toHaveBeenCalledWith('account');
  });

  test('submits member registration and resets form on success', async () => {
    const hook = renderHook();
    (registerMemberAccount as jest.Mock).mockResolvedValue({
      status: 'ok',
      message: 'done',
    });

    ReactTestRenderer.act(() => {
      hook.snapshot.setLoginId('member01');
      hook.snapshot.setDisplayName('Member One');
      hook.snapshot.setEmail('member@example.com');
      hook.snapshot.setPhone('010-0000-0000');
      hook.snapshot.setPassword('secret');
      hook.snapshot.setConfirmPassword('secret');
      hook.snapshot.setRequestedRoleCode('TEACHER');
    });

    await ReactTestRenderer.act(async () => {
      await hook.snapshot.handleRegister();
    });

    expect(registerMemberAccount).toHaveBeenCalledWith({
      displayName: 'Member One',
      email: 'member@example.com',
      loginId: 'member01',
      password: 'secret',
      phone: '010-0000-0000',
      requestedRoleCode: 'TEACHER',
    });
    expect(hook.snapshot.registerSuccess).toBe(
      getDesktopShellLabels('en').memberRegisterSuccess,
    );
    expect(hook.snapshot.authNotice).toBe(
      getDesktopShellLabels('en').memberRegisterSuccess,
    );
    expect(hook.snapshot.loginId).toBe('');
    expect(hook.snapshot.password).toBe('');
    expect(hook.setPage).toHaveBeenCalledWith('account');
    expect(hook.setSection).toHaveBeenCalledWith('login');
  });

  test('sends student skin payloads when saving the profile', async () => {
    const hook = renderHook();
    (loginAccount as jest.Mock).mockResolvedValue(
      createProfile({
        details: [
          {key: 'skinLValue', label: 'Skin L Value', value: '72.2'},
          {key: 'skinCValue', label: 'Skin C Value', value: '18.4'},
          {key: 'skinHValue', label: 'Skin H Value', value: '72.0'},
          {key: 'skinTraits', label: 'Skin Traits', value: 'Warm undertone'},
          {
            key: 'preferenceRanges',
            label: 'Preference Ranges',
            value: '{"version":1,"space":"lch","plane":"h-c","hueMode":"unwrap","regions":[]}',
          },
        ],
        loginId: 'student01',
        roleCode: 'STUDENT',
      }),
    );
    (updateAccountProfile as jest.Mock).mockResolvedValue(
      createProfile({
        details: [
          {key: 'skinLValue', label: 'Skin L Value', value: '65.5'},
          {key: 'skinCValue', label: 'Skin C Value', value: '14.2'},
          {key: 'skinHValue', label: 'Skin H Value', value: '58.1'},
          {key: 'skinTraits', label: 'Skin Traits', value: 'Neutral memo'},
          {
            key: 'preferenceRanges',
            label: 'Preference Ranges',
            value: '{"version":1,"space":"lch","plane":"h-c","hueMode":"unwrap","regions":[]}',
          },
        ],
        loginId: 'student01',
        roleCode: 'STUDENT',
      }),
    );

    ReactTestRenderer.act(() => {
      hook.snapshot.setLoginId('student01');
      hook.snapshot.setPassword('secret');
    });

    await ReactTestRenderer.act(async () => {
      await hook.snapshot.handleLogin();
    });

    await ReactTestRenderer.act(async () => {
      await hook.snapshot.handleSaveProfile({
        preferenceRanges:
          '{"version":1,"space":"lch","plane":"h-c","hueMode":"unwrap","regions":[]}',
        skinCValue: '14.2',
        skinHValue: '58.1',
        skinLValue: '65.5',
        skinTraits: 'Neutral memo',
      } as any);
    });

    expect(updateAccountProfile).toHaveBeenCalledWith({
      preferenceRanges:
        '{"version":1,"space":"lch","plane":"h-c","hueMode":"unwrap","regions":[]}',
      skinCValue: '14.2',
      skinHValue: '58.1',
      skinLValue: '65.5',
      skinTraits: 'Neutral memo',
    });
    expect(hook.snapshot.authNotice).toBe(
      getDesktopShellLabels('en').profileSaveSuccess,
    );
  });
});
