import { RUNTIME_CONFIG } from '../../config/runtime/runtime-config';
import {
  ACCOUNT_API_URL_STRATEGY,
  requestLocalJson,
} from './httpClient';

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

function logAccountApiEvent(
  event: string,
  payload: Record<string, unknown>,
) {
  console.log(`[accounts] ${event}`, payload);
}

async function requestJson(
  method: 'GET' | 'POST',
  path: string,
  payload: Record<string, string | undefined> | null,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
) {
  return requestLocalJson<AccountApiResult>({
    body: payload,
    method,
    onError: nextPayload => logAccountApiEvent('api:request:error', nextPayload),
    onStart: nextPayload => logAccountApiEvent('api:request:start', nextPayload),
    onSuccess: nextPayload =>
      logAccountApiEvent('api:request:success', nextPayload),
    path,
    timeoutMs,
    urlStrategy: ACCOUNT_API_URL_STRATEGY,
    withCredentials: true,
  });
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
