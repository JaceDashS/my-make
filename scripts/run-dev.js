const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

const rootDir = path.join(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;
const commandShell =
  process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';

const mode = process.argv.includes('--server')
  ? 'server'
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

function quoteForShell(value) {
  if (!value) {
    return '""';
  }

  if (/[^\w-./:\\]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

function spawnManaged(command, args, onSpawn) {
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
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        )
      : spawn(command, args, {
          cwd: rootDir,
          env: childEnv,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

  activeChild = child;

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

function runPersistentStep({name, command, args}) {
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
    });

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

async function runWindowsMode() {
  await runPersistentStep({
    name: 'delegate windows dev flow',
    command: nodeCommand,
    args: [path.join(rootDir, 'scripts', 'run-dev-windows.js')],
  });
}

async function runAndroidMode() {
  await runPersistentStep({
    name: 'start android dev flow',
    command: npmCommand,
    args: ['run', 'dev:android:legacy'],
  });
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
