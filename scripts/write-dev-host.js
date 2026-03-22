const fs = require('fs');
const os = require('os');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'client', 'dev-host.ts');

function isPrivateIPv4(address) {
  return (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function detectHostIp() {
  const configured = process.env.DEV_HOST_IP;
  if (configured) {
    return configured;
  }

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

const hostIp = detectHostIp();
const fileContents = `export const DEV_HOST_IP = '${hostIp}';\n`;

fs.writeFileSync(outputPath, fileContents, 'utf8');
console.log(`dev host written to client/dev-host.ts: ${hostIp}`);
