/**
 * Platform-safe Electron launcher.
 * Unsets ELECTRON_RUN_AS_NODE so Electron starts as a proper app (not a Node.js subprocess).
 * Usage: node scripts/run-electron.js <main-js-path>
 */
const { spawn } = require('child_process');
const path = require('path');

const clientDir = path.join(__dirname, '..');
const electronBin = path.join(clientDir, 'node_modules', '.bin', 'electron');
const mainJs = path.resolve(process.argv[2]);

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBin, [mainJs], {
  cwd: clientDir,
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', code => process.exit(code ?? 0));
