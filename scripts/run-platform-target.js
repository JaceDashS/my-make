const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

const target = process.argv[2];
const rootDir = path.join(__dirname, '..');
const clientPackagePath = path.join(rootDir, 'client', 'package.json');
const hostOs = os.platform();

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getDependencyVersion(pkg, name) {
  return pkg?.dependencies?.[name] || pkg?.devDependencies?.[name] || null;
}

function makeBox(lines) {
  const width = Math.max(...lines.map(line => line.length));
  const top = `+${'-'.repeat(width + 2)}+`;
  const body = lines.map(line => `| ${line.padEnd(width)} |`);
  return [top, ...body, top].join('\n');
}

function fail(lines) {
  console.error(makeBox(lines));
  process.exit(1);
}

function hasCommand(command) {
  const result = spawnSync('cmd.exe', ['/d', '/c', 'where', command], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean) || null;
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

  const result = spawnSync(
    vswhere,
    [
      '-latest',
      '-requires',
      'Microsoft.Component.MSBuild',
      '-find',
      'MSBuild\\**\\Bin\\MSBuild.exe',
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean) || null;
}

function findDotnet() {
  return (
    hasCommand('dotnet') ||
    (fs.existsSync('C:\\Program Files\\dotnet\\dotnet.exe')
      ? 'C:\\Program Files\\dotnet\\dotnet.exe'
      : null)
  );
}

const clientPackage = readJson(clientPackagePath);
const hasWindowsProject = fs.existsSync(path.join(rootDir, 'client', 'windows'));
const hasMacosProject = fs.existsSync(path.join(rootDir, 'client', 'macos'));
const hasIosProject = fs.existsSync(path.join(rootDir, 'client', 'ios'));
const windowsDependency = getDependencyVersion(clientPackage, 'react-native-windows');
const macosDependency = getDependencyVersion(clientPackage, 'react-native-macos');
const msbuildPath = findMsBuild();
const dotnetPath = findDotnet();

if (target === 'ios') {
  if (!hasIosProject) {
    fail([
      'MY-MAKE TARGET STATUS',
      'target         : ios',
      'result         : not configured',
      'action         : add or restore the iOS project first',
    ]);
  }

  if (hostOs !== 'darwin') {
    fail([
      'MY-MAKE TARGET STATUS',
      'target         : ios',
      `host os        : ${hostOs}`,
      'result         : blocked',
      'reason         : iPhone simulator requires macOS + Xcode',
      'action         : run this target on a macOS machine',
    ]);
  }
}

if (target === 'windows') {
  if (!hasWindowsProject || !windowsDependency) {
    fail([
      'MY-MAKE TARGET STATUS',
      'target         : windows',
      `windows project: ${hasWindowsProject ? 'present' : 'missing'}`,
      `rn-windows dep : ${windowsDependency || 'missing'}`,
      'result         : not configured',
      'action         : approve and add react-native-windows support first',
    ]);
  }

  if (hostOs !== 'win32') {
    fail([
      'MY-MAKE TARGET STATUS',
      'target         : windows',
      `host os        : ${hostOs}`,
      'result         : blocked',
      'reason         : Windows desktop target should be built on Windows',
    ]);
  }

  if (!dotnetPath || !msbuildPath) {
    fail([
      'MY-MAKE TARGET STATUS',
      'target         : windows',
      `dotnet         : ${dotnetPath ? 'found' : 'missing'}`,
      `msbuild        : ${msbuildPath ? 'found' : 'missing'}`,
      'result         : blocked',
      'reason         : Windows build toolchain is incomplete on this host',
      'action         : install .NET SDK and Visual Studio/MSBuild components',
    ]);
  }

}

if (target === 'macos') {
  if (!hasMacosProject || !macosDependency) {
    fail([
      'MY-MAKE TARGET STATUS',
      'target         : macos',
      `macos project  : ${hasMacosProject ? 'present' : 'missing'}`,
      `rn-macos dep   : ${macosDependency || 'missing'}`,
      'result         : not configured',
      'action         : approve and add react-native-macos support first',
    ]);
  }

  if (hostOs !== 'darwin') {
    fail([
      'MY-MAKE TARGET STATUS',
      'target         : macos',
      `host os        : ${hostOs}`,
      'result         : blocked',
      'reason         : macOS native target requires a macOS host',
    ]);
  }
}

console.log(
  makeBox([
    'MY-MAKE TARGET STATUS',
    `target         : ${target}`,
    `host os        : ${hostOs}`,
    'result         : ready to delegate to the platform-specific CLI',
  ]),
);
