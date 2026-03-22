const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

const rootDir = path.join(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const clientPackagePath = path.join(clientDir, 'package.json');
const platform = os.platform();

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function makeBox(lines) {
  const width = Math.max(...lines.map(line => line.length));
  const top = `+${'-'.repeat(width + 2)}+`;
  const body = lines.map(line => `| ${line.padEnd(width)} |`);
  return [top, ...body, top].join('\n');
}

function getDependencyVersion(pkg, name) {
  return (
    pkg?.dependencies?.[name] ||
    pkg?.devDependencies?.[name] ||
    null
  );
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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

const clientPackage = readJson(clientPackagePath);
const hasIosProject = exists('client/ios');
const hasWindowsProject = exists('client/windows');
const hasMacosProject = exists('client/macos');
const windowsDependency = getDependencyVersion(clientPackage, 'react-native-windows');
const macosDependency = getDependencyVersion(clientPackage, 'react-native-macos');
const windowsHostToolsReady =
  Boolean(hasCommand('dotnet')) &&
  Boolean(hasCommand('msbuild'));

const iosRunnable = hasIosProject && platform === 'darwin';
const windowsRunnable =
  hasWindowsProject &&
  Boolean(windowsDependency) &&
  platform === 'win32' &&
  windowsHostToolsReady;
const macosRunnable = hasMacosProject && Boolean(macosDependency) && platform === 'darwin';

const lines = [
  'MY-MAKE DEV TARGET CHECK',
  `host os        : ${platform}`,
  `ios project    : ${hasIosProject ? 'present' : 'missing'}`,
  `ios runnable   : ${
    iosRunnable ? 'yes' : hasIosProject ? 'requires macOS + Xcode' : 'no'
  }`,
  `windows project: ${hasWindowsProject ? 'present' : 'missing'}`,
  `rn-windows dep : ${windowsDependency || 'missing'}`,
  `windows run    : ${
    windowsRunnable
      ? 'yes'
      : hasWindowsProject || windowsDependency
        ? 'host or setup incomplete'
        : 'not configured'
  }`,
  `macos project  : ${hasMacosProject ? 'present' : 'missing'}`,
  `rn-macos dep   : ${macosDependency || 'missing'}`,
  `macos run      : ${
    macosRunnable
      ? 'yes'
      : hasMacosProject || macosDependency
        ? 'host or setup incomplete'
        : 'not configured'
  }`,
];

console.log(makeBox(lines));

if (!iosRunnable || !windowsRunnable || !macosRunnable) {
  console.log(
    [
      '',
      'dev note:',
      '- `npm run dev` starts Metro and the Go server.',
      '- It does not mean iPhone, Windows, and macOS client builds are all runnable on this machine.',
      '- Current repository state decides which client targets can actually run.',
    ].join('\n'),
  );
}
