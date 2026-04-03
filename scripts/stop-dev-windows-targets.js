const {spawnSync} = require('child_process');

const rootDir = require('path').join(__dirname, '..');

function run(command, args) {
  return spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

// Electronプロセスを終了する
function stopElectron() {
  run('powershell', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    "Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue",
  ]);
}

// ポート3001を使用しているプロセスを終了する（webpack-dev-server）
function stopPort3001() {
  run('powershell', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    "Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }",
  ]);
}

stopElectron();
stopPort3001();

console.log('stopped windows dev target apps');
