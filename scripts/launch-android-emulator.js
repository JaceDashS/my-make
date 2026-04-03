const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {spawn, spawnSync} = require('child_process');

const rootDir = path.join(__dirname, '..');

function run(command, args) {
  return spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
    killSignal: 'SIGKILL',
  });
}

function hasCommand(command) {
  const result = spawnSync('cmd.exe', ['/d', '/c', 'where', command], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
  });

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout || '').split(/\r?\n/).map(l => l.trim()).find(Boolean) || null;
}

function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  ].filter(Boolean);

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function getAvds(emulatorPath) {
  const result = run(emulatorPath, ['-list-avds']);
  if (result.error || result.status !== 0) {
    return [];
  }

  return (result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function getAndroidDevices(adbPath) {
  const result = run(adbPath, ['devices']);
  if (result.error || result.status !== 0) {
    return [];
  }

  return (result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('List of devices attached'))
    .filter(line => /\sdevice$/.test(line))
    .map(line => line.split(/\s+/)[0]);
}

function selectAvd(avds) {
  return new Promise((resolve, reject) => {
    console.log('\nAvailable AVDs:');
    avds.forEach((avd, i) => {
      console.log(`  ${i + 1}) ${avd}`);
    });
    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const ask = () => {
      rl.question(`Select AVD (1-${avds.length}): `, answer => {
        const n = parseInt(answer.trim(), 10);
        if (Number.isInteger(n) && n >= 1 && n <= avds.length) {
          rl.close();
          resolve(avds[n - 1]);
        } else {
          console.log(`  Please enter a number between 1 and ${avds.length}.`);
          ask();
        }
      });
    };

    rl.on('error', reject);
    ask();
  });
}

async function main() {
  const androidSdk = findAndroidSdk();
  const adbPath = hasCommand('adb') ||
    (androidSdk ? path.join(androidSdk, 'platform-tools', 'adb.exe') : null);
  const emulatorPath = androidSdk &&
    fs.existsSync(path.join(androidSdk, 'emulator', 'emulator.exe'))
      ? path.join(androidSdk, 'emulator', 'emulator.exe')
      : null;

  if (!androidSdk || !adbPath) {
    console.error('Android SDK or adb not found.');
    process.exit(1);
  }

  if (!emulatorPath) {
    console.error('emulator.exe not found in Android SDK.');
    process.exit(1);
  }

  const existing = getAndroidDevices(adbPath);
  if (existing.length > 0) {
    console.log(`Already running: ${existing.join(', ')}`);
    process.exit(0);
  }

  const avds = getAvds(emulatorPath);
  if (avds.length === 0) {
    console.error('No AVDs found. Create one in Android Studio first.');
    process.exit(1);
  }

  const selected = avds.length === 1 ? avds[0] : await selectAvd(avds);

  console.log(`\nLaunching "${selected}"...`);

  const emulatorProcess = spawn(
    `"${emulatorPath}" -avd "${selected}"`,
    [],
    {
      cwd: rootDir,
      detached: true,
      shell: 'cmd.exe',
      stdio: 'ignore',
      windowsHide: false,
    },
  );

  emulatorProcess.unref();
  console.log(`Emulator started (pid: ${emulatorProcess.pid}). Waiting for device to come online...`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
