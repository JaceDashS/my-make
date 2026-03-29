import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const outputPath = path.resolve('src/config/runtime/dev-host.ts');

function isPrivateIpv4(address) {
  if (!address || address.includes(':')) {
    return false;
  }

  if (address.startsWith('10.')) {
    return true;
  }

  if (address.startsWith('192.168.')) {
    return true;
  }

  const match = /^172\.(\d+)\./.exec(address);
  if (!match) {
    return false;
  }

  const second = Number(match[1]);
  return second >= 16 && second <= 31;
}

function pickHostIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.internal || entry.family !== 'IPv4') {
        continue;
      }

      if (!isPrivateIpv4(entry.address)) {
        continue;
      }

      candidates.push(entry.address);
    }
  }

  if (candidates.length === 0) {
    throw new Error('No private IPv4 address found. Set dev-host.ts manually.');
  }

  candidates.sort((left, right) => {
    const leftScore = left.startsWith('192.168.') ? 0 : left.startsWith('10.') ? 1 : 2;
    const rightScore = right.startsWith('192.168.') ? 0 : right.startsWith('10.') ? 1 : 2;
    return leftScore - rightScore || left.localeCompare(right);
  });

  return candidates[0];
}

const hostIp = pickHostIp();
const nextContent = `export const DEV_HOST_IP = '${hostIp}';\n`;
const previousContent = fs.existsSync(outputPath)
  ? fs.readFileSync(outputPath, 'utf8')
  : '';

if (previousContent === nextContent) {
  console.log(`[sync-dev-host] unchanged ${hostIp}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, nextContent, 'utf8');
console.log(`[sync-dev-host] updated ${hostIp}`);
