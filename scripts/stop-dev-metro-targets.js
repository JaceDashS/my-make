const {spawnSync} = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function run(command, args) {
  return spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

run('powershell', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-Command',
  [
    '$ports = @(8081);',
    'foreach ($port in $ports) {',
    '  $processIds = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique;',
    '  foreach ($processId in $processIds) {',
    '    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue',
    '  }',
    '}',
  ].join(' '),
]);

console.log('stopped metro dev target apps');
