import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Animated} from 'react-native';

import {AccountSectionV2} from '../src/screens/mobile/mobile-shell/pages/account/AccountSectionV2';

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
  return {
    academyCode: 'Academy Code',
    academyName: 'Academy Name',
    availableSchedulePlaceholderBody: 'Available schedule will appear here.',
    availableSchedulePlaceholderTitle: 'Available Schedule',
    back: 'Back',
    cancel: 'Cancel',
    confirmPassword: 'Confirm Password',
    createAccount: 'Create Account',
    displayName: 'Display Name',
    edit: 'Edit',
    email: 'Email',
    guestHint: 'Please sign in to continue.',
    licenseCode: 'License Code',
    login: 'Login',
    loginId: 'Login ID',
    loginNotice: 'Login Notice',
    memberRegisterBody: 'Create a member account.',
    memberRole: 'Member Role',
    memberRoleAdmin: 'Admin',
    memberRoleStudent: 'Student',
    memberRoleTeacher: 'Teacher',
    note: 'Note',
    password: 'Password',
    passwordMismatch: 'Passwords do not match.',
    phone: 'Phone',
    presetPlaceholderBody: 'Preset content will appear here.',
    presetPlaceholderTitle: 'Preset',
    profile: 'Profile',
    profileBody: 'Manage your account profile.',
    protectedControls: 'Protected Controls',
    protectedUnlocked: 'You are signed in.',
    register: 'Register',
    registerBody: 'Choose how to register.',
    registerCta: 'Need Help?',
    registerHint: 'Contact support for onboarding.',
    registerRoot: 'Root Registration',
    registerRootBody: 'Create the root academy account.',
    registerType: 'Register Type',
    registerTypeRoot: 'Root',
    registerTypeUser: 'User',
    reservation: 'Reservation',
    reservationPlaceholderBody: 'Reservation content will appear here.',
    reservationPlaceholderTitle: 'Reservation',
    reservationView: 'Reservation View',
    reservationViewPlaceholderBody: 'Reservation view will appear here.',
    reservationViewPlaceholderTitle: 'Reservation View',
    rootLoginId: 'Root Login ID',
    save: 'Save',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    status: 'Status',
    statusActive: 'Active',
    statusHold: 'Hold',
    statusInactive: 'Inactive',
    studentOptions: 'Student Options',
    studentOptionsPlaceholderBody: 'Student options will appear here.',
    studentOptionsPlaceholderTitle: 'Student Options',
  };
}

function createProps(
  overrides: Partial<React.ComponentProps<typeof AccountSectionV2>> = {},
): React.ComponentProps<typeof AccountSectionV2> {
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
      renderer = ReactTestRenderer.create(<AccountSectionV2 {...createProps()} />);
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Student Options');
    expect(textContent).toContain('Color Picker');
    expect(textContent).toContain('Preference Points');
    expect(textContent).not.toContain('Student options will appear here.');
  });
});
