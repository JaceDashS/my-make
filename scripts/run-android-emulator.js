const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const {spawn, spawnSync} = require('child_process');

const rootDir = path.join(__dirname, '..');

function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  ].filter(Boolean);

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function findEmulatorExecutable() {
  const direct = process.platform === 'win32' ? 'emulator.exe' : 'emulator';
  const sdk = findAndroidSdk();

  if (sdk) {
    const sdkExecutable = path.join(sdk, 'emulator', direct);
    if (fs.existsSync(sdkExecutable)) {
      return sdkExecutable;
    }
  }

  const whereCommand = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(whereCommand, [direct], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
  });

  if (result.status !== 0) {
    return null;
  }

  const resolved = (result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean);

  return resolved || null;
}

function listAvds(emulatorExecutable) {
  const result = spawnSync(emulatorExecutable, ['-list-avds'], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10000,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || 'Failed to list Android emulators').trim());
  }

  return (result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function askQuestion(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function chooseAvd(avds) {
  console.log('');
  console.log('Available Android emulators:');
  avds.forEach((avd, index) => {
    console.log(`${index + 1}. ${avd}`);
  });
  console.log('');

  while (true) {
    const answer = await askQuestion('Select an emulator number: ');
    const selection = Number.parseInt(answer, 10);

    if (Number.isInteger(selection) && selection >= 1 && selection <= avds.length) {
      return avds[selection - 1];
    }

    console.log(`Please enter a number between 1 and ${avds.length}.`);
  }
}

async function main() {
  const emulatorExecutable = findEmulatorExecutable();

  if (!emulatorExecutable) {
    throw new Error('Android emulator executable was not found. Check ANDROID_HOME or Android SDK installation.');
  }

  const avds = listAvds(emulatorExecutable);

  if (!avds.length) {
    throw new Error('No Android AVDs were found.');
  }

  const selectedAvd = await chooseAvd(avds);

  console.log('');
  console.log(`Launching emulator: ${selectedAvd}`);

  const child = spawn(emulatorExecutable, ['-avd', selectedAvd], {
    cwd: rootDir,
    detached: true,
    shell: false,
    stdio: 'ignore',
  });

  child.unref();

  console.log('Emulator launch requested.');
}

main().catch(error => {
  console.error(`[android:emulator] ${error.message}`);
  process.exit(1);
});
