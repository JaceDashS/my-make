const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const os = require('os');
const path = require('path');
const {spawn, spawnSync} = require('child_process');

const dryRun = process.argv.includes('--dry-run');
const rootDir = path.join(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const hostOs = os.platform();
const pathKey =
  Object.keys(process.env).find(key => key.toLowerCase() === 'path') || 'Path';
const commandShell =
  process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function run(command, args, timeout = 5000) {
  return spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
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
    killSignal: 'SIGKILL',
  });

  if (result.status !== 0) {
    return null;
  }

  const firstLine = (result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean);

  return firstLine || null;
}

function makeBox(lines) {
  const width = Math.max(...lines.map(line => line.length));
  const top = `+${'-'.repeat(width + 2)}+`;
  const body = lines.map(line => `| ${line.padEnd(width)} |`);
  return [top, ...body, top].join('\n');
}

function canConnect(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const socket = net.createConnection({host, port});

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      resolve(false);
    });

    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function getHttpClient(url) {
  return url.startsWith('https://') ? https : http;
}

function checkUrlReady(url) {
  return new Promise(resolve => {
    const client = getHttpClient(url);
    const request = client.get(url, response => {
      response.resume();
      resolve(response.statusCode && response.statusCode >= 200 && response.statusCode < 300);
    });

    request.on('error', () => {
      resolve(false);
    });

    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function isWindowsAppRunning() {
  if (hostOs !== 'win32') {
    return false;
  }

  const result = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      "Get-Process MyMakeClient -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty ProcessName",
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  if (result.status !== 0) {
    return false;
  }

  return Boolean((result.stdout || '').trim());
}

function makeReadyStatus(label, value) {
  return `${label.padEnd(8)}: ${value}`;
}

function getDependencyVersion(pkg, name) {
  return pkg?.dependencies?.[name] || pkg?.devDependencies?.[name] || null;
}

function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  ].filter(Boolean);

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function findJavaHome() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }

  const javaPath = hasCommand('java');
  if (!javaPath) {
    return null;
  }

  return path.dirname(path.dirname(javaPath));
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

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function findMsBuild() {
  const direct = hasCommand('msbuild');
  if (direct) {
    return direct;
  }

  const vswhere = 'C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe';
  if (!fs.existsSync(vswhere)) {
    return null;
  }

  const result = run(vswhere, [
    '-latest',
    '-requires',
    'Microsoft.Component.MSBuild',
    '-find',
    'MSBuild\\**\\Bin\\MSBuild.exe',
  ]);

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean) || null;
}

function isDotnetReady() {
  return (
    hasCommand('dotnet') ||
    (fs.existsSync('C:\\Program Files\\dotnet\\dotnet.exe')
      ? 'C:\\Program Files\\dotnet\\dotnet.exe'
      : null)
  );
}

const clientPackage = readJson(path.join(clientDir, 'package.json'));
const androidSdk = findAndroidSdk();
const javaHome = findJavaHome();
const adbPath =
  hasCommand('adb') ||
  (androidSdk
    ? path.join(androidSdk, 'platform-tools', 'adb.exe')
    : null);
const emulatorPath =
  androidSdk && fs.existsSync(path.join(androidSdk, 'emulator', 'emulator.exe'))
    ? path.join(androidSdk, 'emulator', 'emulator.exe')
    : null;

const androidDevices = adbPath ? getAndroidDevices(adbPath) : [];
const androidAvds = emulatorPath ? getAvds(emulatorPath) : [];
const msbuildPath = findMsBuild();
const dotnetPath = isDotnetReady();
const yarnPath = hasCommand('yarn') ? hasCommand('yarn') : 'corepack yarn';

const androidSupported =
  exists('client/android') &&
  Boolean(adbPath) &&
  Boolean(javaHome) &&
  Boolean(androidSdk) &&
  androidDevices.length > 0;

const androidAvailableButOffline =
  exists('client/android') &&
  Boolean(adbPath) &&
  Boolean(javaHome) &&
  Boolean(androidSdk) &&
  androidDevices.length === 0 &&
  androidAvds.length > 0;

const windowsSupported =
  exists('client/windows') &&
  Boolean(getDependencyVersion(clientPackage, 'react-native-windows')) &&
  hostOs === 'win32' &&
  Boolean(dotnetPath) &&
  Boolean(msbuildPath);

const env = {
  ...process.env,
};

