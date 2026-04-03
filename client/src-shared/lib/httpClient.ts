import {getPlatformOS} from './platform';

import {RUNTIME_CONFIG} from '../../src/config/runtime/runtime-config';
import {unique} from './unique';

export const EMULATOR_HOST = '10.0.2.2';
export const LOCALHOST_HOST = 'localhost';
export const LOOPBACK_HOST = '127.0.0.1';

type HostList = string[] | (() => string[]);

type JsonRecord = Record<string, string | undefined>;

type RequestResult = {
  body: string;
  status: number;
};

export type LocalUrlStrategy = {
  androidHosts: HostList;
  defaultHosts: HostList;
  windowsHosts: HostList;
};

type JsonRequestOptions = {
  body?: JsonRecord | null;
  method: 'GET' | 'POST';
  path: string;
  timeoutMs: number;
  urlStrategy: LocalUrlStrategy;
  withCredentials?: boolean;
  onError?: (payload: Record<string, unknown>) => void;
  onStart?: (payload: Record<string, unknown>) => void;
  onSuccess?: (payload: Record<string, unknown>) => void;
};

function createTimeoutError(timeoutMs: number) {
  return new Error(`Request timed out after ${timeoutMs}ms`);
}

function buildRequestLogPayload(
  method: 'GET' | 'POST',
  path: string,
  url: string,
) {
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

function buildLocalUrls(path: string, strategy: LocalUrlStrategy) {
  const port = RUNTIME_CONFIG.CLIENT_LOCAL_PORT;
  const toUrl = (host: string) => `http://${host}:${port}${path}`;
  const resolveHosts = (hosts: HostList) =>
    typeof hosts === 'function' ? hosts() : hosts;

  const os = getPlatformOS();

  if (os === 'windows' || os === 'web') {
    return unique(resolveHosts(strategy.windowsHosts).map(toUrl));
  }

  if (os === 'android') {
    return unique(resolveHosts(strategy.androidHosts).map(toUrl));
  }

  return unique(resolveHosts(strategy.defaultHosts).map(toUrl));
}

function parseJsonBody<TResponse>(body: string) {
  if (!body) {
    throw new Error('Response body was empty.');
  }

  return JSON.parse(body) as TResponse;
}

async function requestWithXhr(
  method: 'GET' | 'POST',
  url: string,
  payload: string | null,
  timeoutMs: number,
  withCredentials: boolean,
) {
  return new Promise<RequestResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(method, url, true);
    xhr.withCredentials = withCredentials;
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

async function requestWithFetch(
  method: 'GET' | 'POST',
  url: string,
  payload: string | null,
  timeoutMs: number,
  withCredentials: boolean,
) {
  const abortController = new AbortController();
  const timeoutToken = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      body: payload,
      credentials: withCredentials ? 'include' : 'same-origin',
      headers: payload === null ? undefined : { 'Content-Type': 'application/json' },
      method,
      signal: abortController.signal,
    });

    return {
      body: await response.text(),
      status: response.status,
    };
  } catch (error) {
    const errorName =
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      typeof error.name === 'string'
        ? error.name
        : '';

    if (errorName === 'AbortError') {
      throw createTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeoutToken);
  }
}

async function requestJsonOnce(
  url: string,
  {
    body,
    method,
    timeoutMs,
    withCredentials,
  }: Pick<JsonRequestOptions, 'body' | 'method' | 'timeoutMs' | 'withCredentials'>,
) {
  const payload = body ? JSON.stringify(body) : null;

  if (getPlatformOS() === 'windows') {
    return requestWithXhr(
      method,
      url,
      payload,
      timeoutMs,
      withCredentials ?? false,
    );
  }

  return requestWithFetch(
    method,
    url,
    payload,
    timeoutMs,
    withCredentials ?? false,
  );
}

export const ACCOUNT_API_URL_STRATEGY: LocalUrlStrategy = {
  androidHosts: () => [RUNTIME_CONFIG.DEV_HOST_IP],
  defaultHosts: [EMULATOR_HOST],
  windowsHosts: [LOCALHOST_HOST],
};

export const FALLBACK_API_URL_STRATEGY: LocalUrlStrategy = {
  androidHosts: () => [
    RUNTIME_CONFIG.DEV_HOST_IP,
    EMULATOR_HOST,
    LOCALHOST_HOST,
    LOOPBACK_HOST,
  ],
  defaultHosts: () => [
    RUNTIME_CONFIG.DEV_HOST_IP,
    LOCALHOST_HOST,
    LOOPBACK_HOST,
  ],
  windowsHosts: () => [
    LOCALHOST_HOST,
    LOOPBACK_HOST,
    RUNTIME_CONFIG.DEV_HOST_IP,
  ],
};

export async function requestLocalJson<
  TResponse extends { error?: string; message: string; status: string },
>({
  body = null,
  method,
  onError,
  onStart,
  onSuccess,
  path,
  timeoutMs,
  urlStrategy,
  withCredentials = false,
}: JsonRequestOptions): Promise<TResponse> {
  const urls = buildLocalUrls(path, urlStrategy);
  let lastError = 'Unknown error';

  for (const url of urls) {
    const logPayload = buildRequestLogPayload(method, path, url);
    onStart?.(logPayload);

    try {
      const response = await requestJsonOnce(url, {
        body,
        method,
        timeoutMs,
        withCredentials,
      });
      const parsed = parseJsonBody<TResponse>(response.body);

      if (response.status < 200 || response.status >= 300) {
        lastError =
          parsed.error ?? parsed.message ?? `HTTP ${response.status}`;
        onError?.({
          ...logPayload,
          error: lastError,
          status: response.status,
        });
        return parsed;
      }

      onSuccess?.({
        ...logPayload,
        status: response.status,
      });

      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      onError?.({
        ...logPayload,
        error: lastError,
      });
    }
  }

  return {
    status: 'error',
    message: 'Request failed.',
    error: lastError,
  } as TResponse;
}
