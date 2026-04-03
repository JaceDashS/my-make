import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Animated} from 'react-native';

import {AccountSection} from '../src/screens/mobile/mobile-shell/pages/account/AccountSection';
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

function findPressableByText(
  root: ReactTestRenderer.ReactTestInstance,
  label: string,
) {
  return root.find(
    node =>
      typeof node.props?.onPress === 'function' &&
      collectText(node.children ?? []).includes(label),
  );
}

function findAllPressablesByText(
  root: ReactTestRenderer.ReactTestInstance,
  label: string,
) {
  return root.findAll(
    node =>
      typeof node.props?.onPress === 'function' &&
      collectText(node.children ?? []).includes(label),
  );
}

function createTexts() {
  return SHELL_LABELS.en;
}

function createProps(
  overrides: Partial<React.ComponentProps<typeof AccountSection>> = {},
): React.ComponentProps<typeof AccountSection> {
  return {
    academyCode: 'ACD001',
    academyName: 'My Academy',
    authError: null,
    authNotice: null,
    authPolicy: 'ROOT_ONLY',
    canEditAuthPolicy: false,
    canEditStatus: false,
    confirmPassword: '',
    currentSection: 'login',
    displayName: 'Root Admin',
    email: 'root@example.com',
    isAuthenticated: false,
    isSubmitting: false,
    licenseCode: 'LICENSE001',
    loginId: 'root-admin',
    note: 'Profile note',
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
      {key: 'email', label: 'Email', value: 'root@example.com'},
      {key: 'password', label: 'Password', value: '********'},
      {key: 'preset', label: 'Preset Detail', value: 'Warm Glow'},
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

describe('mobile account section', () => {
  test('renders the login card when the user is not authenticated', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountSection {...createProps()} />);
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Login');
    expect(textContent).toContain('Please sign in to continue.');
    expect(textContent).toContain('Sign In');
  });

  test('requests the root register type when the root option is pressed', () => {
    const onRegisterTypeChange = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AccountSection
          {...createProps({
            currentSection: 'register',
            isAuthenticated: false,
            onRegisterTypeChange,
          })}
        />,
      );
    });

    const rootChip = findPressableByText(renderer!.root, 'Root');

    ReactTestRenderer.act(() => {
      rootChip.props.onPress();
    });

    expect(onRegisterTypeChange).toHaveBeenCalledWith('root');
  });

  test('renders profile controls and edit actions for editable details', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AccountSection
          {...createProps({
            authNotice: 'Profile loaded successfully.',
            isAuthenticated: true,
          })}
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');
    const editButtons = findAllPressablesByText(renderer!.root, '✎');

    expect(textContent).toContain('Profile');
    expect(textContent).toContain('Manage your account profile.');
    expect(textContent).toContain('Protected Controls');
    expect(textContent).toContain('Sign Out');
    expect(textContent).toContain('Profile loaded successfully.');
    expect(textContent).not.toContain('Preset Detail');

    ReactTestRenderer.act(() => {
      editButtons[0].props.onPress();
    });

    const updatedTextContent = collectText(renderer!.toJSON()).join(' ');

    expect(updatedTextContent).toContain('Save');
    expect(updatedTextContent).toContain('Cancel');
  });

  test('renders the preset placeholder when the preset section is active', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AccountSection
          {...createProps({
            currentSection: 'preset',
            isAuthenticated: true,
          })}
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Preset');
    expect(textContent).toContain('Preset content will appear here.');
    expect(textContent).not.toContain('Manage your account profile.');
  });
});
