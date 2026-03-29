import {Platform} from 'react-native';

import {RUNTIME_CONFIG} from '../../config/runtime/runtime-config';
import {unique} from './unique';

const EMULATOR_HOST = '10.0.2.2';
const LOCALHOST_HOST = 'localhost';
const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

export type PendingMemberRecord = {
  createdAt: string;
  displayName: string;
  email?: string;
  phone?: string;
  loginId: string;
  roleCode: string;
};

export type AcademyMemberRecord = PendingMemberRecord & {
  statusCode: 'ACTIVE' | 'HOLD' | 'INACTIVE';
};

export type PendingMembersResponse = {
  status: string;
  message: string;
  error?: string;
  members?: PendingMemberRecord[];
};

export type AcademyMembersResponse = {
  status: string;
  message: string;
  error?: string;
  members?: AcademyMemberRecord[];
};

export type ApprovePendingMemberResponse = {
  status: string;
  message: string;
  error?: string;
  academyCode?: string;
  displayName?: string;
  loginId?: string;
  roleCode?: string;
};

export type UpdateAcademyMemberStatusResponse = {
  status: string;
  message: string;
  error?: string;
  currentStatus?: string;
  displayName?: string;
  loginId?: string;
  nextStatus?: string;
  roleCode?: string;
};

type RequestResult = {
  body: string;
  status: number;
};

function createTimeoutError(timeoutMs: number) {
  return new Error(`Request timed out after ${timeoutMs}ms`);
}

function buildCandidates(path: string) {
  const port = RUNTIME_CONFIG.CLIENT_LOCAL_PORT;
  const devHostUrl = `http://${RUNTIME_CONFIG.DEV_HOST_IP}:${port}${path}`;
  const emulatorUrl = `http://${EMULATOR_HOST}:${port}${path}`;
  const localhostUrl = `http://${LOCALHOST_HOST}:${port}${path}`;
  const loopbackUrl = `http://${LOOPBACK_HOST}:${port}${path}`;

  if (Platform.OS === 'windows') {
    return unique([localhostUrl, loopbackUrl, devHostUrl]);
  }

  if (Platform.OS === 'android') {
    return unique([devHostUrl, emulatorUrl, localhostUrl, loopbackUrl]);
  }

  return unique([devHostUrl, localhostUrl, loopbackUrl]);
}

async function requestWithXhr(url: string, payload: string, timeoutMs: number) {
  return new Promise<RequestResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = timeoutMs;

    xhr.onload = () => {
      resolve({
        body: xhr.responseText ?? '',
        status: xhr.status,
      });
    };

    xhr.onerror = () => reject(new Error('XMLHttpRequest failed'));
    xhr.ontimeout = () => reject(createTimeoutError(timeoutMs));
    xhr.onabort = () => reject(new Error('XMLHttpRequest aborted'));

    xhr.send(payload);
  });
}

async function fetchWithTimeout(
  url: string,
  body: string,
  timeoutMs: number,
): Promise<RequestResult> {
  const response = await Promise.race([
    fetch(url, {
      body,
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(createTimeoutError(timeoutMs)), timeoutMs);
    }),
  ]);

  return {
    body: await response.text(),
    status: response.status,
  };
}

async function postJson<TResponse extends {error?: string; message: string; status: string}>(
  path: string,
  payload: Record<string, string>,
): Promise<TResponse> {
  const candidates = buildCandidates(path);
  const body = JSON.stringify(payload);
  let lastError = 'Unknown error';

  for (const url of candidates) {
    try {
      const response =
        Platform.OS === 'windows'
          ? await requestWithXhr(url, body, DEFAULT_REQUEST_TIMEOUT_MS)
          : await fetchWithTimeout(url, body, DEFAULT_REQUEST_TIMEOUT_MS);
      const parsed = JSON.parse(response.body) as TResponse;

      if (response.status >= 200 && response.status < 300) {
        return parsed;
      }

      lastError = parsed.error ?? parsed.message ?? `HTTP ${response.status}`;
      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    status: 'error',
    message: 'Request failed.',
    error: lastError,
  } as TResponse;
}

export function searchPendingMembers(payload: {
  academyCode: string;
  actorRoleCode: string;
  field: 'displayName' | 'email' | 'phone';
  query: string;
}) {
  return postJson<PendingMembersResponse>('/api/members/pending/search', payload);
}

export function approvePendingMember(payload: {
  academyCode: string;
  actorRoleCode: string;
  loginId: string;
}) {
  return postJson<ApprovePendingMemberResponse>(
    '/api/members/pending/approve',
    payload,
  );
}

export function searchAcademyMembers(payload: {
  academyCode: string;
  actorRoleCode: string;
  field: 'displayName' | 'email' | 'phone';
  query: string;
  statusFilter: 'ALL' | 'ACTIVE' | 'HOLD' | 'INACTIVE';
}) {
  return postJson<AcademyMembersResponse>('/api/members/academy/search', payload);
}

export function updateAcademyMemberStatus(payload: {
  academyCode: string;
  actorRoleCode: string;
  loginId: string;
  currentStatus: 'ACTIVE' | 'HOLD' | 'INACTIVE';
  nextStatus: 'ACTIVE' | 'HOLD' | 'INACTIVE';
}) {
  return postJson<UpdateAcademyMemberStatusResponse>(
    '/api/members/academy/status',
    payload,
  );
}
