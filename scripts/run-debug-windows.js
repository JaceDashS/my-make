const fs = require('fs');
const http = require('http');
const path = require('path');
const {spawn} = require('child_process');

const rootDir = path.join(__dirname, '..');
const logsDir = path.join(rootDir, 'logs', 'dev', 'windows-debug');
const logFilePath = path.join(logsDir, 'debug-windows.log');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;
const commandShell =
  process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';

let activeChildren = [];
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

    request.on('error', () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function spawnManaged(command, args, {persistent = false} = {}) {
  return new Promise((resolve, reject) => {
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

    activeChildren.push(child);

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
      reject(error);
    });

    child.on('spawn', () => {
      resolve(child);
    });

    child.on('exit', code => {
      activeChildren = activeChildren.filter(entry => entry !== child);
      writeLine(
        `[run-debug-windows] ${persistent ? 'persistent ' : ''}process exited with code ${code ?? 0}`,
      );

      if (persistent) {
        cleanupDevTargets();
        process.exit(code ?? 0);
      }
    });
  });
}

async function runStep(name, command, args) {
  writeHeader(`DEBUG WINDOWS STEP: ${name}`);
  writeLine(`command: ${command} ${args.join(' ')}`);

  const child = await spawnManaged(command, args);
  await new Promise((resolve, reject) => {
    child.on('exit', code => {
      if ((code ?? 0) !== 0) {
        reject(new Error(`step "${name}" failed with exit code ${code}`));
        return;
      }

      resolve();
    });
  });
}

async function startPersistentStep(name, command, args) {
  writeHeader(`DEBUG WINDOWS STEP: ${name}`);
  writeLine(`command: ${command} ${args.join(' ')}`);
  await spawnManaged(command, args, {persistent: true});
}

async function waitForMetro() {
  writeHeader('DEBUG WINDOWS STEP: wait for metro');
  writeLine('command: wait for http://127.0.0.1:8081/status');

  for (let attempt = 0; attempt < 60; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const ready = await checkUrlReady('http://127.0.0.1:8081/status');
    if (ready) {
      writeLine('[run-debug-windows] metro is ready');
      return;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(1000);
  }

  throw new Error(
    'Metro did not become ready on http://127.0.0.1:8081/status. Start it first or check port 8081.',
  );
}

function cleanupDevTargets() {
  if (cleanupStarted) {
    return;
  }

  cleanupStarted = true;
  const cleanupScript = path.join(rootDir, 'scripts', 'stop-dev-windows-targets.js');

  writeHeader('DEBUG WINDOWS STEP: cleanup windows targets');
  writeLine(`command: ${nodeCommand} ${cleanupScript}`);

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
    writeLine(`[run-debug-windows] received ${signal}`);
    for (const child of activeChildren) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
    cleanupDevTargets();
  });
}

async function main() {
  resetLogsDir();
  writeLine(`[run-debug-windows] writing combined output to ${logFilePath}`);

  forwardSignal('SIGINT');
  forwardSignal('SIGTERM');

  await runStep('cleanup previous windows targets', nodeCommand, [
    path.join(rootDir, 'scripts', 'stop-dev-windows-targets.js'),
  ]);

  await runStep('clear metro and relay ports', npmCommand, [
    'run',
    'port:8081:kill',
  ]);
  await runStep('clear relay port', npmCommand, ['run', 'port:8090:kill']);

  await runStep('sync runtime config', npmCommand, [
    'run',
    'sync:runtime-config:dev',
  ]);

  await runStep('windows platform check', nodeCommand, [
    path.join(rootDir, 'scripts', 'run-platform-target.js'),
    'windows',
  ]);

  await startPersistentStep('start metro', npmCommand, [
    '--prefix',
    'client',
    'run',
    'start',
  ]);

  await startPersistentStep('start metro relay', nodeCommand, [
    path.join(rootDir, 'scripts', 'metro-log-relay.js'),
  ]);

  await waitForMetro();

  writeHeader('DEBUG WINDOWS STEP: start windows client');
  writeLine(`command: ${npmCommand} --prefix client run windows -- --no-packager`);
  await spawnManaged(npmCommand, ['--prefix', 'client', 'run', 'windows', '--', '--no-packager']);
}

main().catch(error => {
  writeError(`[run-debug-windows] ${error.message}`);
  cleanupDevTargets();
  process.exit(1);
});
