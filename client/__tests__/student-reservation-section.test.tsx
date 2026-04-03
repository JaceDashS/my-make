import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {
  cancelStudentReservation,
  createStudentReservation,
  fetchStudentReservationAvailability,
  fetchStudentReservationList,
  searchPresetInventory,
} from '../src/shared/lib/accountApi';
import {StudentReservationSection} from '../src/domains/student-reservation/StudentReservationSection';

jest.mock('../src/shared/lib/accountApi', () => ({
  cancelStudentReservation: jest.fn(),
  createStudentReservation: jest.fn(),
  fetchStudentReservationAvailability: jest.fn(),
  fetchStudentReservationList: jest.fn(),
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
  return root.find(node => node.props?.testID === testID);
}

function createProps() {
  return {
    language: 'en' as const,
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
    styles: {},
    teacherName: 'Teacher Kim',
    texts: {
      cancel: 'Cancel',
      reservationBookLesson: 'Book Lesson',
      reservationBooked: 'Reservation Submitted',
      reservationBookedBody: 'Submitted',
      reservationConfirm: 'Confirm Reservation',
      reservationDate: 'Date',
      reservationMyList: 'My Reservations',
      reservationNone: 'No reservations yet.',
      reservationSelectDate: 'Select Date',
      reservationSlotBooked: 'booked',
      reservationSlotTaken: 'taken',
      reservationStatusConfirmed: 'Confirmed',
      reservationStatusCanceled: 'Canceled',
      reservationStatusPending: 'Pending',
      reservationDetails: 'Details',
      reservationHideDetails: 'Hide Details',
      reservationPreset: 'Preset',
      reservationNote: 'Note',
      reservationCosmetics: 'Cosmetics',
      reservationNoCosmetics: 'No cosmetics',
      reservationTimezone: 'Timezone',
      presetCategoryBaseFoundation: 'Base Foundation',
      presetCategoryBlush: 'Blush',
      presetCategoryLipColor: 'Lip Color',
      presetCategoryEyeshadow: 'Eyeshadow',
      presetCategoryContour: 'Contour',
      presetCategoryHighlighter: 'Highlighter',
      presetCategoryEtc: 'Etc',
      reservationTeacher: 'Your Teacher',
      reservationTime: 'Time',
      reservationTimeSlots: 'Time Slots',
    },
    title: 'Reservation',
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
      OptionChip: ({children}: any) => <>{children}</>,
    },
  };
}

describe('StudentReservationSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-01T09:00:00+09:00'));
    (fetchStudentReservationAvailability as jest.Mock).mockResolvedValue({
      date: '2026-04-01',
      message: 'ok',
      slots: [
        {
          startsAtUtc: '2026-04-01T01:00:00Z',
          status: 'available',
        },
        {
          startsAtUtc: '2026-04-01T02:00:00Z',
          status: 'taken',
        },
      ],
      status: 'ok',
    });
    (fetchStudentReservationList as jest.Mock).mockResolvedValue({
      message: 'ok',
      reservations: [
        {
          date: '2026-04-02',
          id: 'reservation-1',
          startsAtUtc: '2026-04-02T02:00:00Z',
          status: 'pending',
          teacherName: 'Teacher Kim',
          time: '11:00',
        },
      ],
      status: 'ok',
    });
    (searchPresetInventory as jest.Mock).mockResolvedValue({
      items: [
        {
          category: 'blush',
          cost: 0,
          hValue: 0,
          imageUrl: 'https://example.com/blush.png',
          itemName: 'Warm Coral Blush',
          lValue: 0,
          cValue: 0,
          price: 0,
          sku: 'BLS-003',
        },
      ],
      message: 'ok',
      status: 'ok',
    });
    (createStudentReservation as jest.Mock).mockResolvedValue({
      message: 'ok',
      status: 'ok',
    });
    (cancelStudentReservation as jest.Mock).mockResolvedValue({
      message: 'ok',
      status: 'ok',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('loads availability and reservations from the api', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<StudentReservationSection {...createProps()} />);
    });

    expect(fetchStudentReservationAvailability).toHaveBeenCalledWith({
      date: '2026-04-01',
      timezone: 'Asia/Seoul',
    });
    expect(fetchStudentReservationList).toHaveBeenCalled();

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Teacher Kim');
    expect(textContent).toContain('10:00');
    expect(textContent).toContain('taken');
    expect(textContent).toContain('2026-04-02');
    expect(textContent).toContain('11:00');
  });

  test('books the selected slot through the api and refreshes data', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<StudentReservationSection {...createProps()} />);
    });

    const slotButton = findByTestID(renderer!.root, 'student-reservation-slot-10:00');

    ReactTestRenderer.act(() => {
      slotButton.props.onPress();
    });

    const bookButton = renderer!.root.find(node => node.props?.label === 'Book Lesson');

    await ReactTestRenderer.act(async () => {
      await bookButton.props.onPress();
    });

    expect(createStudentReservation).toHaveBeenCalledWith({
      startsAtUtc: '2026-04-01T01:00:00Z',
      timezone: 'Asia/Seoul',
    });
    expect(fetchStudentReservationAvailability).toHaveBeenCalledTimes(2);
    expect(fetchStudentReservationList).toHaveBeenCalledTimes(2);
  });

  test('cancels a pending reservation through the api', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<StudentReservationSection {...createProps()} />);
    });

    const cancelButton = findByTestID(
      renderer!.root,
      'student-reservation-cancel-reservation-1',
    );

    await ReactTestRenderer.act(async () => {
      await cancelButton.props.onPress();
    });

    expect(cancelStudentReservation).toHaveBeenCalledWith({
      reservationId: 'reservation-1',
    });
    expect(fetchStudentReservationList).toHaveBeenCalledTimes(2);
  });

  test('shows cancel for confirmed reservations too', async () => {
    (fetchStudentReservationList as jest.Mock).mockResolvedValue({
      message: 'ok',
      reservations: [
        {
          date: '2026-04-02',
          id: 'reservation-2',
          startsAtUtc: '2026-04-02T02:00:00Z',
          status: 'confirmed',
          teacherName: 'Teacher Kim',
          time: '11:00',
        },
      ],
      status: 'ok',
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<StudentReservationSection {...createProps()} />);
    });

    const cancelButton = findByTestID(
      renderer!.root,
      'student-reservation-cancel-reservation-2',
    );

    await ReactTestRenderer.act(async () => {
      await cancelButton.props.onPress();
    });

    expect(cancelStudentReservation).toHaveBeenCalledWith({
      reservationId: 'reservation-2',
    });
  });

  test('shows image, category, and item name in confirmed reservation details without sku text', async () => {
    (fetchStudentReservationList as jest.Mock).mockResolvedValue({
      message: 'ok',
      reservations: [
        {
          date: '2026-04-02',
          id: 'reservation-2',
          preset: {
            id: 'preset-1',
            items: {
              blush: ['BLS-003'],
            },
            name: 'Coral Set',
            note: 'Soft coral match',
          },
          presetId: 'preset-1',
          startsAtUtc: '2026-04-02T02:00:00Z',
          status: 'confirmed',
          teacherName: 'Teacher Kim',
          time: '11:00',
        },
      ],
      status: 'ok',
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<StudentReservationSection {...createProps()} />);
    });

    const detailButton = findByTestID(
      renderer!.root,
      'student-reservation-detail-reservation-2',
    );

    ReactTestRenderer.act(() => {
      detailButton.props.onPress();
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');
    expect(textContent).toContain('Blush');
    expect(textContent).toContain('Warm Coral Blush');
    expect(textContent).not.toContain('BLS-003');
  });

  test('shows the server error message when booking fails', async () => {
    (createStudentReservation as jest.Mock).mockResolvedValue({
      error: 'That reservation slot is no longer available.',
      message: 'The server rejected the request.',
      status: 'error',
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<StudentReservationSection {...createProps()} />);
    });

    const slotButton = findByTestID(renderer!.root, 'student-reservation-slot-10:00');

    ReactTestRenderer.act(() => {
      slotButton.props.onPress();
    });

    const bookButton = renderer!.root.find(node => node.props?.label === 'Book Lesson');

    await ReactTestRenderer.act(async () => {
      await bookButton.props.onPress();
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');
    expect(textContent).toContain('That reservation slot is no longer available.');
  });

  test('passes student login id through academy member reservation actions', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <StudentReservationSection
          {...createProps()}
          studentLoginId="student-target-01"
        />,
      );
    });

    expect(fetchStudentReservationList).toHaveBeenCalledWith({
      studentLoginId: 'student-target-01',
    });
    expect(fetchStudentReservationAvailability).toHaveBeenCalledWith({
      date: '2026-04-01',
      studentLoginId: 'student-target-01',
      timezone: 'Asia/Seoul',
    });

    const slotButton = findByTestID(renderer!.root, 'student-reservation-slot-10:00');

    ReactTestRenderer.act(() => {
      slotButton.props.onPress();
    });

    const bookButton = renderer!.root.find(node => node.props?.label === 'Book Lesson');

    await ReactTestRenderer.act(async () => {
      await bookButton.props.onPress();
    });

    expect(createStudentReservation).toHaveBeenCalledWith({
      startsAtUtc: '2026-04-01T01:00:00Z',
      studentLoginId: 'student-target-01',
      timezone: 'Asia/Seoul',
    });

    const cancelButton = findByTestID(
      renderer!.root,
      'student-reservation-cancel-reservation-1',
    );

    await ReactTestRenderer.act(async () => {
      await cancelButton.props.onPress();
    });

    expect(cancelStudentReservation).toHaveBeenCalledWith({
      reservationId: 'reservation-1',
      studentLoginId: 'student-target-01',
    });
  });
});
