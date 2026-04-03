jest.mock('react-native', () => ({
  Platform: {OS: 'windows'},
}));

import {
  cancelStudentReservation,
  createStudentReservation,
  fetchAccountProfile,
  fetchStudentReservationAvailability,
  fetchStudentReservationList,
  loginAccount,
  logoutAccount,
  updateAccountProfile,
} from '../src/shared/lib/accountApi';

type XhrInstance = {
  method: string;
  url: string;
  headers: Record<string, string>;
  payload: string | null;
  status: number;
  responseText: string;
  withCredentials: boolean;
  timeout: number;
  onabort: null | (() => void);
  onerror: null | (() => void);
  onload: null | (() => void);
  ontimeout: null | (() => void);
  open: (method: string, url: string) => void;
  send: (payload: string | null) => void;
  setRequestHeader: (name: string, value: string) => void;
};

describe('account api', () => {
  let instances: XhrInstance[] = [];

  beforeEach(() => {
    instances = [];
    (globalThis as any).XMLHttpRequest = class {
      method = '';
      url = '';
      headers: Record<string, string> = {};
      payload: string | null = null;
      status = 200;
      responseText = JSON.stringify({status: 'ok', message: 'done'});
      withCredentials = false;
      timeout = 0;
      onabort = null;
      onerror = null;
      onload = null;
      ontimeout = null;

      constructor() {
        instances.push(this as unknown as XhrInstance);
      }

      open(method: string, url: string) {
        this.method = method;
        this.url = url;
      }

      setRequestHeader(name: string, value: string) {
        this.headers[name] = value;
      }

      send(payload: string | null) {
        this.payload = payload;
        const onLoad = this.onload as (() => void) | null;
        if (onLoad) {
          onLoad();
        }
      }
    };
  });

  test('loginAccount posts to the login route with credentials payload', async () => {
    await loginAccount({loginId: 'root-admin', password: 'secret'});

    expect(instances).toHaveLength(1);
    expect(instances[0].method).toBe('POST');
    expect(instances[0].url).toContain('/api/accounts/login');
    expect(instances[0].headers['Content-Type']).toBe('application/json');
    expect(instances[0].withCredentials).toBe(true);
    expect(instances[0].payload).toBe(
      JSON.stringify({loginId: 'root-admin', password: 'secret'}),
    );
  });

  test('fetchAccountProfile uses GET without a request body', async () => {
    await fetchAccountProfile();

    expect(instances[0].method).toBe('GET');
    expect(instances[0].url).toContain('/api/accounts/profile');
    expect(instances[0].payload).toBe(null);
  });

  test('updateAccountProfile posts the partial profile update payload', async () => {
    await updateAccountProfile({email: 'next@example.com', note: 'updated'});

    expect(instances[0].method).toBe('POST');
    expect(instances[0].url).toContain('/api/accounts/profile/update');
    expect(instances[0].payload).toBe(
      JSON.stringify({email: 'next@example.com', note: 'updated'}),
    );
  });

  test('logoutAccount posts an empty payload to logout', async () => {
    await logoutAccount();

    expect(instances[0].method).toBe('POST');
    expect(instances[0].url).toContain('/api/accounts/logout');
    expect(instances[0].payload).toBe(JSON.stringify({}));
  });

  test('fetchStudentReservationAvailability posts the selected date', async () => {
    await fetchStudentReservationAvailability({date: '2026-04-01'});

    expect(instances[0].method).toBe('POST');
    expect(instances[0].url).toContain('/api/reservations/student/availability');
    expect(instances[0].payload).toBe(JSON.stringify({date: '2026-04-01'}));
  });

  test('fetchStudentReservationList loads reservations with GET', async () => {
    await fetchStudentReservationList();

    expect(instances[0].method).toBe('GET');
    expect(instances[0].url).toContain('/api/reservations/student/list');
    expect(instances[0].payload).toBe(null);
  });

  test('createStudentReservation posts the selected slot', async () => {
    await createStudentReservation({
      startsAtUtc: '2026-04-01T01:00:00Z',
    });

    expect(instances[0].method).toBe('POST');
    expect(instances[0].url).toContain('/api/reservations/student/create');
    expect(instances[0].payload).toBe(
      JSON.stringify({
        startsAtUtc: '2026-04-01T01:00:00Z',
      }),
    );
  });

  test('cancelStudentReservation posts the reservation id', async () => {
    await cancelStudentReservation({reservationId: 'reservation-1'});

    expect(instances[0].method).toBe('POST');
    expect(instances[0].url).toContain('/api/reservations/student/cancel');
    expect(instances[0].payload).toBe(
      JSON.stringify({reservationId: 'reservation-1'}),
    );
  });

  test('returns an error payload when xhr fails', async () => {
    (globalThis as any).XMLHttpRequest = class {
      method = '';
      url = '';
      headers: Record<string, string> = {};
      payload: string | null = null;
      status = 500;
      responseText = '';
      withCredentials = false;
      timeout = 0;
      onabort = null;
      onerror = null;
      onload = null;
      ontimeout = null;
      open() {}
      setRequestHeader() {}
      send() {
        const onError = this.onerror as (() => void) | null;
        if (onError) {
          onError();
        }
      }
    };

    const result = await loginAccount({loginId: 'root-admin', password: 'secret'});

    expect(result.status).toBe('error');
    expect(result.error).toBe('XMLHttpRequest failed');
  });
});
