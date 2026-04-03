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

function findByTestID(
  root: ReactTestRenderer.ReactTestInstance,
  testID: string,
) {
  return root.find(node => node.props?.testID === testID);
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
    authPolicy: '',
    canEditAuthPolicy: false,
    canEditStatus: false,
    confirmPassword: '',
    currentSection: 'available-schedule',
    displayName: 'Teacher One',
    email: 'teacher@example.com',
    language: 'en',
    isAuthenticated: true,
    isSubmitting: false,
    licenseCode: '',
    loginId: 'teacher01',
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
      {
        key: 'availableSchedule',
        label: 'Available Schedule',
        value: '{"timezone":"Asia/Seoul","weekly":{"mon":[{"start":"10:00","end":"12:00"}],"tue":[],"wed":[],"thu":[],"fri":[],"sat":[],"sun":[]},"exceptions":[]}',
      },
    ],
    registerError: null,
    registerSuccess: null,
    registerType: 'user',
    requestedRoleCode: 'TEACHER',
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

describe('mobile teacher available schedule section', () => {
  test('renders the teacher schedule editor', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountFeatureSection {...createProps()} />);
    });

    expect(collectText(renderer!.toJSON()).join(' ')).toContain('Weekly Grid');
    expect(findByTestID(renderer!.root, 'teacher-schedule-cell-mon-4')).toBeTruthy();
  });
});
