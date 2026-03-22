const fs = require('fs');
const os = require('os');
const path = require('path');

const envName = process.argv[2] || 'development';
const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, 'client', `.env.${envName}`);
const outputPath = path.join(rootDir, 'client', 'runtime-config.ts');
const metroPort = process.env.RCT_METRO_PORT || '8081';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const index = line.indexOf('=');
    if (index === -1) {
      continue;
    }

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }

  return env;
}

function isPrivateIPv4(address) {
  return (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function detectHostIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const infos of Object.values(interfaces)) {
    for (const info of infos || []) {
      if (!info || info.family !== 'IPv4' || info.internal) {
        continue;
      }

      candidates.push(info.address);
    }
  }

  const privateIp = candidates.find(isPrivateIPv4);
  return privateIp || candidates[0] || '127.0.0.1';
}

function makeBox(lines) {
  const width = Math.max(...lines.map(line => line.length));
  const top = `+${'-'.repeat(width + 2)}+`;
  const body = lines.map(line => `| ${line.padEnd(width)} |`);
  return [top, ...body, top].join('\n');
}

const fileEnv = parseEnvFile(envPath);
const runtimeConfig = {
  APP_ENV: envName,
  DEV_HOST_IP: process.env.DEV_HOST_IP || fileEnv.DEV_HOST_IP || detectHostIp(),
  CLIENT_LOCAL_PORT: process.env.CLIENT_LOCAL_PORT || fileEnv.CLIENT_LOCAL_PORT || '8080',
  CLIENT_DOCKER_PORT:
    process.env.CLIENT_DOCKER_PORT || fileEnv.CLIENT_DOCKER_PORT || '18080',
  CLIENT_HEALTH_PATH:
    process.env.CLIENT_HEALTH_PATH || fileEnv.CLIENT_HEALTH_PATH || '/health',
  CLIENT_RENDER_BASE_URL:
    process.env.CLIENT_RENDER_BASE_URL ||
    fileEnv.CLIENT_RENDER_BASE_URL ||
    'https://your-render-service.onrender.com',
};

const fileContents = `export const RUNTIME_CONFIG = ${JSON.stringify(
  runtimeConfig,
  null,
  2,
)} as const;\n`;

fs.writeFileSync(outputPath, fileContents, 'utf8');

const localHealth = `http://${runtimeConfig.DEV_HOST_IP}:${runtimeConfig.CLIENT_LOCAL_PORT}${runtimeConfig.CLIENT_HEALTH_PATH}`;
const dockerHealth = `http://${runtimeConfig.DEV_HOST_IP}:${runtimeConfig.CLIENT_DOCKER_PORT}${runtimeConfig.CLIENT_HEALTH_PATH}`;
const metroUrl = `http://${runtimeConfig.DEV_HOST_IP}:${metroPort}`;

console.log(
  makeBox([
    'MY-MAKE DEV NETWORK',
    `env            : ${runtimeConfig.APP_ENV}`,
    `host ip        : ${runtimeConfig.DEV_HOST_IP}`,
    `metro port     : ${metroPort}`,
    `metro url      : ${metroUrl}`,
    `api bind       : 0.0.0.0:${runtimeConfig.CLIENT_LOCAL_PORT}`,
    `local api      : ${localHealth}`,
    `docker bind    : 0.0.0.0:${runtimeConfig.CLIENT_DOCKER_PORT}`,
    `docker api     : ${dockerHealth}`,
    `render api     : ${runtimeConfig.CLIENT_RENDER_BASE_URL}${runtimeConfig.CLIENT_HEALTH_PATH}`,
    `config file    : client/.env.${envName}`,
  ]),
);
