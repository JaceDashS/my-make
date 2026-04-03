import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Animated, Platform} from 'react-native';

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
  return root.find(
    node => node.props?.testID === testID || node.props?.['data-testid'] === testID,
  );
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
      {key: 'preset', label: 'Preset', value: '-'},
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

describe('desktop teacher available schedule section', () => {
  test('renders schedule editor instead of the placeholder', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<AccountFeatureSection {...createProps()} />);
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Available Schedule');
    expect(textContent).toContain('Weekly Grid');
    expect(textContent).toContain('Exceptions');
    expect(textContent).not.toContain('Available schedule will appear here.');
  });

  test('saves updated weekly grid json', async () => {
    const onSaveProfile = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AccountFeatureSection {...createProps({onSaveProfile})} />,
      );
    });

    const mondayNextCell = findByTestID(
      renderer!.root,
      'teacher-schedule-cell-mon-1',
    );

    ReactTestRenderer.act(() => {
      mondayNextCell.props.onPressIn();
      mondayNextCell.props.onPressOut();
    });

    const saveButton = findByLabel(renderer!.root, 'Save Available Schedule');

    await ReactTestRenderer.act(async () => {
      await saveButton.props.onPress();
    });

    expect(onSaveProfile).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(onSaveProfile.mock.calls[0][0].availableSchedule),
    ).toEqual({
      exceptions: [],
      timezone: 'Asia/Seoul',
      weekly: {
        mon: [
          {end: '12:00', start: '09:00'},
        ],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: [],
      },
    });
  });

  test('renders exception date field as a calendar input on desktop web', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    const originalPlatform = Platform.OS;
    const today = new Date();
    const todayDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayDateKey = `${yesterday.getFullYear()}-${String(
      yesterday.getMonth() + 1,
    ).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });

    try {
      ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(<AccountFeatureSection {...createProps()} />);
      });

      const addExceptionButton = findByLabel(renderer!.root, '+ Exception');

      ReactTestRenderer.act(() => {
        addExceptionButton.props.onPress();
      });

      const dateInput = findByTestID(renderer!.root, 'teacher-schedule-exception-date-0');

      expect(dateInput.type).toBe('button');
      expect(dateInput.props.type).toBe('button');
      expect(typeof dateInput.props.onClick).toBe('function');
      expect(dateInput.props.onFocus).toBeUndefined();
      expect(collectText(dateInput.children).join(' ')).toContain(todayDateKey);

      ReactTestRenderer.act(() => {
        dateInput.props.onClick();
      });

      if (today.getDate() > 1) {
        const pastDateCell = findByTestID(
          renderer!.root,
          `teacher-schedule-exception-date-0-calendar-day-${yesterdayDateKey}`,
        );
        expect(pastDateCell.props.disabled).toBe(true);
      }
    } finally {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
    }
  });

  test('saves period and time block exceptions in the new schedule format', async () => {
    const onSaveProfile = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;
    const originalPlatform = Platform.OS;

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });

    try {
      ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <AccountFeatureSection {...createProps({onSaveProfile})} />,
        );
      });

      const addExceptionButton = findByLabel(renderer!.root, '+ Exception');

      ReactTestRenderer.act(() => {
        addExceptionButton.props.onPress();
      });

      const periodChip = findByLabel(renderer!.root, 'Period Block');
      ReactTestRenderer.act(() => {
        periodChip.props.onPress();
      });

      const startDateInput = findByTestID(
        renderer!.root,
        'teacher-schedule-exception-start-date-0',
      );
      expect(() =>
        findByTestID(renderer!.root, 'teacher-schedule-exception-end-date-0'),
      ).toThrow();
      ReactTestRenderer.act(() => {
        startDateInput.props.onClick();
      });

      const startDateCell = findByTestID(
        renderer!.root,
        'teacher-schedule-exception-start-date-0-calendar-day-2026-04-10',
      );
      ReactTestRenderer.act(() => {
        startDateCell.props.onClick();
      });

      expect(() =>
        findByTestID(renderer!.root, 'teacher-schedule-exception-start-date-0'),
      ).toThrow();

      const endDateInput = findByTestID(
        renderer!.root,
        'teacher-schedule-exception-end-date-0',
      );
      expect(endDateInput).toBeTruthy();

      const hasOpenEndCalendar =
        renderer!.root.findAll(
          node =>
            node.props?.['data-testid'] ===
            'teacher-schedule-exception-end-date-0-calendar-day-2026-04-12',
        ).length > 0;

      if (!hasOpenEndCalendar) {
        ReactTestRenderer.act(() => {
          endDateInput.props.onClick();
        });
      }

      const hoverDateCell = findByTestID(
        renderer!.root,
        'teacher-schedule-exception-end-date-0-calendar-day-2026-04-12',
      );
      ReactTestRenderer.act(() => {
        hoverDateCell.props.onMouseEnter();
      });

      const inRangeDateCell = findByTestID(
        renderer!.root,
        'teacher-schedule-exception-end-date-0-calendar-day-2026-04-11',
      );
      expect(inRangeDateCell.props.style.backgroundColor).toBe('#dddddd');

      const endDateCell = findByTestID(
        renderer!.root,
        'teacher-schedule-exception-end-date-0-calendar-day-2026-04-12',
      );
      ReactTestRenderer.act(() => {
        endDateCell.props.onClick();
      });

      ReactTestRenderer.act(() => {
        addExceptionButton.props.onPress();
      });

      const dateInput = findByTestID(renderer!.root, 'teacher-schedule-exception-date-1');
      ReactTestRenderer.act(() => {
        dateInput.props.onClick();
      });

      const dateCell = findByTestID(
        renderer!.root,
        'teacher-schedule-exception-date-1-calendar-day-2026-04-15',
      );
      ReactTestRenderer.act(() => {
        dateCell.props.onClick();
      });

      const startTimeInput = findByTestID(
        renderer!.root,
        'teacher-schedule-exception-start-1-0',
      );
      const endTimeInput = findByTestID(
        renderer!.root,
        'teacher-schedule-exception-end-1-0',
      );
      ReactTestRenderer.act(() => {
        startTimeInput.props.onChangeText('13:00');
        endTimeInput.props.onChangeText('15:00');
      });

      const saveButton = findByLabel(renderer!.root, 'Save Available Schedule');
      await ReactTestRenderer.act(async () => {
        await saveButton.props.onPress();
      });

      expect(JSON.parse(onSaveProfile.mock.calls[0][0].availableSchedule)).toEqual({
        exceptions: [
          {
            endDate: '2026-04-12',
            startDate: '2026-04-10',
            type: 'period-block',
          },
          {
            date: '2026-04-15',
            slots: [{start: '13:00', end: '15:00'}],
            type: 'time-block',
          },
        ],
        timezone: 'Asia/Seoul',
        weekly: {
          mon: [{start: '10:00', end: '12:00'}],
          tue: [],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        },
      });
    } finally {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
    }
  });
});
