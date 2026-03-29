import { Platform } from 'react-native';

import { RUNTIME_CONFIG } from '../../config/runtime/runtime-config';

const EMULATOR_HOST = '10.0.2.2';
const LOCALHOST_HOST = 'localhost';
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const LONG_REQUEST_TIMEOUT_MS = 60000;

export type AccountApiResult = {
  status: string;
  message: string;
  error?: string;
  accountCode?: string;
  academyCode?: string;
  academyName?: string;
  displayName?: string;
  details?: Array<{key?: string; label?: string; value?: string}>;
  email?: string;
  loginId?: string;
  note?: string;
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

function buildBaseUrl() {
  const port = RUNTIME_CONFIG.CLIENT_LOCAL_PORT;

  if (Platform.OS === 'windows') {
    return `http://${LOCALHOST_HOST}:${port}`;
  }

  if (Platform.OS === 'android') {
    return `http://${RUNTIME_CONFIG.DEV_HOST_IP}:${port}`;
  }

  return `http://${EMULATOR_HOST}:${port}`;
}

function buildRequestLogPayload(method: 'GET' | 'POST', path: string, url: string) {
  const match = url.match(/^(https?):\/\/([^/:]+)(?::(\d+))?/i);
  const protocol = match?.[1] ?? 'http';
  const host = match?.[2] ?? '';
  const port = match?.[3] ?? (protocol === 'https' ? '443' : '80');

  return {
    host,
    method,
    path,
    port,
    url,
  };
}

function logAccountApiEvent(
  event: string,
  payload: Record<string, unknown>,
) {
  console.log(`[accounts] ${event}`, payload);
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
  const url = `${buildBaseUrl()}${path}`;
  const body = payload ? JSON.stringify(payload) : null;
  const logPayload = buildRequestLogPayload(method, path, url);

  logAccountApiEvent('api:request:start', logPayload);

  try {
    const response = await requestWithXhr(method, url, body, timeoutMs);
    const parsed = JSON.parse(response.body) as AccountApiResult;

    logAccountApiEvent('api:request:success', {
      ...logPayload,
      status: response.status,
    });

    return parsed;
  } catch (error) {
    logAccountApiEvent('api:request:error', {
      ...logPayload,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 'error',
      message: 'Request failed.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
export function loginAccount(payload: { loginId: string; password: string }) {
  return requestJson('POST', RUNTIME_CONFIG.CLIENT_ACCOUNT_LOGIN_PATH, payload);
}

export function fetchAccountProfile() {
  return requestJson('GET', RUNTIME_CONFIG.CLIENT_ACCOUNT_PROFILE_PATH, null);
}

export function updateAccountProfile(payload: {
  authPolicy?: string;
  email?: string;
  note?: string;
  password?: string;
  phone?: string;
  statusCode?: string;
}) {
  return requestJson(
    'POST',
    RUNTIME_CONFIG.CLIENT_ACCOUNT_PROFILE_UPDATE_PATH,
    payload,
  );
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

