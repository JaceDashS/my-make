const fs = require('fs');
const http = require('http');
const path = require('path');
const {spawn, spawnSync} = require('child_process');

const rootDir = path.join(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;
const commandShell =
  process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';

const mode = process.argv.includes('--server')
  ? 'server'
  : process.argv.includes('--metro')
    ? 'metro'
  : process.argv.includes('--windows')
    ? 'windows'
    : process.argv.includes('--android')
      ? 'android'
      : 'all';

const logsDir = path.join(rootDir, 'logs', 'dev', mode === 'all' ? 'current' : mode);
const logFilePath = path.join(
  logsDir,
  mode === 'all' ? 'dev.log' : `dev-${mode}.log`,
);

let activeChild = null;
let cleanupStarted = false;

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
};

function colorize(text, ...styles) {
  if (!process.stdout.isTTY) {
    return text;
  }

  return `${styles.join('')}${text}${ANSI.reset}`;
}

function resetLogsDir() {
  fs.rmSync(logsDir, {recursive: true, force: true});
  fs.mkdirSync(logsDir, {recursive: true});
}

function appendLog(chunk) {
  fs.appendFileSync(logFilePath, chunk);
}

function writeLine(line = '') {
  const text = `${line}\n`;
  process.stdout.write(text);
  appendLog(text);
}

function writeError(line = '') {
  const text = `${line}\n`;
  process.stderr.write(text);
  appendLog(text);
}