if (androidSdk) {
  env.ANDROID_HOME = env.ANDROID_HOME || androidSdk;
  env.ANDROID_SDK_ROOT = env.ANDROID_SDK_ROOT || androidSdk;
}

if (javaHome) {
  env.JAVA_HOME = env.JAVA_HOME || javaHome;
}

const extraPathEntries = [];
if (androidSdk) {
  extraPathEntries.push(
    path.join(androidSdk, 'platform-tools'),
    path.join(androidSdk, 'emulator'),
  );
}
if (javaHome) {
  extraPathEntries.push(path.join(javaHome, 'bin'));
}

const currentPath = env[pathKey] || '';
const mergedPath = [extraPathEntries.join(';'), currentPath]
  .filter(Boolean)
  .join(';');

env[pathKey] = mergedPath;
env.PATH = mergedPath;
env.Path = mergedPath;

const lines = [
  'MY-MAKE SUPPORTED DEV TARGETS',
  `host os         : ${hostOs}`,
  `android target  : ${androidSupported ? 'auto-run' : 'skip'}`,
  `android devices : ${androidDevices.join(', ') || 'none'}`,
  `android avds    : ${androidAvds.join(', ') || 'none'}`,
  `windows target  : ${windowsSupported ? 'auto-run' : 'skip'}`,
  `windows project : ${exists('client/windows') ? 'present' : 'missing'}`,
  `dotnet          : ${dotnetPath ? 'found' : 'missing'}`,
  `msbuild         : ${msbuildPath ? 'found' : 'missing'}`,
  `yarn            : ${yarnPath || 'missing'}`,
];

