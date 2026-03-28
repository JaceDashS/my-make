import { Platform } from 'react-native';

import { RUNTIME_CONFIG } from '../../config/runtime/runtime-config';
import { unique } from './unique';

const EMULATOR_HOST = '10.0.2.2';
const LOCALHOST_HOST = 'localhost';
const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
const LONG_REQUEST_TIMEOUT_MS = 60000;

export type AccountApiResult = {
  status: string;
  message: string;
  error?: string;
  academyCode?: string;
  academyName?: string;
  displayName?: string;
  email?: string;
  loginId?: string;
  roleCode?: string;
  phone?: string;
  expiresAt?: string;
  licenseCode?: string;
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

async function requestWithXhr(
  method: 'GET' | 'POST',
  url: string,
  payload: string | null,
  timeoutMs: number,
) {
  return new Promise<RequestResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(method, url, true);
    xhr.withCredentials = true;
    if (payload !== null) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }
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

async function requestJson(
  method: 'GET' | 'POST',
  path: string,
  payload: Record<string, string | undefined> | null,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
) {
  const candidates = buildCandidates(path);
  const body = payload ? JSON.stringify(payload) : null;
  let lastError = 'Unknown error';

  for (const url of candidates) {
    try {
      const response =
        Platform.OS === 'windows'
          ? await requestWithXhr(method, url, body, timeoutMs)
          : await fetchWithTimeout(method, url, body, timeoutMs);
      const parsed = JSON.parse(response.body) as AccountApiResult;

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
  };
}

async function fetchWithTimeout(
  method: 'GET' | 'POST',
  url: string,
  body: string | null,
  timeoutMs: number,
): Promise<RequestResult> {
  const response = await Promise.race([
    fetch(url, {
      body: body ?? undefined,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      method,
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

export function loginAccount(payload: { loginId: string; password: string }) {
  return requestJson('POST', RUNTIME_CONFIG.CLIENT_ACCOUNT_LOGIN_PATH, payload);
}

export function fetchAccountProfile() {
  return requestJson('GET', RUNTIME_CONFIG.CLIENT_ACCOUNT_PROFILE_PATH, null);
}

export function logoutAccount() {
  return requestJson('POST', RUNTIME_CONFIG.CLIENT_ACCOUNT_LOGOUT_PATH, {});
}

export function registerMemberAccount(payload: {
  academyCode?: string;
  displayName: string;
  email: string;
  loginId: string;
  phone: string;
  password: string;
  requestedRoleCode: string;
}) {
  return requestJson(
    'POST',
    RUNTIME_CONFIG.CLIENT_ACCOUNT_MEMBER_REGISTER_PATH,
    payload,
    LONG_REQUEST_TIMEOUT_MS,
  );
}

export function registerRootAccount(payload: {
  academyName: string;
  email: string;
  licenseCode: string;
  phone: string;
  password: string;
  rootDisplayName: string;
  rootLoginId: string;
}) {
  return requestJson(
    'POST',
    RUNTIME_CONFIG.CLIENT_ACCOUNT_ROOT_REGISTER_PATH,
    payload,
    LONG_REQUEST_TIMEOUT_MS,
  );
}

export function renewLicense(payload: { licenseCode: string }) {
  return requestJson(
    'POST',
    RUNTIME_CONFIG.CLIENT_LICENSE_RENEW_PATH,
    payload,
    LONG_REQUEST_TIMEOUT_MS,
  );
}
