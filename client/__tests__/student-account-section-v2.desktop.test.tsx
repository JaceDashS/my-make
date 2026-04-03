import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Animated} from 'react-native';

import {AccountFeatureSection} from '../src/screens/desktop/desktop-shell/pages/account/AccountFeatureSection';
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

function findByLabel(
  root: ReactTestRenderer.ReactTestInstance,
  label: string,
) {
  return root.find(node => node.props?.label === label);
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

describe('desktop student account section v2', () => {
  test('renders student skin editor instead of the placeholder', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountFeatureSection {...createProps()} />);
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Skin & Preferences');
    expect(textContent).toContain('My Skin');
    expect(textContent).toContain('Preference Points');
    expect(textContent).not.toContain('Student options will appear here.');
  });

  test('renders the picker board as visual-only draft UI', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountFeatureSection {...createProps()} />);
    });

    const pickerBoard = findByTestID(renderer!.root, 'skin-palette-board');
    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(pickerBoard).toBeTruthy();
    expect(textContent).toContain('My Skin');
    expect(textContent).not.toContain('Apply Picker Color');
  });

  test('shows a static zoom indicator under range tool', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountFeatureSection {...createProps()} />);
    });

    const ctrlIndicatorBefore = findByTestID(renderer!.root, 'preference-picker-ctrl-indicator');

    expect(ctrlIndicatorBefore).toBeTruthy();
    expect(ctrlIndicatorBefore.props.style.backgroundColor).toBe('#222222');
  });

  test('updates picker preview when the lightness slider moves', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountFeatureSection {...createProps()} />);
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
        <AccountFeatureSection {...createProps({onSaveProfile})} />,
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

  test('updates lightness, hue and chroma slider ranges when full plane range is toggled', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountFeatureSection {...createProps()} />);
    });

    const lightnessRangeBefore = findByTestID(renderer!.root, 'skin-slider-l-range');
    const hueRangeBefore = findByTestID(renderer!.root, 'skin-slider-h-range');
    const chromaRangeBefore = findByTestID(renderer!.root, 'skin-slider-c-range');

    expect(collectText(lightnessRangeBefore)).toContain('35-75');
    expect(collectText(hueRangeBefore)).toContain('45-75');
    expect(collectText(chromaRangeBefore)).toContain('10-30');

    const toggle = findByTestID(renderer!.root, 'skin-use-full-range-toggle');

    ReactTestRenderer.act(() => {
      toggle.props.onPress();
    });

    const lightnessRangeAfter = findByTestID(renderer!.root, 'skin-slider-l-range');
    const hueRangeAfter = findByTestID(renderer!.root, 'skin-slider-h-range');
    const chromaRangeAfter = findByTestID(renderer!.root, 'skin-slider-c-range');

    expect(collectText(lightnessRangeAfter)).toContain('0-100');
    expect(collectText(hueRangeAfter)).toContain('0-359');
    expect(collectText(chromaRangeAfter)).toContain('0-100');
  });

  test('clamps initial zero skin values into default range when full range is off', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AccountFeatureSection
          {...createProps({
            profileDetails: [
              {key: 'skinLValue', label: 'Skin L Value', value: '0'},
              {key: 'skinCValue', label: 'Skin C Value', value: '0'},
              {key: 'skinHValue', label: 'Skin H Value', value: '0'},
              {key: 'skinTraits', label: 'Skin Traits', value: 'Warm undertone'},
              {
                key: 'preferenceRanges',
                label: 'Preference Ranges',
                value: '{"version":1,"space":"lch","plane":"h-c","hueMode":"unwrap","regions":[]}',
              },
            ],
          })}
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('H:  45');
    expect(textContent).toContain('C:  10');
    expect(textContent).toContain('L:  35');
  });

  test('shows skin traits as text until edit is toggled', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountFeatureSection {...createProps()} />);
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
