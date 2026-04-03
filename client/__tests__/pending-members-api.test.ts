jest.mock('react-native', () => ({
  Platform: {OS: 'windows'},
}));

import {
  approvePendingMember,
  searchPendingMembers,
} from '../src/shared/lib/pendingMembersApi';

type XhrInstance = {
  headers: Record<string, string>;
  method: string;
  onabort: null | (() => void);
  onerror: null | (() => void);
  onload: null | (() => void);
  ontimeout: null | (() => void);
  payload: string | null;
  responseText: string;
  status: number;
  timeout: number;
  url: string;
  withCredentials: boolean;
  open: (method: string, url: string) => void;
  send: (payload: string | null) => void;
  setRequestHeader: (name: string, value: string) => void;
};

describe('pending members api', () => {
  let instances: XhrInstance[] = [];

  beforeEach(() => {
    instances = [];
    (globalThis as any).XMLHttpRequest = class {
      headers: Record<string, string> = {};
      method = '';
      onabort = null;
      onerror = null;
      onload = null;
      ontimeout = null;
      payload: string | null = null;
      responseText = JSON.stringify({status: 'ok', message: 'done'});
      status = 200;
      timeout = 0;
      url = '';
      withCredentials = false;

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

  test('searchPendingMembers posts to the pending search route', async () => {
    await searchPendingMembers({
      academyCode: 'A100',
      actorRoleCode: 'ADMIN',
      field: 'displayName',
      query: 'kim',
    });

    expect(instances).toHaveLength(1);
    expect(instances[0].method).toBe('POST');
    expect(instances[0].url).toContain('/api/members/pending/search');
    expect(instances[0].headers['Content-Type']).toBe('application/json');
    expect(instances[0].withCredentials).toBe(true);
    expect(instances[0].payload).toBe(
      JSON.stringify({
        academyCode: 'A100',
        actorRoleCode: 'ADMIN',
        field: 'displayName',
        query: 'kim',
      }),
    );
  });

  test('approvePendingMember posts the approval payload', async () => {
    await approvePendingMember({
      academyCode: 'A100',
      actorRoleCode: 'ROOT',
      loginId: 'pending-user',
    });

    expect(instances[0].method).toBe('POST');
    expect(instances[0].url).toContain('/api/members/pending/approve');
    expect(instances[0].payload).toBe(
      JSON.stringify({
        academyCode: 'A100',
        actorRoleCode: 'ROOT',
        loginId: 'pending-user',
      }),
    );
  });

  test('returns an error payload when xhr fails for every candidate', async () => {
    (globalThis as any).XMLHttpRequest = class {
      headers: Record<string, string> = {};
      method = '';
      onabort = null;
      onerror = null;
      onload = null;
      ontimeout = null;
      payload: string | null = null;
      responseText = '';
      status = 500;
      timeout = 0;
      url = '';
      withCredentials = false;
      open(method: string, url: string) {
        this.method = method;
        this.url = url;
      }
      setRequestHeader(name: string, value: string) {
        this.headers[name] = value;
      }
      send(payload: string | null) {
        this.payload = payload;
        const onError = this.onerror as (() => void) | null;
        if (onError) {
          onError();
        }
      }
    };

    const result = await searchPendingMembers({
      academyCode: 'A100',
      actorRoleCode: 'ADMIN',
      field: 'email',
      query: 'a@example.com',
    });

    expect(result.status).toBe('error');
    expect(result.error).toBe('XMLHttpRequest failed');
  });
});
