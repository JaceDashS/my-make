const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

const rootDir = path.join(__dirname, '..');
const logsDir = path.join(rootDir, 'logs', 'dev', 'current');
const logFilePath = path.join(logsDir, 'dev.log');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;
const commandShell =
  process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';

let activeChild = null;
let cleanupStarted = false;

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
  writeLine(border);
  writeLine(title);
  writeLine(border);
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

function runStep({name, command, args}) {
  return new Promise((resolve, reject) => {
    writeHeader(`DEV STEP: ${name}`);
    writeLine(`command: ${command} ${args.join(' ')}`);

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
      writeError(`[run-dev] failed to start step "${name}": ${error.message}`);
      reject(error);
    });

    child.on('exit', code => {
      activeChild = null;
      writeLine(`[run-dev] step "${name}" exited with code ${code ?? 0}`);

      if ((code ?? 0) !== 0) {
        reject(new Error(`step "${name}" failed with exit code ${code}`));
        return;
      }

      resolve();
    });
  });
}

function cleanupDevTargets() {
  if (cleanupStarted) {
    return;
  }

  cleanupStarted = true;

  writeHeader('DEV STEP: cleanup dev targets');
  writeLine(`command: ${nodeCommand} ${path.join(rootDir, 'scripts', 'stop-dev-targets.js')}`);

  const result = spawn(
    [nodeCommand, path.join(rootDir, 'scripts', 'stop-dev-targets.js')]
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
    writeLine(`[run-dev] received ${signal}`);

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
      `dev session started: ${new Date().toISOString()}`,
      `cwd: ${rootDir}`,
      `log file: ${logFilePath}`,
      '',
    ].join('\n'),
  );

  writeLine(`[run-dev] cleared previous logs at ${logsDir}`);
  writeLine(`[run-dev] writing combined output to ${logFilePath}`);

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

forwardSignal('SIGINT');
forwardSignal('SIGTERM');

main().catch(error => {
  cleanupDevTargets();
  writeError(`[run-dev] ${error.message}`);
  process.exit(1);
});
