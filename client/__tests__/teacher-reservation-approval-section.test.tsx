import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {
  approveTeacherReservation,
  cancelTeacherReservation,
  fetchTeacherReservationList,
  searchPresetInventory,
} from '../src/shared/lib/accountApi';
import {TeacherReservationApprovalSection} from '../src/domains/teacher-reservation/TeacherReservationApprovalSection';

jest.mock('../src/shared/lib/accountApi', () => ({
  approveTeacherReservation: jest.fn(),
  cancelTeacherReservation: jest.fn(),
  fetchTeacherReservationList: jest.fn(),
  searchPresetInventory: jest.fn(),
}));

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

function createProps() {
  return {
    palette: {
      border: '#333333',
      card: '#111111',
      muted: '#222222',
      primary: '#3366ff',
      primaryText: '#ffffff',
      soft: '#dddddd',
      text: '#ffffff',
      textMuted: '#cccccc',
    },
    presetValue:
      '{"version":1,"presets":[{"id":"preset-soft","name":"Soft Daily Coral","note":"Mostly aligned preset","items":{"base_foundation":["FND-001"],"blush":["BLS-003"],"lip_color":["LIP-022"],"eyeshadow":["EYE-031"],"contour":["CON-004"],"highlighter":["HIL-003"],"etc":["FIX-002"]}}]}',
    styles: {},
    texts: {
      cancel: 'Cancel',
      reservationNote: 'Note',
      reservationPreset: 'Preset',
      reservationStatusConfirmed: 'Confirmed',
      reservationStatusCanceled: 'Canceled',
      reservationStatusPending: 'Pending',
      reservationTimezone: 'Timezone',
      reservationViewApprove: 'Approve',
      reservationViewCanceled: 'Canceled Reservations',
      reservationViewEmpty: 'No reservation requests yet.',
      reservationViewMismatchGuide: 'Guide',
      reservationViewNoPreference: 'No preference',
      reservationViewPresetItems: 'Preset items',
      reservationViewPending: 'Pending Requests',
      reservationViewReject: 'Reject',
      reservationViewSkin: 'Skin',
      reservationViewStudent: 'Student',
      reservationViewUpcoming: 'Confirmed Reservations',
    },
    title: 'Reservation View',
    ui: {
      BodyStrong: ({children}: any) => <>{children}</>,
      BodyText: ({children}: any) => <>{children}</>,
      Card: ({children, title}: any) => (
        <>
          {title}
          {children}
        </>
      ),
      FieldLabel: ({children}: any) => <>{children}</>,
      OptionChip: ({label, onPress, testID}: any) => (
        <button data-testid={testID} onClick={onPress}>
          {label}
        </button>
      ),
    },
  };
}

