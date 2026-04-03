// レンダラーの起動を待ってからElectronメインプロセスを起動するヘルパー
const http = require('http');
const path = require('path');
const { execSync, spawn } = require('child_process');

const clientDir = path.join(__dirname, '..', 'client');
const rendererUrl = 'http://localhost:3001';
const pollInterval = 2000;
const maxAttempts = 60;

function checkReady() {
  return new Promise(resolve => {
    const req = http.get(rendererUrl, res => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log(`[wait-and-launch-electron] ${rendererUrl} の起動を待機中...`);

  for (let i = 0; i < maxAttempts; i++) {
    const ready = await checkReady();
    if (ready) {
      console.log('[wait-and-launch-electron] レンダラー起動確認');

      // メインプロセスをコンパイル
      console.log('[wait-and-launch-electron] Electronメインプロセスをコンパイル中...');
      execSync('npm run electron:compile-main', {
        cwd: clientDir,
        stdio: 'inherit',
      });

      // Electronを起動
      console.log('[wait-and-launch-electron] Electron起動中...');
      const electronBin = path.join(clientDir, 'node_modules', '.bin', 'electron');
      const mainJs = path.join(clientDir, 'dist-electron', 'electron', 'main.js');
      const env = { ...process.env };
      delete env.ELECTRON_RUN_AS_NODE;

      const child = spawn(electronBin, [mainJs], {
        cwd: clientDir,
        env,
        stdio: 'inherit',
        shell: true,
      });

      child.on('exit', code => {
        process.exit(code ?? 0);
      });

      return;
    }

    await new Promise(r => setTimeout(r, pollInterval));
  }

  console.error('[wait-and-launch-electron] タイムアウト: レンダラーが起動しませんでした');
  process.exit(1);
}

main();
