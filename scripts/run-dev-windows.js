// Windows開発環境の起動スクリプト（Electron版）
const fs = require('fs');
const http = require('http');
const path = require('path');
const {spawn} = require('child_process');

const rootDir = path.join(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const logsDir = path.join(rootDir, 'logs', 'dev', 'windows');
const logFilePath = path.join(logsDir, 'dev-windows.log');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;
const commandShell =
  process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
let activeChild = null;
let cleanupStarted = false;

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
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
  writeLine(colorize(border, ANSI.magenta));
  writeLine(colorize(title, ANSI.bold, ANSI.magenta));
  writeLine(colorize(border, ANSI.magenta));
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

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function waitIndefinitely() {
  return new Promise(() => {
    setInterval(() => {}, 1 << 30);
  });
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

function runStep({name, command, args, cwd}) {
  return new Promise((resolve, reject) => {
    writeHeader(`DEV WINDOWS STEP: ${name}`);
    writeLine(colorize(`command: ${command} ${args.join(' ')}`, ANSI.dim));

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
              cwd: cwd || rootDir,
              env: childEnv,
              shell: commandShell,
              stdio: ['ignore', 'pipe', 'pipe'],
            },
          )
        : spawn(command, args, {
            cwd: cwd || rootDir,
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
      writeError(
        colorize(
          `[run-dev-windows] ステップ "${name}" の起動に失敗: ${error.message}`,
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
          `[run-dev-windows] ステップ "${name}" 終了コード: ${code ?? 0}`,
          (code ?? 0) === 0 ? ANSI.green : ANSI.yellow,
        ),
      );

      if ((code ?? 0) !== 0) {
        reject(new Error(`ステップ "${name}" が終了コード ${code} で失敗`));
        return;
      }

      resolve();
    });
  });
}

function startPersistentStep({name, command, args, cwd}) {
  return new Promise((resolve, reject) => {
    writeHeader(`DEV WINDOWS STEP: ${name}`);
    writeLine(colorize(`command: ${command} ${args.join(' ')}`, ANSI.dim));

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
              cwd: cwd || rootDir,
              env: childEnv,
              shell: commandShell,
              stdio: ['ignore', 'pipe', 'pipe'],
            },
          )
        : spawn(command, args, {
            cwd: cwd || rootDir,
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
      writeError(
        colorize(
          `[run-dev-windows] 常駐ステップ "${name}" の起動に失敗: ${error.message}`,
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
          `[run-dev-windows] 常駐ステップ "${name}" 終了コード: ${code ?? 0}`,
          (code ?? 0) === 0 ? ANSI.green : ANSI.yellow,
        ),
      );
      cleanupDevTargets();
      process.exit(code ?? 0);
    });
  });
}

function cleanupDevTargets() {
  if (cleanupStarted) {
    return;
  }

  cleanupStarted = true;
  const cleanupScript = path.join(rootDir, 'scripts', 'stop-dev-windows-targets.js');

  writeHeader('DEV WINDOWS STEP: cleanup dev targets');
  writeLine(colorize(`command: ${nodeCommand} ${cleanupScript}`, ANSI.dim));

  const result = spawn(
    [nodeCommand, cleanupScript]
      .map(quoteForShell)
      .join(' '),
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
    writeLine(colorize(`[run-dev-windows] ${signal} を受信`, ANSI.yellow, ANSI.bold));

    if (activeChild && !activeChild.killed) {
      activeChild.kill(signal);
    }

    cleanupDevTargets();
  });
}

async function main() {
  resetLogsDir();

  appendLog(
    [
      `dev windows session started: ${new Date().toISOString()}`,
      `cwd: ${rootDir}`,
      `log file: ${logFilePath}`,
      '',
    ].join('\n'),
  );

  writeLine(colorize(`[run-dev-windows] 前回のログを削除: ${logsDir}`, ANSI.blue));
  writeLine(colorize(`[run-dev-windows] ログ出力先: ${logFilePath}`, ANSI.blue));

  // 前回のElectronプロセスを停止
  await runStep({
    name: 'cleanup previous dev targets',
    command: nodeCommand,
    args: [path.join(rootDir, 'scripts', 'stop-dev-windows-targets.js')],
  });

  // ランタイム設定を同期
  await runStep({
    name: 'sync runtime config',
    command: npmCommand,
    args: ['run', 'sync:runtime-config:dev'],
  });

  // Electronの存在確認
  await runStep({
    name: 'windows platform check',
    command: nodeCommand,
    args: [path.join(rootDir, 'scripts', 'run-platform-target.js'), 'windows'],
  });

  // webpack-dev-serverを起動してブラウザで確認する（Electronは別途ビルド）
  await startPersistentStep({
    name: 'start webpack-dev-server',
    command: npmCommand,
    args: ['--prefix', 'client', 'run', 'electron:dev:renderer'],
  });

  writeLine(
    colorize(
      '[run-dev-windows] webpack-dev-server 起動完了: http://localhost:3001',
      ANSI.green,
      ANSI.bold,
    ),
  );

  await waitIndefinitely();
}

forwardSignal('SIGINT');
forwardSignal('SIGTERM');

main().catch(error => {
  cleanupDevTargets();
  writeError(`[run-dev-windows] ${error.message}`);
  process.exit(1);
});