async function main() {
  let activeAndroidDevices = [...androidDevices];
  let launchedAvdName = null;

  if (
    !dryRun &&
    activeAndroidDevices.length === 0 &&
    androidAvds.length > 0 &&
    adbPath &&
    emulatorPath
  ) {
    launchedAvdName = androidAvds[0];

    console.log(
      [
        '',
        'android bootstrap:',
        `- launching AVD \`${launchedAvdName}\` because no online Android device is connected.`,
      ].join('\n'),
    );

    if (!dryRun) {
      const emulatorProcess = spawn(
        emulatorPath,
        ['-avd', launchedAvdName],
        {
          cwd: rootDir,
          detached: true,
          shell: false,
          stdio: 'ignore',
        },
      );

      emulatorProcess.unref();

      for (let attempt = 0; attempt < 36; attempt += 1) {
        await sleep(2500);
        activeAndroidDevices = getAndroidDevices(adbPath);

        if (activeAndroidDevices.length > 0) {
          break;
        }
      }
    }
  }

  const effectiveAndroidSupported =
    exists('client/android') &&
    Boolean(adbPath) &&
    Boolean(javaHome) &&
    Boolean(androidSdk) &&
    activeAndroidDevices.length > 0;

  const metroPortInUse = await canConnect(8081);
  const serverPortInUse = await canConnect(8080);

  const effectiveLines = [
    'MY-MAKE SUPPORTED DEV TARGETS',
    `host os         : ${hostOs}`,
    `android target  : ${effectiveAndroidSupported ? 'auto-run' : 'skip'}`,
    `android devices : ${activeAndroidDevices.join(', ') || 'none'}`,
    `android avds    : ${androidAvds.join(', ') || 'none'}`,
    `windows target  : ${windowsSupported ? 'auto-run' : 'skip'}`,
    `windows project : ${exists('client/windows') ? 'present' : 'missing'}`,
    `dotnet          : ${dotnetPath ? 'found' : 'missing'}`,
    `msbuild         : ${msbuildPath ? 'found' : 'missing'}`,
    `yarn            : ${yarnPath || 'missing'}`,
  ];

  console.log(makeBox(effectiveLines));

  const commands = [];
  const launchCommands = [];

  if (metroPortInUse) {
    console.log(
      [
        '',
        'metro skip reason:',
        '- port 8081 is already in use, so `client start` will not be started.',
      ].join('\n'),
    );
  } else {
    commands.push({
      color: 'blue',
      command: 'npm --prefix client run start',
      name: 'metro',
    });
  }

  if (serverPortInUse) {
    console.log(
      [
        '',
        'server skip reason:',
        '- port 8080 is already in use, so `server:watch` will not be started.',
      ].join('\n'),
    );
  } else {
    commands.push({
      color: 'green',
      command: 'npm run server:watch',
      name: 'server',
    });
  }

  if (effectiveAndroidSupported) {
    launchCommands.push({
      color: 'magenta',
      command: 'npm --prefix client run android -- --no-packager',
      name: 'android',
    });
  }

  if (windowsSupported) {
    launchCommands.push({
      color: 'cyan',
      command: 'npm --prefix client run windows -- --no-packager',
      name: 'windows',
    });
  }

  if (!effectiveAndroidSupported) {
    console.log(
      [
        '',
        'android skip reason:',
        launchedAvdName
          ? `- launched AVD \`${launchedAvdName}\`, but it did not become ready in time.`
          : androidAvailableButOffline
            ? '- an AVD exists, but there is no online Android device yet. Launch the emulator first, then rerun `npm run dev`.'
          : '- requires client/android, adb, Java, Android SDK, and an online Android device.',
      ].join('\n'),
    );
  }

  if (!windowsSupported) {
    console.log(
      [
        '',
        'windows skip reason:',
        '- requires client/windows, react-native-windows, dotnet, and MSBuild on this Windows host.',
      ].join('\n'),
    );
  }

  if (dryRun) {
    console.log(
      [
        '',
        'dry run persistent commands:',
        ...commands.map(item => `- [${item.name}] ${item.command}`),
        '',
        'dry run launch commands:',
        ...launchCommands.map(item => `- [${item.name}] ${item.command}`),
      ].join('\n'),
    );
    process.exit(0);
  }

  for (const item of launchCommands) {
    const launcher =
      process.platform === 'win32'
        ? spawn(commandShell, ['/d', '/c', item.command], {
            cwd: rootDir,
            env,
            shell: false,
            stdio: 'inherit',
          })
        : spawn(item.command, [], {
            cwd: rootDir,
            env,
            shell: true,
            stdio: 'inherit',
          });

    launcher.on('error', error => {
      console.error(`[start-supported-dev] ${item.name} launcher failed: ${error.message}`);
    });
  }

  const concurrentlyBin = path.join(
    rootDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'concurrently.cmd' : 'concurrently',
  );

  const args = [
    '-n',
    commands.map(item => item.name).join(','),
    '-c',
    commands.map(item => item.color).join(','),
    ...commands.map(item => item.command),
  ];

  const child =
    process.platform === 'win32'
      ? spawn(commandShell, ['/d', '/c', concurrentlyBin, ...args], {
          cwd: rootDir,
          env,
          shell: false,
          stdio: 'inherit',
        })
      : spawn(concurrentlyBin, args, {
          cwd: rootDir,
          env,
          shell: false,
          stdio: 'inherit',
        });

  const expectedTargets = {
    metro: commands.some(item => item.name === 'metro'),
    server: commands.some(item => item.name === 'server'),
    android: launchCommands.some(item => item.name === 'android'),
    windows: launchCommands.some(item => item.name === 'windows'),
  };

  let readyBannerPrinted = false;

  async function maybePrintReadyBanner() {
    if (readyBannerPrinted) {
      return;
    }

    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (child.exitCode !== null) {
        return;
      }

      const metroReady = expectedTargets.metro
        ? await checkUrlReady('http://127.0.0.1:8081/status')
        : null;
      const serverReady = expectedTargets.server
        ? await checkUrlReady('http://127.0.0.1:8080/health')
        : null;
      const windowsReady = expectedTargets.windows ? isWindowsAppRunning() : null;
      const androidReady = expectedTargets.android
        ? getAndroidDevices(adbPath).length > 0
        : null;

      const ready =
        (metroReady !== false) &&
        (serverReady !== false) &&
        (windowsReady !== false) &&
        (androidReady !== false);

      if (ready) {
        readyBannerPrinted = true;
        console.log(
          [
            '',
            makeBox([
              'MY-MAKE DEV READY',
              makeReadyStatus('metro', metroReady === null ? 'skip' : 'ready'),
              makeReadyStatus('server', serverReady === null ? 'skip' : 'ready'),
              makeReadyStatus('windows', windowsReady === null ? 'skip' : 'ready'),
              makeReadyStatus('android', androidReady === null ? 'skip' : 'ready'),
            ]),
          ].join('\n'),
        );
        return;
      }

      await sleep(2000);
    }
  }

  maybePrintReadyBanner().catch(error => {
    console.error(`[start-supported-dev] readiness monitor failed: ${error.message}`);
  });

  child.on('error', error => {
    console.error(error);
    process.exit(1);
  });

  child.on('exit', code => {
    process.exit(code || 0);
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
