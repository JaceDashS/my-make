import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Animated} from 'react-native';

import {AccountSectionV2} from '../src/screens/desktop/desktop-shell/pages/account/AccountSectionV2';

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

function findByLabel(
  root: ReactTestRenderer.ReactTestInstance,
  label: string,
) {
  return root.find(node => node.props?.label === label);
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

describe('desktop student account section v2', () => {
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

  test('renders the picker board as visual-only draft UI', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountSectionV2 {...createProps()} />);
    });

    const pickerBoard = findByTestID(renderer!.root, 'skin-palette-board');
    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(pickerBoard).toBeTruthy();
    expect(textContent).toContain('HCL Color Picker draft.');
    expect(textContent).not.toContain('Apply Picker Color');
  });

  test('shows ctrl indicator under range tool and activates it while the picker is focused', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountSectionV2 {...createProps()} />);
    });

    const board = findByTestID(renderer!.root, 'preference-picker-board');
    const ctrlIndicatorBefore = findByTestID(renderer!.root, 'preference-picker-ctrl-indicator');

    expect(collectText(ctrlIndicatorBefore.children)).toContain('C');
    expect(ctrlIndicatorBefore.props.style.backgroundColor).toBe('#222222');

    ReactTestRenderer.act(() => {
      board.props.onFocus();
      board.props.onKeyDown({nativeEvent: {key: 'Control'}});
    });

    const ctrlIndicatorActive = findByTestID(renderer!.root, 'preference-picker-ctrl-indicator');
    expect(ctrlIndicatorActive.props.style.backgroundColor).toBe('#3366ff');

    ReactTestRenderer.act(() => {
      board.props.onKeyUp({nativeEvent: {key: 'Control'}});
      board.props.onBlur();
    });

    const ctrlIndicatorAfter = findByTestID(renderer!.root, 'preference-picker-ctrl-indicator');
    expect(ctrlIndicatorAfter.props.style.backgroundColor).toBe('#222222');
  });

  test('updates picker preview when the lightness slider moves', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountSectionV2 {...createProps()} />);
    });

    const slider = findByTestID(renderer!.root, 'skin-slider-l');
    const pickerImageBefore = findByTestID(renderer!.root, 'skin-palette-image');
    const sourceBefore = pickerImageBefore.props.source.uri;

    ReactTestRenderer.act(() => {
      slider.props.onResponderGrant({
        nativeEvent: {
          layout: {width: 100},
          locationX: 100,
        },
      });
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');
    const pickerImageAfter = findByTestID(renderer!.root, 'skin-palette-image');
    const sourceAfter = pickerImageAfter.props.source.uri;

    expect(textContent).toContain('Lightness (L)');
    expect(textContent).toContain('75');
    expect(sourceAfter).not.toBe(sourceBefore);
  });

  test('saves current picker selection when save is pressed', async () => {
    const onSaveProfile = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AccountSectionV2 {...createProps({onSaveProfile})} />,
      );
    });

    const lightnessSlider = findByTestID(renderer!.root, 'skin-slider-l');
    const hueSlider = findByTestID(renderer!.root, 'skin-slider-h');
    const chromaSlider = findByTestID(renderer!.root, 'skin-slider-c');

    ReactTestRenderer.act(() => {
      lightnessSlider.props.onResponderGrant({
        nativeEvent: {
          layout: {width: 100},
          locationX: 25,
        },
      });
      hueSlider.props.onResponderGrant({
        nativeEvent: {
          layout: {width: 100},
          locationX: 40,
        },
      });
      chromaSlider.props.onResponderGrant({
        nativeEvent: {
          layout: {width: 100},
          locationX: 75,
        },
      });
    });

    const saveButton = findByLabel(renderer!.root, 'Save Student Skin');

    await ReactTestRenderer.act(async () => {
      await saveButton.props.onPress();
    });

    expect(onSaveProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        skinLValue: '45.0000',
        skinHValue: '57.0000',
        skinCValue: '25.0000',
      }),
    );
  });

  test('applies typed skin values on blur and clamps out-of-range input', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountSectionV2 {...createProps()} />);
    });

    const lightnessInput = findByTestID(renderer!.root, 'skinLValue');
    const chromaInput = findByTestID(renderer!.root, 'skinCValue');
    const hueInput = findByTestID(renderer!.root, 'skinHValue');

    ReactTestRenderer.act(() => {
      lightnessInput.props.onChangeText('10');
      lightnessInput.props.onBlur();
      chromaInput.props.onChangeText('500');
      chromaInput.props.onBlur();
      hueInput.props.onChangeText('58');
      hueInput.props.onSubmitEditing();
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');
    const lightnessAfter = findByTestID(renderer!.root, 'skinLValue');
    const chromaAfter = findByTestID(renderer!.root, 'skinCValue');
    const hueAfter = findByTestID(renderer!.root, 'skinHValue');

    expect(textContent).toContain('Picker board lightness:  35');
    expect(textContent).toContain('Hue (H) 58');
    expect(textContent).toContain('Chroma (C) 30');
    expect(textContent).toContain('Lightness (L) 35');
    expect(lightnessAfter.props.value).toBe('35.0000');
    expect(chromaAfter.props.value).toBe('30.0000');
    expect(hueAfter.props.value).toBe('58.0000');
  });

  test('shows skin traits as text until edit is toggled', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountSectionV2 {...createProps()} />);
    });

    const displayBefore = findByTestID(renderer!.root, 'skin-traits-display');
    const editButton = findByLabel(renderer!.root, '✎');

    expect(displayBefore.props.children).toBe('Warm undertone');

    ReactTestRenderer.act(() => {
      editButton.props.onPress();
    });

    const inputAfter = findByTestID(renderer!.root, 'skin-traits-input');

    expect(inputAfter.props.value).toBe('Warm undertone');
  });
});