function writeHeader(title) {
  const border = '='.repeat(title.length);
  writeLine('');
  writeLine(colorize(border, ANSI.cyan));
  writeLine(colorize(title, ANSI.bold, ANSI.cyan));
  writeLine(colorize(border, ANSI.cyan));
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function waitForShutdownSignal() {
  return new Promise(resolve => {
    let settled = false;

    const done = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    process.once('SIGINT', done);
    process.once('SIGTERM', done);
  });
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

function checkUrlReady(url) {
  return new Promise(resolve => {
    const request = http.get(url, response => {
      response.resume();
      resolve(
        Boolean(
          response.statusCode &&
            response.statusCode >= 200 &&
            response.statusCode < 300,
        ),
      );
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

function quoteForShell(value) {
  if (!value) {
    return '""';
  }

  if (/[^\w-./:\\]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

function spawnManaged(command, args, onSpawn, options = {}) {
  const {interactive = false} = options;
  const childEnv = {
    ...process.env,
    FORCE_COLOR: process.env.FORCE_COLOR || '1',
    CLICOLOR: process.env.CLICOLOR || '1',
    CLICOLOR_FORCE: process.env.CLICOLOR_FORCE || '1',
  };

  const child =
    process.platform === 'win32'
      ? spawn(
          [command, ...args].map(quoteForShell).join(' '),
          [],
          {
            cwd: rootDir,
            env: childEnv,
            shell: commandShell,
            stdio: interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
          },
        )
      : spawn(command, args, {
          cwd: rootDir,
          env: childEnv,
          shell: false,
          stdio: interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        });

  activeChild = child;

  if (!interactive) {
    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      process.stdout.write(text);
      appendLog(text);
    });

    child.stderr.on('data', chunk => {
      const text = chunk.toString();
      process.stderr.write(text);
      appendLog(text);
    });
  }

  child.on('error', error => {
    activeChild = null;
    onSpawn?.(error);
  });

  return child;
}

function runStep({name, command, args}) {
  return new Promise((resolve, reject) => {
    writeHeader(`DEV STEP: ${name}`);
    writeLine(colorize(`command: ${command} ${args.join(' ')}`, ANSI.dim));

    const child = spawnManaged(command, args, error => {
      writeError(
        colorize(
          `[run-dev] failed to start step "${name}": ${error.message}`,
          ANSI.red,
          ANSI.bold,
        ),
      );
      reject(error);
    });

    child.on('exit', code => {
      activeChild = null;
      writeLine(
        colorize(
          `[run-dev] step "${name}" exited with code ${code ?? 0}`,
          (code ?? 0) === 0 ? ANSI.green : ANSI.yellow,
        ),
      );

      if ((code ?? 0) !== 0) {
        reject(new Error(`step "${name}" failed with exit code ${code}`));
        return;
      }

      resolve();
    });
  });
}

function runPersistentStep({name, command, args, interactive = false}) {
  return new Promise((resolve, reject) => {
    writeHeader(`DEV STEP: ${name}`);
    writeLine(colorize(`command: ${command} ${args.join(' ')}`, ANSI.dim));

    const child = spawnManaged(command, args, error => {
      writeError(
        colorize(
          `[run-dev] failed to start persistent step "${name}": ${error.message}`,
          ANSI.red,
          ANSI.bold,
        ),
      );
      reject(error);
    }, {interactive});

    child.on('spawn', () => {
      resolve();
    });

    child.on('exit', code => {
      activeChild = null;
      writeLine(
        colorize(
          `[run-dev] persistent step "${name}" exited with code ${code ?? 0}`,
          (code ?? 0) === 0 ? ANSI.green : ANSI.yellow,
        ),
      );
      cleanupDevTargets();
      process.exit(code ?? 0);
    });
  });
}

function cleanupScriptForMode() {
  if (mode === 'metro') {
    return path.join(rootDir, 'scripts', 'stop-dev-metro-targets.js');
  }

  if (mode === 'android') {
    return path.join(rootDir, 'scripts', 'stop-dev-android-targets.js');
  }

  if (mode === 'windows') {
    return path.join(rootDir, 'scripts', 'stop-dev-windows-targets.js');
  }

  return path.join(rootDir, 'scripts', 'stop-dev-targets.js');
}

function cleanupDevTargets() {
  if (cleanupStarted) {
    return;
  }

  cleanupStarted = true;
  const cleanupScript = cleanupScriptForMode();

  writeHeader('DEV STEP: cleanup dev targets');
  writeLine(colorize(`command: ${nodeCommand} ${cleanupScript}`, ANSI.dim));

  const result = spawn(
    [nodeCommand, cleanupScript].map(quoteForShell).join(' '),
    [],
    {
      cwd: rootDir,
      env: process.env,
      shell: commandShell,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  result.stdout.on('data', chunk => {
    const text = chunk.toString();
    process.stdout.write(text);
    appendLog(text);
  });

  result.stderr.on('data', chunk => {
    const text = chunk.toString();
    process.stderr.write(text);
    appendLog(text);
  });
}

function forwardSignal(signal) {
  process.on(signal, () => {
    writeLine(colorize(`[run-dev] received ${signal}`, ANSI.yellow, ANSI.bold));

    if (activeChild && !activeChild.killed) {
      activeChild.kill(signal);
    }

    cleanupDevTargets();
  });
}

async function runAllMode() {
  await runStep({
    name: 'cleanup previous dev targets',
    command: nodeCommand,
    args: [path.join(rootDir, 'scripts', 'stop-dev-targets.js')],
  });

  await runStep({
    name: 'clear dev ports',
    command: npmCommand,
    args: ['run', 'ports:dev:kill'],
  });

  await runStep({
    name: 'sync runtime config',
    command: npmCommand,
    args: ['run', 'sync:runtime-config:dev'],
  });

  await runStep({
    name: 'dev platform check',
    command: nodeCommand,
    args: [path.join(rootDir, 'scripts', 'dev-platform-check.js')],
  });

  await runStep({
    name: 'start supported dev targets',
    command: nodeCommand,
    args: [path.join(rootDir, 'scripts', 'start-supported-dev.js')],
  });
}

async function runServerMode() {
  await runStep({
    name: 'clear server port',
    command: npmCommand,
    args: ['run', 'port:8080:kill'],
  });

  await runPersistentStep({
    name: 'start server watch',
    command: npmCommand,
    args: ['run', 'server:watch'],
  });
}

async function runMetroMode() {
  await runStep({
    name: 'clear metro port',
    command: npmCommand,
    args: ['run', 'port:8081:kill'],
  });

  await runStep({
    name: 'sync runtime config',
    command: npmCommand,
    args: ['run', 'sync:runtime-config:dev'],
  });

  await runPersistentStep({
    name: 'start metro',
    command: npmCommand,
    args: ['--prefix', 'client', 'run', 'start'],
    interactive: true,
  });
}

async function runWindowsMode() {
  await runPersistentStep({
    name: 'delegate windows dev flow',
    command: nodeCommand,
    args: [path.join(rootDir, 'scripts', 'run-dev-windows.js')],
  });
}

async function runAndroidMode() {
  await runStep({
    name: 'cleanup previous android target',
    command: nodeCommand,
    args: [path.join(rootDir, 'scripts', 'stop-dev-android-targets.js')],
  });

  await runStep({
    name: 'sync runtime config',
    command: npmCommand,
    args: ['run', 'sync:runtime-config:dev'],
  });

  writeHeader('DEV STEP: wait for metro');
  writeLine(colorize('command: wait for http://127.0.0.1:8081/status', ANSI.dim));

  let metroReady = false;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    metroReady = await checkUrlReady('http://127.0.0.1:8081/status');
    if (metroReady) {
      break;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(1000);
  }

  if (!metroReady) {
    throw new Error(
      'Metro did not become ready on http://127.0.0.1:8081/status. Start it first with `npm run dev:metro`.',
    );
  }

  writeLine(colorize('[run-dev] metro is ready', ANSI.green, ANSI.bold));

  writeHeader('DEV STEP: ensure android target');

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

  if (!androidSdk || !javaHome || !adbPath) {
    throw new Error(
      'Android tooling is not ready. `npm run dev:android` requires Android SDK, Java, and adb.',
    );
  }

  let androidDevices = getAndroidDevices(adbPath);

  writeLine(
    colorize(
      `android devices: ${androidDevices.join(', ') || 'none'}`,
      ANSI.dim,
    ),
  );

  if (androidDevices.length === 0) {
    const avds = emulatorPath ? getAvds(emulatorPath) : [];

    if (!emulatorPath || avds.length === 0) {
      throw new Error(
        'No online Android device is connected and no AVD was found to launch.',
      );
    }

    const launchedAvdName = avds[0];

    writeLine(
      colorize(
        `[run-dev] launching AVD "${launchedAvdName}" because no online Android device is connected`,
        ANSI.blue,
        ANSI.bold,
      ),
    );

    const emulatorProcess = spawn(emulatorPath, ['-avd', launchedAvdName], {
      cwd: rootDir,
      detached: true,
      shell: false,
      stdio: 'ignore',
    });

    emulatorProcess.unref();

    for (let attempt = 0; attempt < 36; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(2500);
      androidDevices = getAndroidDevices(adbPath);

      if (androidDevices.length > 0) {
        break;
      }
    }

    if (androidDevices.length === 0) {
      throw new Error(
        `Launched AVD "${launchedAvdName}", but it did not become ready in time.`,
      );
    }

    writeLine(
      colorize(
        `[run-dev] android target is ready: ${androidDevices.join(', ')}`,
        ANSI.green,
        ANSI.bold,
      ),
    );
  }

  await runStep({
    name: 'reverse metro port',
    command: adbPath,
    args: ['reverse', 'tcp:8081', 'tcp:8081'],
  });

  await runStep({
    name: 'start android client',
    command: npmCommand,
    args: ['--prefix', 'client', 'run', 'android', '--', '--no-packager'],
  });

  writeLine(
    colorize(
      '[run-dev] android client launched. Press Ctrl+C to stop the app and clean up dev targets.',
      ANSI.green,
      ANSI.bold,
    ),
  );

  await waitForShutdownSignal();
}

async function main() {
  resetLogsDir();

  appendLog(
    [
      `dev session started: ${new Date().toISOString()}`,
      `mode: ${mode}`,
      `cwd: ${rootDir}`,
      `log file: ${logFilePath}`,
      '',
    ].join('\n'),
  );

  writeLine(`[run-dev] cleared previous logs at ${logsDir}`);
  writeLine(`[run-dev] writing combined output to ${logFilePath}`);
  writeLine(`[run-dev] mode=${mode}`);

  if (mode === 'server') {
    await runServerMode();
    return;
  }

  if (mode === 'metro') {
    await runMetroMode();
    return;
  }

  if (mode === 'windows') {
    await runWindowsMode();
    return;
  }

  if (mode === 'android') {
    await runAndroidMode();
    return;
  }

  await runAllMode();
}

forwardSignal('SIGINT');
forwardSignal('SIGTERM');

main().catch(error => {
  cleanupDevTargets();
  writeError(`[run-dev] ${error.message}`);
  process.exit(1);
});