describe('TeacherReservationApprovalSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchTeacherReservationList as jest.Mock).mockResolvedValue({
      message: 'ok',
      reservations: [
        {
          date: '2026-04-03',
          id: 'reservation-1',
          passRemainingCount: '10',
          passTotalCount: '20',
          preferenceRanges:
            '{"version":3,"space":"hcl","matchMode":"point-distance","categories":{"base_foundation":{"pointMode":"single","points":[{"l":64.5,"c":13.2,"h":57.0,"radius":6.0}]},"blush":{"pointMode":"single","points":[{"l":66.0,"c":22.0,"h":42.0,"radius":10.0}]},"lip_color":{"pointMode":"single","points":[{"l":58.0,"c":22.0,"h":42.0,"radius":8.0}]}}}',
          startsAtUtc: '2026-04-03T01:00:00Z',
          skinCValue: '14.2',
          skinHValue: '58.1',
          skinLValue: '65.5',
          skinTraits: 'Neutral undertone, soft natural finish preferred.',
          studentLoginId: 'student-1',
          status: 'pending',
          studentName: 'Hana Suzuki',
          time: '10:00',
        },
        {
          date: '2026-04-04',
          id: 'reservation-2',
          startsAtUtc: '2026-04-04T02:00:00Z',
          status: 'confirmed',
          studentName: 'Mei Kato',
          time: '11:00',
        },
      ],
      status: 'ok',
    });
    (searchPresetInventory as jest.Mock).mockResolvedValue({
      items: [
        {
          cValue: 13.2,
          category: 'base_foundation',
          cost: 32000,
          hValue: 57,
          itemName: 'Soft Natural Foundation 01',
          lValue: 64.5,
          price: 48000,
          sku: 'FND-001',
        },
        {
          cValue: 36,
          category: 'blush',
          cost: 18000,
          hValue: 28,
          itemName: 'Warm Coral Blush',
          lValue: 60,
          price: 29000,
          sku: 'BLS-003',
        },
        {
          cValue: 22,
          category: 'lip_color',
          cost: 15000,
          hValue: 42,
          itemName: 'Warm Peach Lip',
          lValue: 58,
          price: 24000,
          sku: 'LIP-022',
        },
        {
          cValue: 26,
          category: 'eyeshadow',
          cost: 21000,
          hValue: 342,
          itemName: 'Rose Plum Eyeshadow',
          lValue: 44,
          price: 34000,
          sku: 'EYE-031',
        },
        {
          cValue: 14,
          category: 'contour',
          cost: 17000,
          hValue: 36,
          itemName: 'Neutral Soft Contour',
          lValue: 40,
          price: 26000,
          sku: 'CON-004',
        },
        {
          cValue: 20,
          category: 'highlighter',
          cost: 17000,
          hValue: 52,
          itemName: 'Soft Gold Highlighter',
          lValue: 84,
          price: 27000,
          sku: 'HIL-003',
        },
        {
          cValue: 6,
          category: 'etc',
          cost: 14000,
          hValue: 52,
          itemName: 'Primer Base',
          lValue: 62,
          price: 22000,
          sku: 'FIX-002',
        },
      ],
      message: 'ok',
      status: 'ok',
    });
    (approveTeacherReservation as jest.Mock).mockResolvedValue({
      message: 'ok',
      status: 'ok',
    });
    (cancelTeacherReservation as jest.Mock).mockResolvedValue({
      message: 'ok',
      status: 'ok',
    });
  });

  test('loads teacher reservations from the api', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <TeacherReservationApprovalSection {...createProps()} />,
      );
    });

    expect(fetchTeacherReservationList).toHaveBeenCalled();
    expect(searchPresetInventory).toHaveBeenCalledWith({});

    const textContent = collectText(renderer!.toJSON()).join(' ');
    expect(textContent).toContain('Hana Suzuki');
    expect(textContent).toContain('Pending Requests');
    expect(textContent).toContain('Confirmed Reservations');
    expect(textContent).toContain('2026.04');
  });

  test('approves a pending reservation through the api', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <TeacherReservationApprovalSection {...createProps()} />,
      );
    });

    const presetChip = findByTestID(
      renderer!.root,
      'teacher-reservation-preset-reservation-1-preset-soft',
    );

    ReactTestRenderer.act(() => {
      presetChip.props.onPress();
    });

    const approveButton = findByTestID(
      renderer!.root,
      'teacher-reservation-approve-reservation-1',
    );

    await ReactTestRenderer.act(async () => {
      await approveButton.props.onPress();
    });

    expect(approveTeacherReservation).toHaveBeenCalledWith({
      presetId: 'preset-soft',
      reservationId: 'reservation-1',
    });
  });

  test('shows preset mismatch items after preset selection', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <TeacherReservationApprovalSection {...createProps()} />,
      );
    });

    const presetChip = findByTestID(
      renderer!.root,
      'teacher-reservation-preset-reservation-1-preset-soft',
    );
    ReactTestRenderer.act(() => {
      presetChip.props.onPress();
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');
    expect(textContent).toContain('Rose Plum Eyeshadow');
    expect(textContent).toContain('Warm Coral Blush');
  });

  test('rejects a pending reservation through the api', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <TeacherReservationApprovalSection {...createProps()} />,
      );
    });

    const cancelButton = findByTestID(
      renderer!.root,
      'teacher-reservation-cancel-reservation-1',
    );

    await ReactTestRenderer.act(async () => {
      await cancelButton.props.onPress();
    });

    expect(cancelTeacherReservation).toHaveBeenCalledWith({
      reservationId: 'reservation-1',
    });
  });

  test('cancels a confirmed reservation through the api', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <TeacherReservationApprovalSection {...createProps()} />,
      );
    });

    const dateButton = findByTestID(
      renderer!.root,
      'teacher-reservation-date-2026-04-04',
    );

    ReactTestRenderer.act(() => {
      dateButton.props.onPress();
    });

    const cancelButton = findByTestID(
      renderer!.root,
      'teacher-reservation-cancel-reservation-2',
    );

    await ReactTestRenderer.act(async () => {
      await cancelButton.props.onPress();
    });

    expect(cancelTeacherReservation).toHaveBeenCalledWith({
      reservationId: 'reservation-2',
    });
  });

  test('shows the server error message when approval fails', async () => {
    (approveTeacherReservation as jest.Mock).mockResolvedValue({
      error: 'Only pending reservations can be updated right now.',
      message: 'The server rejected the request.',
      status: 'error',
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <TeacherReservationApprovalSection {...createProps()} />,
      );
    });

    const approveButton = findByTestID(
      renderer!.root,
      'teacher-reservation-approve-reservation-1',
    );

    await ReactTestRenderer.act(async () => {
      await approveButton.props.onPress();
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');
    expect(textContent).toContain('Only pending reservations can be updated right now.');
  });
});
