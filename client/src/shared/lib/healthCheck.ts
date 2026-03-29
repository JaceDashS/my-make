import {Platform} from 'react-native';
import {RUNTIME_CONFIG} from '../../config/runtime/runtime-config';
import {unique} from './unique';
import {EMULATOR_HOST, LOCALHOST_HOST, LOOPBACK_HOST} from './httpClient';

export type HealthCheckTarget = 'local' | 'docker' | 'render';
export type HealthCheckResult =
  | {
      ok: true;
      body: string;
      candidates: string[];
      label: string;
      status: number;
      url: string;
    }
  | {
      ok: false;
      candidates: string[];
      error: string;
      label: string;
    };

const REQUEST_TIMEOUT_MS = 5000;

function createTimeoutError() {
  return new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
}

type RequestResult = {
  body: string;
  status: number;
  statusText: string;
};

function requestWithXhr(url: string): Promise<RequestResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('GET', url, true);
    xhr.timeout = REQUEST_TIMEOUT_MS;

    xhr.onload = () => {
      resolve({
        body: xhr.responseText ?? '',
        status: xhr.status,
        statusText: xhr.statusText ?? '',
      });
    };

    xhr.onerror = () => {
      reject(new Error('XMLHttpRequest failed'));
    };

    xhr.ontimeout = () => {
      reject(createTimeoutError());
    };

    xhr.onabort = () => {
      reject(new Error('XMLHttpRequest aborted'));
    };

    xhr.send();
  });
}

async function requestHealth(url: string): Promise<RequestResult> {
  if (Platform.OS === 'windows') {
    return requestWithXhr(url);
  }

  const response = await Promise.race([
    fetch(url),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(createTimeoutError()), REQUEST_TIMEOUT_MS);
    }),
  ]);

  return {
    body: await response.text(),
    status: response.status,
    statusText: response.statusText ?? '',
  };
}

function buildLocalCandidates(port: string) {
  const routePath = RUNTIME_CONFIG.CLIENT_HEALTH_PATH;
  const devHostUrl = `http://${RUNTIME_CONFIG.DEV_HOST_IP}:${port}${routePath}`;
  const emulatorUrl = `http://${EMULATOR_HOST}:${port}${routePath}`;
  const localhostUrl = `http://${LOCALHOST_HOST}:${port}${routePath}`;
  const loopbackUrl = `http://${LOOPBACK_HOST}:${port}${routePath}`;

  if (Platform.OS === 'windows') {
    return unique([localhostUrl, loopbackUrl, devHostUrl]);
  }

  if (Platform.OS === 'android') {
    return unique([devHostUrl, emulatorUrl, localhostUrl, loopbackUrl]);
  }

  return unique([devHostUrl, localhostUrl, loopbackUrl]);
}

export function getHealthCheckCandidates(target: HealthCheckTarget) {
  if (target === 'local') {
    return buildLocalCandidates(RUNTIME_CONFIG.CLIENT_LOCAL_PORT);
  }

  if (target === 'docker') {
    return buildLocalCandidates(RUNTIME_CONFIG.CLIENT_DOCKER_PORT);
  }

  return [
    `${RUNTIME_CONFIG.CLIENT_RENDER_BASE_URL}${RUNTIME_CONFIG.CLIENT_HEALTH_PATH}`,
  ];
}

export function getHealthCheckLabel(target: HealthCheckTarget) {
  if (target === 'local') {
    return 'Local';
  }

  if (target === 'docker') {
    return 'Docker';
  }

  return 'Cloud';
}

export async function runHealthCheck(
  target: HealthCheckTarget,
): Promise<HealthCheckResult> {
  const candidates = getHealthCheckCandidates(target);
  const label = getHealthCheckLabel(target);
  let lastError = 'Unknown error';

  console.log(
    `[health-check] start target=${target} label=${label} platform=${Platform.OS} candidates=${candidates.join(
      ' | ',
    )}`,
  );

  for (const url of candidates) {
    try {
      console.log(`[health-check] requesting ${url}`);
      const response = await requestHealth(url);

      if (response.status < 200 || response.status >= 300) {
        lastError = `${response.status} ${response.statusText || 'Request failed'}`;
        console.warn(
          `[health-check] non-ok response target=${target} url=${url} status=${response.status} statusText=${response.statusText}`,
        );
        continue;
      }

      console.log(
        `[health-check] success target=${target} url=${url} status=${response.status}`,
      );

      return {
        ok: true as const,
        body: response.body,
        candidates,
        label,
        status: response.status,
        url,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn(
        `[health-check] request failed target=${target} url=${url} error=${lastError}`,
      );
    }
  }

  console.error(
    `[health-check] failed target=${target} lastError=${lastError}`,
  );

  return {
    ok: false as const,
    candidates,
    error: lastError,
    label,
  };
}
