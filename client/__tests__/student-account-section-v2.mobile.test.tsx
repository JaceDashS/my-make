import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Animated} from 'react-native';

import {AccountFeatureSection} from '../src/screens/mobile/mobile-shell/pages/account/AccountFeatureSection';
import {SHELL_LABELS} from '../src/screens/shared/shell-labels';

function collectText(node: any): string[] {
  if (node == null) {
    return [];
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectText);
  }

  return collectText(node.children ?? []);
}

function createTexts() {
  return SHELL_LABELS.en;
}

function createProps(
  overrides: Partial<React.ComponentProps<typeof AccountFeatureSection>> = {},
): React.ComponentProps<typeof AccountFeatureSection> {
  return {
    academyCode: 'ACD001',
    academyName: 'My Academy',
    authError: null,
    authNotice: null,
    authPolicy: 'ROOT_ONLY',
    canEditAuthPolicy: false,
    canEditStatus: false,
    confirmPassword: '',
    currentSection: 'student-options',
    displayName: 'Student One',
    email: 'student@example.com',
    language: 'en',
    isAuthenticated: true,
    isSubmitting: false,
    licenseCode: '',
    loginId: 'student01',
    note: '',
    onAcademyNameChange: () => undefined,
    onAuthPolicyChange: () => undefined,
    onConfirmPasswordChange: () => undefined,
    onDisplayNameChange: () => undefined,
    onEmailChange: () => undefined,
    onLicenseCodeChange: () => undefined,
    onLogin: () => undefined,
    onLoginIdChange: () => undefined,
    onNoteChange: () => undefined,
    onOpenRegister: () => undefined,
    onLogout: () => undefined,
    onPasswordChange: () => undefined,
    onPhoneChange: () => undefined,
    onProfilePasswordChange: () => undefined,
    onRegister: () => undefined,
    onRegisterTypeChange: () => undefined,
    onRequestedRoleCodeChange: () => undefined,
    onSaveProfile: () => undefined,
    onStatusCodeChange: () => undefined,
    palette: {
      border: '#333333',
      card: '#111111',
      muted: '#222222',
      primary: '#3366ff',
      primaryText: '#ffffff',
      soft: '#dddddd',
      text: '#ffffff',
      textMuted: '#cccccc',
    } as any,
    password: '',
    phone: '010-1234-5678',
    profileDetails: [
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
    registerError: null,
    registerSuccess: null,
    registerType: 'user',
    requestedRoleCode: 'STUDENT',
    statusCode: 'ACTIVE',
    texts: createTexts(),
    ...overrides,
  };
}

beforeAll(() => {
  jest.spyOn(Animated, 'timing').mockReturnValue({
    start: () => undefined,
  } as any);
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('mobile student account section v2', () => {
  test('renders student skin editor instead of the placeholder', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountFeatureSection {...createProps()} />);
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('My Skin');
    expect(textContent).toContain('Preference Points');
    expect(textContent).not.toContain('Student options will appear here.');
  });
});
