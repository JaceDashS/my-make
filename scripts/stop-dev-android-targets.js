const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const rootDir = path.join(__dirname, '..');

function run(command, args) {
  return spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function hasCommand(command) {
  const result = spawnSync('cmd.exe', ['/d', '/c', 'where', command], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean) || null;
}

function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  ].filter(Boolean);

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function stopAndroidClient() {
  const androidSdk = findAndroidSdk();
  const adbPath =
    hasCommand('adb') ||
    (androidSdk
      ? path.join(androidSdk, 'platform-tools', 'adb.exe')
      : null);

  if (!adbPath) {
    return;
  }

  run(adbPath, ['shell', 'am', 'force-stop', 'com.mymakeclient']);
}

stopAndroidClient();

console.log('stopped android dev target apps');
